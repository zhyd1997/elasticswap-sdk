/* eslint import/extensions: 0 */
import chai from 'chai';
import fetch from 'node-fetch';
import hardhat from 'hardhat';
import elasticSwapSDK from '../../dist/index.js';
import chaiAsPromised from 'chai-as-promised';

const { ethers, deployments } = hardhat;
const { expect, assert } = chai;

chai.use(chaiAsPromised);

let sdk;
let exchange;
let quoteToken;
let baseToken;
let accounts;
let liquidityFee;
let liquidityFeeInBasisPoints;
let exchangeClass;

const expectThrowsAsync = async (method, errorMessage) => {
  let error;
  try {
    await method();
  } catch (err) {
    error = err;
  }
  expect(error).to.be.an('Error');
  expect(error.message).to.equal(errorMessage);
};

describe('Exchange', () => {
  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const env = {
      networkId: 99999,
      exchangeFactoryAddress: '0x8C2251e028043e38f58Ac64c00E1F940D305Aa62',
    };

    sdk = new elasticSwapSDK.SDK({
      env,
      customFetch: fetch,
      provider: hardhat.ethers.provider,
      account: accounts[0],
      signer: accounts[0],
    });

    await deployments.fixture();

    const BaseToken = await deployments.get('BaseToken');
    baseToken = new ethers.Contract(
      BaseToken.address,
      BaseToken.abi,
      accounts[0],
    );

    const QuoteToken = await deployments.get('QuoteToken');
    quoteToken = new ethers.Contract(
      QuoteToken.address,
      QuoteToken.abi,
      accounts[0],
    );

    const Exchange = await deployments.get('Exchange');
    exchange = new ethers.Contract(
      Exchange.address,
      Exchange.abi,
      accounts[0],
    );

    exchangeClass = new elasticSwapSDK.Exchange(
      sdk,
      exchange.address,
      baseToken.address,
      quoteToken.address,
    );

    liquidityFeeInBasisPoints = await exchangeClass.liquidityFee;
    liquidityFee = liquidityFeeInBasisPoints / 10000;
  });

  describe('constructor', () => {
    it('Can be created via constructor', async () => {
      assert.isNotNull(exchangeClass);
      assert.equal(exchange.address, exchangeClass.address);
    });
  });

  describe('swapQuoteTokenForBaseToken', () => {
    it('Should price trades correctly', async () => {
      // create expiration 50 minutes from now.
      const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
      const liquidityProvider = accounts[1];
      const trader = accounts[2];
      const liquidityProviderInitialBalances = 1000000;
      const amountToAdd = 1000000;
      const baseTokenQtyToAdd = 10000;
      const quoteTokenQtyToAdd = 50000;

      await sdk.changeSigner(liquidityProvider);
      exchangeClass = new elasticSwapSDK.Exchange(
        sdk,
        exchange.address,
        baseToken.address,
        quoteToken.address,
      );

      // send users (liquidity provider) base and quote tokens for easy accounting.

      await baseToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      await quoteToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      // add approvals

      await exchangeClass.quoteToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass.baseToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass
        .addLiquidity(
          baseTokenQtyToAdd,
          quoteTokenQtyToAdd,
          1,
          1,
          liquidityProvider.address,
          expiration,
        );

      await sdk.changeSigner(trader);
      exchangeClass = new elasticSwapSDK.Exchange(
        sdk,
        exchange.address,
        baseToken.address,
        quoteToken.address,
      );

      // send trader quote tokens
      await quoteToken.transfer(trader.address, amountToAdd);
      // add approvals for exchange to trade their quote tokens
      await exchangeClass.quoteToken.approve(exchangeClass.address, amountToAdd);
      // confirm no balance before trade.
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(0);
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(amountToAdd);

      // trader executes the first trade, our pricing should be ~1:1 currently minus fees
      const swapAmount = 100000;
      const expectedFee = swapAmount * liquidityFee;

      const quoteTokenReserveBalance = await quoteToken.balanceOf(
        exchangeClass.address,
      );
      const pricingConstantK =
        (await exchangeClass.baseToken.balanceOf(exchangeClass.address)) *
        (await exchangeClass.quoteToken.balanceOf(exchangeClass.address));
      const baseTokenQtyReserveBeforeTrade =
        pricingConstantK / quoteTokenReserveBalance.toNumber();
      const baseTokenQtyReserveAfterTrade =
        pricingConstantK /
        (quoteTokenReserveBalance.toNumber() + swapAmount - expectedFee);
      const baseTokenQtyExpected =
        baseTokenQtyReserveBeforeTrade - baseTokenQtyReserveAfterTrade;

      await exchangeClass
        .swapQuoteTokenForBaseToken(swapAmount, 1, expiration);
      // confirm trade occurred at expected
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        Math.trunc(baseTokenQtyExpected),
      );
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd - swapAmount,
      );
    });
  });

  describe('swapQuoteTokenForBaseToken', () => {
    it('Should timestamp be expired', async () => {
      // create expiration 50 minutes from now.
      const expirationValid = Math.round(new Date().getTime() / 1000 + 60 * 50);
      // create expiration 50 minutes before now.
      const expirationInvalid = Math.round(new Date().getTime() / 1000 - 60 * 50);
      const liquidityProvider = accounts[1];
      const trader = accounts[2];
      const liquidityProviderInitialBalances = 1000000;
      const amountToAdd = 1000000;
      const baseTokenQtyToAdd = 10000;
      const quoteTokenQtyToAdd = 50000;

      await sdk.changeSigner(liquidityProvider);
      exchangeClass = new elasticSwapSDK.Exchange(
        sdk,
        exchange.address,
        baseToken.address,
        quoteToken.address,
      );

      // send users (liquidity provider) base and quote tokens for easy accounting.

      await baseToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      await quoteToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      // add approvals

      await exchangeClass.quoteToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass.baseToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass
        .addLiquidity(
          baseTokenQtyToAdd,
          quoteTokenQtyToAdd,
          1,
          1,
          liquidityProvider.address,
          expirationValid,
        );

      await sdk.changeSigner(trader);
      exchangeClass = new elasticSwapSDK.Exchange(
        sdk,
        exchange.address,
        baseToken.address,
        quoteToken.address,
      );

      // send trader quote tokens
      await quoteToken.transfer(trader.address, amountToAdd);
      // add approvals for exchange to trade their quote tokens
      await exchangeClass.quoteToken.approve(exchangeClass.address, amountToAdd);
      // confirm no balance before trade.
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(0);
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(amountToAdd);

      // swap tokens
      const swapAmount = 100000;
      const testMethod = exchangeClass.swapQuoteTokenForBaseToken
        .bind(exchangeClass, swapAmount, 1, expirationInvalid);

      await expectThrowsAsync(testMethod, 'Origin: exchange, Code: 14, Message: TIMESTAMP_EXPIRED, Path: unknow.');
    });
  });

  describe('swapBaseTokenForQuoteToken', () => {
    it('Should price trades correctly', async () => {
      // create expiration 50 minutes from now.
      const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
      const liquidityProvider = accounts[1];
      const trader = accounts[2];
      const liquidityProviderInitialBalances = 1000000;
      const amountToAdd = 1000000;
      const baseTokenQtyToAdd = 10000;
      const quoteTokenQtyToAdd = 50000;

      await sdk.changeSigner(liquidityProvider);
      exchangeClass = new elasticSwapSDK.Exchange(
        sdk,
        exchange.address,
        baseToken.address,
        quoteToken.address,
      );

      // send users (liquidity provider) base and quote tokens for easy accounting.

      await baseToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      await quoteToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      // add approvals

      await exchangeClass.quoteToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass.baseToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass
        .addLiquidity(
          baseTokenQtyToAdd,
          quoteTokenQtyToAdd,
          1,
          1,
          liquidityProvider.address,
          expiration,
        );

      await sdk.changeSigner(trader);
      exchangeClass = new elasticSwapSDK.Exchange(
        sdk,
        exchange.address,
        baseToken.address,
        quoteToken.address,
      );

      // send trader quote tokens
      await baseToken.transfer(trader.address, amountToAdd);
      // add approvals for exchange to trade their quote tokens
      await exchangeClass.baseToken.approve(exchangeClass.address, amountToAdd);
      // confirm no balance before trade.
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(0);
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(amountToAdd);

      // trader executes the first trade, our pricing should be ~1:1 currently minus fees
      const swapAmount = 100000;
      const expectedFee = swapAmount * liquidityFee;

      const baseTokenReserveBalance = await baseToken.balanceOf(
        exchangeClass.address,
      );
      const pricingConstantK =
        (await exchangeClass.baseToken.balanceOf(exchangeClass.address)) *
        (await exchangeClass.quoteToken.balanceOf(exchangeClass.address));
      const quoteTokenQtyReserveBeforeTrade =
        pricingConstantK / baseTokenReserveBalance.toNumber();
      const quoteTokenQtyReserveAfterTrade =
        pricingConstantK /
        (baseTokenReserveBalance.toNumber() + swapAmount - expectedFee);
      const quoteTokenQtyExpected =
      quoteTokenQtyReserveBeforeTrade - quoteTokenQtyReserveAfterTrade;

      await exchangeClass
        .swapBaseTokenForQuoteToken(swapAmount, 1, expiration);
      // confirm trade occurred at expected
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        Math.trunc(quoteTokenQtyExpected),
      );
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd - swapAmount,
      );
    });
  });

  describe('addLiquidity', () => {
    it('Should allow for ADD quote and base token liquidity', async () => {
      // create expiration 50 minutes from now.
      const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
      const liquidityProvider = accounts[1];
      const liquidityProviderInitialBalances = 1000000;
      const baseTokenQtyToAdd = 10000;
      const quoteTokenQtyToAdd = 50000;

      await sdk.changeSigner(liquidityProvider);
      exchangeClass = new elasticSwapSDK.Exchange(
        sdk,
        exchange.address,
        baseToken.address,
        quoteToken.address,
      );

      // send users (liquidity provider) base and quote tokens for easy accounting.

      await baseToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      await quoteToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      // add approvals

      await exchangeClass.quoteToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass.baseToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass
        .addLiquidity(
          baseTokenQtyToAdd,
          quoteTokenQtyToAdd,
          1,
          1,
          liquidityProvider.address,
          expiration,
        );

      // confirm the exchange now has the expected balance
      expect((await baseToken.balanceOf(exchangeClass.address)).toNumber()).to.equal(
        baseTokenQtyToAdd,
      );

      expect((await quoteToken.balanceOf(exchangeClass.address)).toNumber()).to.equal(
        quoteTokenQtyToAdd,
      );
    });
  });

  describe('removeLiquidity', () => {
    it('Should allow for REMOVE quote and base token liquidity', async () => {
      // create expiration 50 minutes from now.
      const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
      const liquidityProvider = accounts[1];
      const liquidityProviderInitialBalances = 1000000;
      const baseTokenQtyToAdd = 10000;
      const quoteTokenQtyToAdd = 50000;

      await sdk.changeSigner(liquidityProvider);
      exchangeClass = new elasticSwapSDK.Exchange(
        sdk,
        exchange.address,
        baseToken.address,
        quoteToken.address,
      );

      // send users (liquidity provider) base and quote tokens for easy accounting.

      await baseToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      await quoteToken.transfer(
        liquidityProvider.address,
        liquidityProviderInitialBalances,
      );

      // add approvals

      await exchangeClass.quoteToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass.baseToken
        .approve(
          exchangeClass.address,
          liquidityProviderInitialBalances,
        );

      await exchangeClass
        .addLiquidity(
          baseTokenQtyToAdd,
          quoteTokenQtyToAdd,
          1,
          1,
          liquidityProvider.address,
          expiration,
        );

      // confirm the exchange now has the expected balance
      expect((await baseToken.balanceOf(exchangeClass.address)).toNumber()).to.equal(
        baseTokenQtyToAdd,
      );

      expect((await quoteToken.balanceOf(exchangeClass.address)).toNumber()).to.equal(
        quoteTokenQtyToAdd,
      );

      const lpTokenQtyToRemove = (await exchangeClass.lpTokenBalance).toNumber();

      expect((await exchangeClass.lpTokenBalance).toNumber()).to.greaterThan(
        0,
      );

      await exchangeClass
        .removeLiquidity(
          lpTokenQtyToRemove,
          1,
          1,
          liquidityProvider.address,
          expiration,
        );

      expect((await baseToken.balanceOf(exchangeClass.address)).toNumber()).to.equal(
        0,
      );

      expect((await quoteToken.balanceOf(exchangeClass.address)).toNumber()).to.equal(
        0,
      );

      expect((await exchangeClass.lpTokenBalance).toNumber()).to.equal(
        0,
      );
    });
  });
});
