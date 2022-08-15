/* eslint import/extensions: 0 */
/* eslint max-len: 0 */

// import BigNumber from 'bignumber.js';
// import chai from 'chai';
import hardhat from 'hardhat';
import { buildCoreObjects } from '../testHelpers.mjs';
// ^ expectThrowsAsync

const { ethers, deployments } = hardhat;
// const { expect, assert } = chai;

const alchemyProvider = new ethers.providers.AlchemyProvider(
  'homestead',
  'API_KEY',
);

describe('Swap test', () => {
  it.only('checks if there is an error with the sdk', async () => {
    const coreObjects = await buildCoreObjects(deployments, ethers.provider);
    const { baseToken, quoteToken, elasticSwapSDK, sdk } = coreObjects;

    const accounts = await ethers.getSigners();

    // set the signer to the moneybags account - this will seed the exchange
    await sdk.changeSigner(accounts[0]);

    // deploy a new exchange
    // in this local exchange, I need to set its balances as what it was at block: 15304424
    await sdk.exchangeFactory.createNewExchange(baseToken.address, quoteToken.address);
    const exchange = await sdk.exchangeFactory.exchange(baseToken.address, quoteToken.address);

    const exchangeInstance = new elasticSwapSDK.Exchange(
      sdk,
      exchange.address,
      baseToken.address,
      quoteToken.address,
    );
    console.log(await exchangeInstance.internalBalances());

    // to get the required internalbalances
    // need to use the provider to call the specific exchange at a specific block

    // await sdk.changeProvider(alchemyProvider);
    // console.log(sdk.networkName);

    // const mainnetExchangeContract = new ethers.Contract(
    //   '0x79274BF95e05f0e858ab78411f3eBe85909E4F76',
    //   exchangeInstance.abi,
    //   alchemyProvider,
    // );
    /// console.log(await mainnetExchangeContract.internalBalances({ blockTag: '0x73656f32' }));
    
    // using alchemy composer and docs
    const data = await alchemyProvider.call(
      {
        to: '0x79274bf95e05f0e858ab78411f3ebe85909e4f76',
        data: '0x4d67a0a3',
      },
      '0x73656f32',
    );
    console.log(data);
  });
});
