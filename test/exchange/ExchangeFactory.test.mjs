/* eslint import/extensions: 0 */
import chai from 'chai';
import fetch from 'node-fetch';
import hardhat from 'hardhat';
import * as elasticSwapSDK from '../../src/index.mjs';
import LocalStorageAdapterMock from '../adapters/LocalStorageAdapterMock.mjs';

const { ethers, deployments } = hardhat;
const { assert } = chai;

const storageAdapter = new LocalStorageAdapterMock();

describe('ExchangeFactory', () => {
  let sdk;

  before(async () => {
    const env = {
      networkId: 99999,
      exchangeFactoryAddress: '0x8C2251e028043e38f58Ac64c00E1F940D305Aa62',
    };
    sdk = new elasticSwapSDK.SDK({
      env,
      customFetch: fetch,
      provider: hardhat.ethers.provider,
      storageAdapter,
    });
  });

  describe('Constructor', () => {
    it('can be created via constructor', async () => {
      await deployments.fixture();
      const ExchangeFactory = await deployments.get('ExchangeFactory');
      const exchangeFactory = new elasticSwapSDK.ExchangeFactory(
        sdk,
        ExchangeFactory.address,
      );
      assert.isNotNull(exchangeFactory);
      assert.equal(ExchangeFactory.address, exchangeFactory.address);
    });
  });

  describe('getFeeAddress', () => {
    it('returns expected fee address', async () => {
      const accounts = await ethers.getSigners();

      await deployments.fixture();
      const ExchangeFactory = await deployments.get('ExchangeFactory');
      const exchangeFactory = new elasticSwapSDK.ExchangeFactory(
        sdk,
        ExchangeFactory.address,
      );

      const exchangeFactoryContract = new ethers.Contract(
        ExchangeFactory.address,
        ExchangeFactory.abi,
        accounts[0],
      );
      assert.equal(
        await exchangeFactoryContract.feeAddress(),
        await exchangeFactory.getFeeAddress(),
      );
    });
  });
});
