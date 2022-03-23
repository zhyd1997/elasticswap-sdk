/* eslint import/extensions: 0 */
import chai from 'chai';
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import * as elasticSwapSDK from '../src/index.mjs';
import LocalStorageAdapterMock from './adapters/LocalStorageAdapterMock.mjs';
import 'dotenv/config'
import * as protocolDeployments from '@elasticswap/elasticswap/artifacts/deployments.json' assert { type: 'json'};

const { assert } = chai;
const RPC_URL = process.env.RPC_URL;

const storageAdapter = new LocalStorageAdapterMock();

describe('SDK', () => {
  const env = {
    networkId: 1,
    contracts: protocolDeployments,
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
      const signer = new ethers.VoidSigner("0x79f52199acc20d7c661094297347b7cf812d3424", provider);
      const sdk = new elasticSwapSDK.SDK({env, customFetch: fetch, provider, signer, storageAdapter });
      await sdk.awaitInitialized();
      assert.isNotNull(sdk.exchangeFactory);
    });
  });

  describe('setName', () => {
    it('sets name correctly with address that has no ENS name', async () => {
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const signer = new ethers.VoidSigner("0x79f52199acc20d7c661094297347b7cf812d3424", provider);
      const sdk = new elasticSwapSDK.SDK({env, customFetch: fetch, provider, signer, storageAdapter });
      await sdk.awaitInitialized();
      assert.equal('0x79f5...3424', sdk.accountName);
    });

    // it.only('sets name correctly with address that has an ENS name', async () => {
    //   const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    //   const sdk = new elasticSwapSDK.SDK({ account: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', env, customFetch: fetch, provider, storageAdapter });
    //   await sdk.awaitInitialized();
    //   assert.equal('vitalik.eth', sdk.accountName);
    // });
  });

  describe('isValidETHAddress', () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const sdk = new elasticSwapSDK.SDK({ env, customFetch: fetch, provider, storageAdapter });

    it('returns true for a valid address', async () => {
      const isValid = await sdk.isValidETHAddress('0x79f52199acc20d7c661094297347b7cf812d3424');
      assert.isTrue(isValid);
    });

    it('returns false for a invalid address', async () => {
      const isValid = await sdk.isValidETHAddress('0x2D8D684fB9de60aBFE3Fb5Ea7565366');
      assert.isFalse(isValid);
    });

    it('returns true for a valid ens address', async () => {
      const isValid = await sdk.isValidETHAddress('vitalik.eth');
      assert.isTrue(isValid);
    });

    it('returns false for a invalid ens address', async () => {
      let isValid = await sdk.isValidETHAddress('0x.eth');
      assert.isFalse(isValid);

      isValid = await sdk.isValidETHAddress('vit.th');
      assert.isFalse(isValid);
    });
  });
});
