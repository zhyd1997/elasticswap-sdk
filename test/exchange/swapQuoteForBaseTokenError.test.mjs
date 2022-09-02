/* eslint import/extensions: 0 */
/* eslint max-len: 0 */

import { expect } from 'chai';
import hardhat from 'hardhat';
import { buildCoreObjects } from '../testHelpers.mjs';

const { ethers, deployments } = hardhat;

describe('Swap test', () => {
  let coreObjects;
  let accounts;
  let exchange;
  let snapshotId;

  before(async () => {
    coreObjects = await buildCoreObjects(deployments, ethers.provider);
    accounts = await ethers.getSigners();
  });

  beforeEach(async () => {
    const { baseToken, quoteToken, sdk } = coreObjects;

    // save the state of the blockchain before the test
    snapshotId = await sdk.provider.send('evm_snapshot');

    // set the signer to the moneybags account
    await sdk.changeSigner(accounts[0]);

    // deploy a new exchange
    await sdk.exchangeFactory.createNewExchange(baseToken.address, quoteToken.address);
    exchange = await sdk.exchangeFactory.exchange(baseToken.address, quoteToken.address);
  });

  afterEach(async () => {
    const { sdk } = coreObjects;
    // rollback to the state before the test to prevent pollution
    await sdk.provider.send('evm_revert', [snapshotId]);
  });

  it('checks if there is an error with the sdk', async () => {
    const { baseToken, quoteToken, elasticSwapSDK, sdk, toBigNumber } = coreObjects;

    const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
    const liquidityProvider = accounts[1];
    const liquidityProviderInitialBalances = 1000000;

    const exchangeInstance = new elasticSwapSDK.Exchange(
      sdk,
      exchange.address,
      baseToken.address,
      quoteToken.address,
    );

    // add approvals
    await exchangeInstance.quoteToken.approve(
      exchangeInstance.address,
      liquidityProviderInitialBalances,
    );

    await exchangeInstance.baseToken.approve(
      exchangeInstance.address,
      liquidityProviderInitialBalances,
    );

    // send users (liquidity provider) base and quote tokens for easy accounting.
    await baseToken.transfer(liquidityProvider.address, liquidityProviderInitialBalances);
    await quoteToken.transfer(liquidityProvider.address, liquidityProviderInitialBalances);

    // retrived based on tx https://etherscan.io/tx/0xfe104eb24f1a006217f3346a6d3f33b940ec1c82e54a6df7a754c1ea31f1ce05
    const baseTokenQtyToAdd = toBigNumber('15246029054780205919247', 18);
    const quoteTokenQtyToAdd = toBigNumber('80096085623', 6);
    const quoteTokenQtyToSwap = toBigNumber('1000');
    const minBaseTokenQtyToSwap = toBigNumber('188.414252404592205063');

    // exchange has the same amount of liquidity as the mainnet pool at 15304423
    await exchangeInstance.addLiquidity(
      baseTokenQtyToAdd,
      quoteTokenQtyToAdd,
      1,
      1,
      liquidityProvider.address,
      expiration,
    );

    // now call swapQuoteTokenForBaseToken on the local exchange with the values passed into the failed tx
    try {
      await exchangeInstance.swapQuoteTokenForBaseToken(
        quoteTokenQtyToSwap,
        minBaseTokenQtyToSwap,
        expiration,
      );
    } catch (err) {
      expect(err.message).to.equal(
        "VM Exception while processing transaction: reverted with reason string 'MathLib: INSUFFICIENT_BASE_TOKEN_QTY'",
      );
    }
  });
});
