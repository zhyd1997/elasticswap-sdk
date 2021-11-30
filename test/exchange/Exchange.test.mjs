/* eslint import/extensions: 0 */
import chai from 'chai';
import fetch from 'node-fetch';
import hardhat from 'hardhat';
import * as elasticSwapSDK from '../../src/index.mjs';
import LocalStorageAdapterMock from '../adapters/LocalStorageAdapterMock.mjs';
import { expectThrowsAsync } from '../testHelpers.mjs';

const { ethers, deployments } = hardhat;
const { expect, assert } = chai;

const storageAdapter = new LocalStorageAdapterMock();

let sdk;
let exchange;
let quoteToken;
let baseToken;
let accounts;
let liquidityFee;
let liquidityFeeInBasisPoints;
let exchangeClass;

describe('Exchange', () => {
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    await deployments.fixture();

    const ExchangeFactory = await deployments.get('ExchangeFactory');
    const { chainId } = await hardhat.ethers.provider.getNetwork();
    const env = {
      networkId: chainId,
      exchangeFactoryAddress: ExchangeFactory.address,
    };

    sdk = new elasticSwapSDK.SDK({
      env,
      customFetch: fetch,
      provider: hardhat.ethers.provider,
      account: accounts[0],
      signer: accounts[0],
      storageAdapter,
    });

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
    exchange = new ethers.Contract(Exchange.address, Exchange.abi, accounts[0]);

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

  describe('swapBaseTokenForQuoteToken', () => {
    it('Should baseToken wallet balance be less than baseToken to be swapped', async () => {
      // create expiration 50 minutes from now.
      const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
      const liquidityProvider = accounts[1];
      const trader = accounts[2];
      const liquidityProviderInitialBalances = 1000000;
      const amountToAdd = 1000000;
      const baseTokenQtyToAdd = 50000;
      const quoteTokenQtyToAdd = 10000;

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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
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

      // send trader base tokens
      await baseToken.transfer(trader.address, amountToAdd);
      // add approvals for exchange to trade their quote tokens
      await exchangeClass.baseToken.approve(exchangeClass.address, amountToAdd);
      // confirm no balance before trade.
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        0,
      );
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd,
      );

      // swap tokens
      const swapAmount = 10000000;
      const testMethod = exchangeClass.swapBaseTokenForQuoteToken.bind(
        exchangeClass,
        swapAmount,
        1,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 11, Message: NOT_ENOUGH_BASE_TOKEN_BALANCE, Path: unknown.',
      );
    });

    it('Should baseToken allowance balance be less than baseToken to be swapped', async () => {
      // create expiration 50 minutes from now.
      const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
      const liquidityProvider = accounts[1];
      const trader = accounts[2];
      const liquidityProviderInitialBalances = 1000000;
      const amountToAdd = 1000000;
      const baseTokenQtyToAdd = 50000;
      const quoteTokenQtyToAdd = 10000;

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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
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

      // send trader base tokens
      await baseToken.transfer(trader.address, amountToAdd);
      // add approvals for exchange to trade their quote tokens
      await exchangeClass.baseToken.approve(exchangeClass.address, 1);
      // confirm no balance before trade.
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        0,
      );
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd,
      );

      // swap tokens
      const swapAmount = 100000;
      const testMethod = exchangeClass.swapBaseTokenForQuoteToken.bind(
        exchangeClass,
        swapAmount,
        1,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 13, Message: TRANSFER_NOT_APPROVED_BY_USER, Path: unknown.',
      );
    });

    it('Should timestamp be expired', async () => {
      // create expiration 50 minutes from now.
      const expirationValid = Math.round(new Date().getTime() / 1000 + 60 * 50);
      // create expiration 50 minutes before now.
      const expirationInvalid = Math.round(
        new Date().getTime() / 1000 - 60 * 50,
      );
      const liquidityProvider = accounts[1];
      const trader = accounts[2];
      const liquidityProviderInitialBalances = 1000000;
      const amountToAdd = 1000000;
      const baseTokenQtyToAdd = 50000;
      const quoteTokenQtyToAdd = 10000;

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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
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

      // send trader base tokens
      await baseToken.transfer(trader.address, amountToAdd);
      // add approvals for exchange to trade their quote tokens
      await exchangeClass.baseToken.approve(exchangeClass.address, amountToAdd);
      // confirm no balance before trade.
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        0,
      );
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd,
      );

      // swap tokens
      const swapAmount = 100000;
      const testMethod = exchangeClass.swapBaseTokenForQuoteToken.bind(
        exchangeClass,
        swapAmount,
        1,
        expirationInvalid,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 14, Message: TIMESTAMP_EXPIRED, Path: unknown.',
      );
    });

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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
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
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        0,
      );
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd,
      );

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

      await exchangeClass.swapBaseTokenForQuoteToken(swapAmount, 1, expiration);
      // confirm trade occurred at expected
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        Math.trunc(quoteTokenQtyExpected),
      );
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd - swapAmount,
      );
    });
  });

  describe('swapQuoteTokenForBaseToken', () => {
    it('Should quoteToken wallet balance be less than quoteToken to be swapped', async () => {
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
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
      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        amountToAdd,
      );
      // confirm no balance before trade.
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        0,
      );
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd,
      );

      // swap tokens
      const swapAmount = 10000000;
      const testMethod = exchangeClass.swapQuoteTokenForBaseToken.bind(
        exchangeClass,
        swapAmount,
        1,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 12, Message: NOT_ENOUGH_QUOTE_TOKEN_BALANCE, Path: unknown.',
      );
    });

    it('Should quoteToken allowance balance be less than quoteToken to be swapped', async () => {
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
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
      await exchangeClass.quoteToken.approve(exchangeClass.address, 1);
      // confirm no balance before trade.
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        0,
      );
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd,
      );

      // swap tokens
      const swapAmount = 100000;
      const testMethod = exchangeClass.swapQuoteTokenForBaseToken.bind(
        exchangeClass,
        swapAmount,
        1,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 13, Message: TRANSFER_NOT_APPROVED_BY_USER, Path: unknown.',
      );
    });

    it('Should timestamp be expired', async () => {
      // create expiration 50 minutes from now.
      const expirationValid = Math.round(new Date().getTime() / 1000 + 60 * 50);
      // create expiration 50 minutes before now.
      const expirationInvalid = Math.round(
        new Date().getTime() / 1000 - 60 * 50,
      );
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
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
      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        amountToAdd,
      );
      // confirm no balance before trade.
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        0,
      );
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd,
      );

      // swap tokens
      const swapAmount = 100000;
      const testMethod = exchangeClass.swapQuoteTokenForBaseToken.bind(
        exchangeClass,
        swapAmount,
        1,
        expirationInvalid,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 14, Message: TIMESTAMP_EXPIRED, Path: unknown.',
      );
    });

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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
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
      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        amountToAdd,
      );
      // confirm no balance before trade.
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        0,
      );
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd,
      );

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

      await exchangeClass.swapQuoteTokenForBaseToken(swapAmount, 1, expiration);
      // confirm trade occurred at expected
      expect((await baseToken.balanceOf(trader.address)).toNumber()).to.equal(
        Math.trunc(baseTokenQtyExpected),
      );
      expect((await quoteToken.balanceOf(trader.address)).toNumber()).to.equal(
        amountToAdd - swapAmount,
      );
    });
  });

  describe('addLiquidity', () => {
    it('Should quoteToken and baseToken qty to be swapped be less than quoteToken and baseToken minimum qty', async () => {
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      const testMethod = exchangeClass.addLiquidity.bind(
        exchangeClass,
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        baseTokenQtyToAdd + 1,
        baseTokenQtyToAdd + 1,
        liquidityProvider.address,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 15, Message: TOKEN_QTY_DESIRED_LESS_OR_EQUAL_THAN_MINIMUM, Path: unknown.',
      );

      // confirm the exchange has 0 balance for base and quote token
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);
    });

    it('Should baseToken balance be less than baseToken to be swapped', async () => {
      // create expiration 50 minutes from now.
      const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
      const liquidityProvider = accounts[1];
      const liquidityProviderBaseTokenInitialBalance = 1;
      const liquidityProviderQuoteTokenInitialBalance = 10000000;
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
        liquidityProviderBaseTokenInitialBalance,
      );

      await quoteToken.transfer(
        liquidityProvider.address,
        liquidityProviderQuoteTokenInitialBalance,
      );

      // add approvals

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderQuoteTokenInitialBalance,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderBaseTokenInitialBalance,
      );

      const testMethod = exchangeClass.addLiquidity.bind(
        exchangeClass,
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 11, Message: NOT_ENOUGH_BASE_TOKEN_BALANCE, Path: unknown.',
      );

      // confirm the exchange has 0 balance for base and quote token
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);
    });

    it('Should quoteToken balance be less than quoteToken to be swapped', async () => {
      // create expiration 50 minutes from now.
      const expiration = Math.round(new Date().getTime() / 1000 + 60 * 50);
      const liquidityProvider = accounts[1];
      const liquidityProviderBaseTokenInitialBalance = 10000000;
      const liquidityProviderQuoteTokenInitialBalance = 1;
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
        liquidityProviderBaseTokenInitialBalance,
      );

      await quoteToken.transfer(
        liquidityProvider.address,
        liquidityProviderQuoteTokenInitialBalance,
      );

      // add approvals

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderQuoteTokenInitialBalance,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderBaseTokenInitialBalance,
      );

      const testMethod = exchangeClass.addLiquidity.bind(
        exchangeClass,
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 12, Message: NOT_ENOUGH_QUOTE_TOKEN_BALANCE, Path: unknown.',
      );

      // confirm the exchange has 0 balance for base and quote token
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);
    });

    it('Should timestamp be expired', async () => {
      // create expiration 50 minutes before now.
      const expiration = Math.round(new Date().getTime() / 1000 - 60 * 50);
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      const testMethod = exchangeClass.addLiquidity.bind(
        exchangeClass,
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 14, Message: TIMESTAMP_EXPIRED, Path: unknown.',
      );

      // confirm the exchange now has the expected balance
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);
    });

    it('Should ADD quote and base token liquidity', async () => {
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      // confirm the exchange now has the expected balance
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(baseTokenQtyToAdd);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(quoteTokenQtyToAdd);
    });
  });

  describe('removeLiquidity', () => {
    it('Should LP Token allowance balance be less than LP Token to be swapped', async () => {
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      // confirm the exchange now has the expected balance
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(baseTokenQtyToAdd);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(quoteTokenQtyToAdd);

      const lpTokenQtyToRemove = (
        await exchangeClass.lpTokenBalance
      ).toNumber();

      expect(lpTokenQtyToRemove).to.greaterThan(0);

      await exchangeClass.lpToken.approve(exchangeClass.address, 1);

      const testMethod = exchangeClass.removeLiquidity.bind(
        exchangeClass,
        lpTokenQtyToRemove,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 13, Message: TRANSFER_NOT_APPROVED_BY_USER, Path: unknown.',
      );

      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(baseTokenQtyToAdd);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(quoteTokenQtyToAdd);

      expect((await exchangeClass.lpTokenBalance).toNumber()).to.equal(
        lpTokenQtyToRemove,
      );
    });

    it('Should LP Token balance be less than LP Token to be removed', async () => {
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      // confirm the exchange now has the expected balance
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(baseTokenQtyToAdd);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(quoteTokenQtyToAdd);

      const lpTokenQtyToRemove =
        (await exchangeClass.lpTokenBalance).toNumber() + 1;

      expect(lpTokenQtyToRemove).to.greaterThan(0);

      await exchangeClass.lpToken.approve(
        exchangeClass.address,
        1000000000000000,
      );

      const testMethod = exchangeClass.removeLiquidity.bind(
        exchangeClass,
        lpTokenQtyToRemove,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 16, Message: NOT_ENOUGH_LP_TOKEN_BALANCE, Path: unknown.',
      );

      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(baseTokenQtyToAdd);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(quoteTokenQtyToAdd);

      expect((await exchangeClass.lpTokenBalance).toNumber()).to.equal(
        lpTokenQtyToRemove - 1,
      );
    });

    it('Should timestamp be expired', async () => {
      // create expiration 50 minutes from now.
      const expirationValid = Math.round(new Date().getTime() / 1000 + 60 * 50);
      // create expiration 50 minutes before now.
      const expirationInvalid = Math.round(
        new Date().getTime() / 1000 - 60 * 50,
      );
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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        1,
        1,
        liquidityProvider.address,
        expirationValid,
      );

      // confirm the exchange now has the expected balance
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(baseTokenQtyToAdd);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(quoteTokenQtyToAdd);

      const lpTokenQtyToRemove = (
        await exchangeClass.lpTokenBalance
      ).toNumber();

      expect(lpTokenQtyToRemove).to.greaterThan(0);

      await exchangeClass.lpToken.approve(
        exchangeClass.address,
        1000000000000000,
      );

      const testMethod = exchangeClass.removeLiquidity.bind(
        exchangeClass,
        lpTokenQtyToRemove,
        1,
        1,
        liquidityProvider.address,
        expirationInvalid,
      );

      await expectThrowsAsync(
        testMethod,
        'Origin: exchange, Code: 14, Message: TIMESTAMP_EXPIRED, Path: unknown.',
      );

      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(baseTokenQtyToAdd);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(quoteTokenQtyToAdd);

      expect((await exchangeClass.lpTokenBalance).toNumber()).to.equal(
        lpTokenQtyToRemove,
      );
    });

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

      await exchangeClass.quoteToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.baseToken.approve(
        exchangeClass.address,
        liquidityProviderInitialBalances,
      );

      await exchangeClass.addLiquidity(
        baseTokenQtyToAdd,
        quoteTokenQtyToAdd,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      // confirm the exchange now has the expected balance
      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(baseTokenQtyToAdd);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(quoteTokenQtyToAdd);

      const lpTokenQtyToRemove = (
        await exchangeClass.lpTokenBalance
      ).toNumber();

      expect(lpTokenQtyToRemove).to.greaterThan(0);

      await exchangeClass.lpToken.approve(
        exchangeClass.address,
        1000000000000000,
      );

      await exchangeClass.removeLiquidity(
        lpTokenQtyToRemove,
        1,
        1,
        liquidityProvider.address,
        expiration,
      );

      expect(
        (await baseToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);

      expect(
        (await quoteToken.balanceOf(exchangeClass.address)).toNumber(),
      ).to.equal(0);

      expect((await exchangeClass.lpTokenBalance).toNumber()).to.equal(0);
    });
  });
});
