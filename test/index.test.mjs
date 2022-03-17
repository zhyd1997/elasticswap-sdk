/* eslint import/extensions: 0 */
import chai from 'chai';
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import * as elasticSwapSDK from '../src/index.mjs';
import LocalStorageAdapterMock from './adapters/LocalStorageAdapterMock.mjs';

const { assert } = chai;
const RPC_URL = 'https://mainnet.infura.io/v3/48f877fa4aa4490bb0c988368dc8e373';

const storageAdapter = new LocalStorageAdapterMock();

describe('SDK', () => {
  const env = {
    networkId: 1,
    exchangeFactoryAddress: '0x8C2251e028043e38f58Ac64c00E1F940D305Aa62',
  };

  describe('Constructor', () => {
    it('Can be created via constructor', async () => {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const sdk = new elasticSwapSDK.SDK({ env, customFetch: fetch, provider, storageAdapter });
      assert.isNotNull(sdk);
    });

    it('Sets the block number', async () => {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const sdk = new elasticSwapSDK.SDK({ env, customFetch: fetch, provider, storageAdapter });
      await sdk.awaitInitialized();
      await provider.getBlockNumber();

      assert.isNumber(sdk.blockNumber);
      assert.isFalse(sdk.blockNumber === 0);
    });

    it('Creates the ExchangeFactory', async () => {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const sdk = new elasticSwapSDK.SDK({ env, customFetch: fetch, provider, storageAdapter });
      assert.isNotNull(sdk.exchangeFactory);
    });
  });

  describe('setName', () => {
    it.only('sets name correctly with address that has no ENS name', async () => {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const signer = new ethers.VoidSigner("0xC9e4c8a2F2D8D684fB9de60aBFE3Fb5Ea7565366", provider);
      let sdk = new elasticSwapSDK.SDK({env, customFetch: fetch, provider, signer, storageAdapter });
      await sdk.awaitInitialized();
      assert.equal('0xC9e4...5366', sdk.accountName);

      sdk = new elasticSwapSDK.SDK({ account: '0xE16584424F34380DBf798f547Af684597788FbC7', env, customFetch: fetch, provider, storageAdapter });
      assert.equal('0xean.eth', sdk.accountName);
    });

    it('sets name correctly with address that has an ENS name', async () => {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const sdk = new elasticSwapSDK.SDK({ account: '0xE16584424F34380DBf798f547Af684597788FbC7', env, customFetch: fetch, provider, storageAdapter });
      await sdk.awaitInitialized();
      assert.equal('0xean.eth', sdk.accountName);
    });
  });

  describe('isValidETHAddress', () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const sdk = new elasticSwapSDK.SDK({ env, customFetch: fetch, provider, storageAdapter });

    it('returns true for a valid address', async () => {
      const isValid = await sdk.isValidETHAddress('0xC9e4c8a2F2D8D684fB9de60aBFE3Fb5Ea7565366');
      assert.isTrue(isValid);
    });

    it('returns false for a invalid address', async () => {
      const isValid = await sdk.isValidETHAddress('0x2D8D684fB9de60aBFE3Fb5Ea7565366');
      assert.isFalse(isValid);
    });

    it('returns true for a valid ens address', async () => {
      const isValid = await sdk.isValidETHAddress('0xean.eth');
      assert.isTrue(isValid);
    });

    it('returns false for a invalid ens address', async () => {
      let isValid = await sdk.isValidETHAddress('0x.eth');
      assert.isFalse(isValid);

      isValid = await sdk.isValidETHAddress('0xean.th');
      assert.isFalse(isValid);
    });
  });
});
