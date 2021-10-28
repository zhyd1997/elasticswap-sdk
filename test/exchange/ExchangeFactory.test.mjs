/* eslint import/extensions: 0 */
import chai from 'chai';
import fetch from 'node-fetch';
import elasticSwapSDK from '../../dist/index.js';
import hardhat from 'hardhat';

const { ethers, deployments } = hardhat;
const { assert } = chai;

describe('ExchangeFactory', () => {
  it('Does something', async () => {
    const accounts = await ethers.getSigners();
    await deployments.fixture();
    const ExchangeFactory = await deployments.get("ExchangeFactory");
    const exchangeFactory = new ethers.Contract(
      ExchangeFactory.address,
      ExchangeFactory.abi,
      accounts[0]
    );
  });
});