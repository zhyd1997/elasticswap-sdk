/* eslint import/extensions: 0 */
/* eslint max-len: 0 */

import { expect } from 'chai';
import hardhat from 'hardhat';
import { buildCoreObjects } from '../testHelpers.mjs';

const { ethers, deployments } = hardhat;

const alchemyProvider = new ethers.providers.AlchemyProvider(
  'homestead',
  '-GwTHTJar_yTzhNX_Kns-fSBfAN5N3h8',
);

describe('Swap test', () => {
  it('checks if there is an error with the sdk', async () => {
    const coreObjects = await buildCoreObjects(deployments, ethers.provider);
    const { baseToken, quoteToken, elasticSwapSDK, sdk, toBigNumber } = coreObjects;

    const accounts = await ethers.getSigners();

    await sdk.changeSigner(accounts[0]);

    const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
    const liquidityProvider = accounts[1];
    const liquidityProviderInitialBalances = 1000000;

    // deploy a new exchange
    // in this local exchange, need to set its balances as what it was at block: 15304423
    // 15304423 is one block before the block in which tx https://etherscan.io/tx/0xfe104eb24f1a006217f3346a6d3f33b940ec1c82e54a6df7a754c1ea31f1ce05 failed
    await sdk.exchangeFactory.createNewExchange(baseToken.address, quoteToken.address);
    const exchange = await sdk.exchangeFactory.exchange(baseToken.address, quoteToken.address);

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

    // to get the required internalbalances at 15304423
    const mainnetExchangeContract = new ethers.Contract(
      '0x79274BF95e05f0e858ab78411f3eBe85909E4F76',
      exchangeInstance.abi,
      alchemyProvider,
    );
    const internalBalances = await mainnetExchangeContract.internalBalances({
      blockTag: '0xE986E7',
    });

    // send users (liquidity provider) base and quote tokens for easy accounting.
    await baseToken.transfer(liquidityProvider.address, liquidityProviderInitialBalances);
    await quoteToken.transfer(liquidityProvider.address, liquidityProviderInitialBalances);

    const baseTokenQtyToAdd = toBigNumber(internalBalances.baseTokenReserveQty, 18);
    const quoteTokenQtyToAdd = toBigNumber(internalBalances.quoteTokenReserveQty, 6);

    // exchange has the same amount of liquidity as the mainnet pool at 15304423
    await exchangeInstance.addLiquidity(
      baseTokenQtyToAdd,
      quoteTokenQtyToAdd,
      1,
      1,
      liquidityProvider.address,
      expiration,
    );

    // these numbers are based on user input in https://etherscan.io/tx/0xfe104eb24f1a006217f3346a6d3f33b940ec1c82e54a6df7a754c1ea31f1ce05
    const quoteTokenQtyToSwap = toBigNumber('1000');
    const minBaseTokenQtyToSwap = toBigNumber('188.414252404592205063');

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
