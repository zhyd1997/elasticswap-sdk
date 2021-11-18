/* eslint import/extensions: 0 */
import chai, { expect } from 'chai';
import mathLib from '../../src/utils/MathLib.js';
import BigNumber from 'bignumber.js';


// const { assert } = chai;
const { 
  calculateExchangeRate,
  calculateQty,
  calculateQtyToReturnAfterFees,
  calculateLiquidityTokenQtyForSingleAssetEntry,
  calculateLiquidityTokenQtyForDoubleAssetEntry,
  calculateOutputAmountLessFees,
  calculatePriceImpact,
  INSUFFICIENT_QTY,
  INSUFFICIENT_LIQUIDITY,
  NEGATIVE_INPUT,
  NAN_ERROR } = mathLib;

const EPSILON = .0000000000000001;
const ZERO = BigNumber(0);

describe("calculateQty", () => {

  it("Should return the correct calculateQty", async () => {
    
    expect(calculateQty(500, 100, 5000).toNumber()).to.equal(25000);
    expect(calculateQty(100, 500, 5000).toNumber()).to.equal(1000);
  });

  it("Should revert if any value is 0", async () => {
    expect(() => mathLib.calculateQty(0, 100, 500)).to.throw(INSUFFICIENT_QTY);
    expect(() => mathLib.calculateQty(500, 0, 1000)).to.throw(INSUFFICIENT_LIQUIDITY);
    expect(() => mathLib.calculateQty(500, 100, 0)).to.throw(INSUFFICIENT_LIQUIDITY);
  });

});

describe("calculateQtyToReturnAfterFees", () => {

  it("Should return the correct values", async () => {

    const tokenSwapQty = 50;
    const feeInBasisPoints = 30;
    const expectedFeeAmount = (tokenSwapQty * 30) / 10000;
    const tokenAReserveQtyBeforeTrade = 100;
    const tokenAReserveQtyAfterTrade =
      tokenAReserveQtyBeforeTrade + tokenSwapQty - expectedFeeAmount;
    const tokenBReserveQtyBeforeTrade = 5000;
    const pricingConstantK =
      tokenAReserveQtyBeforeTrade * tokenBReserveQtyBeforeTrade;

    const tokenBReserveQtyBeforeTradeAfterTrade =
      pricingConstantK / tokenAReserveQtyAfterTrade;
    const tokenBQtyExpected = Math.floor(
      tokenBReserveQtyBeforeTrade - tokenBReserveQtyBeforeTradeAfterTrade
    );

    expect(
      calculateQtyToReturnAfterFees(
        tokenSwapQty,
        tokenAReserveQtyBeforeTrade,
        tokenBReserveQtyBeforeTrade,
        feeInBasisPoints
      ).toNumber()
    ).to.equal(tokenBQtyExpected);

  });

  it("Should return the correct value when fees are zero", async () => {
    const tokenSwapQty = 15;
    const tokenAReserveQtyBeforeTrade = 2000;
    const tokenAReserveQtyAfterTrade =
      tokenAReserveQtyBeforeTrade + tokenSwapQty;
    const tokenBReserveQtyBeforeTrade = 3000;
    const pricingConstantK =
      tokenAReserveQtyBeforeTrade * tokenBReserveQtyBeforeTrade;

    const tokenBReserveQtyBeforeTradeAfterTrade =
      pricingConstantK / tokenAReserveQtyAfterTrade;
    const tokenBQtyExpected = Math.floor(
      tokenBReserveQtyBeforeTrade - tokenBReserveQtyBeforeTradeAfterTrade
    );

    expect(
      calculateQtyToReturnAfterFees(
        tokenSwapQty,
        tokenAReserveQtyBeforeTrade,
        tokenBReserveQtyBeforeTrade,
        0
      ).toNumber()
    ).to.equal(tokenBQtyExpected);
  });

});


describe("calculateLiquiditytokenQtyForDoubleAssetEntry", () => {
  it("Should return the correct qty of liquidity tokens", async () => {
    const totalSupplyOfLiquidityTokens = 50;
    const quoteTokenBalance = 50;
    const quoteTokenQtyToAdd = 15;

    expect(
      calculateLiquidityTokenQtyForDoubleAssetEntry(
        totalSupplyOfLiquidityTokens,
        quoteTokenQtyToAdd,
        quoteTokenBalance
      ).toNumber()
    ).to.equal(15);
  });
});

describe("calculateLiquidityTokenQtyForSingleAssetEntry", () => {
  it("Should return the correct qty of liquidity tokens with a rebase down", async () => {
    // Scenario: We have 1000:5000 A:B or X:Y, a rebase down occurs (of 50 tokens)
    // and a user needs to 50 tokens in order to remove the decay
    const totalSupplyOfLiquidityTokens = 5000;
    const tokenAQtyToAdd = 50;
    const tokenAInternalReserveQtyAfterTransaction = 1000; // 950 + 50 brining us back to original state.
    const tokenBDecayChange = 250;
    const tokenBDecay = 250;

    const gamma =
      (tokenAQtyToAdd / tokenAInternalReserveQtyAfterTransaction / 2) *
      (tokenBDecayChange / tokenBDecay);
    const expectLiquidityTokens = Math.floor((totalSupplyOfLiquidityTokens * gamma) / (1 - gamma));

    expect(
      calculateLiquidityTokenQtyForSingleAssetEntry(
        totalSupplyOfLiquidityTokens,
        tokenAQtyToAdd,
        tokenAInternalReserveQtyAfterTransaction,
        tokenBDecayChange,
        tokenBDecay
      ).toNumber()
    ).to.equal(expectLiquidityTokens);

    // if we supply half, and remove half the decay, we should get roughly 1/2 the tokens
    const tokenAQtyToAdd2 = 25;
    const tokenAInternalReserveQtyAfterTransaction2 = 975; // 950 + 25 brining us back to original state.
    const tokenBDecayChange2 = 125;
    const gamma2 =
      (tokenAQtyToAdd2 / tokenAInternalReserveQtyAfterTransaction2 / 2) *
      (tokenBDecayChange2 / tokenBDecay);
    const expectLiquidityTokens2 = Math.floor((totalSupplyOfLiquidityTokens * gamma2) / (1 - gamma2));

    expect(
      calculateLiquidityTokenQtyForSingleAssetEntry(
        totalSupplyOfLiquidityTokens,
        tokenAQtyToAdd2,
        tokenAInternalReserveQtyAfterTransaction2,
        tokenBDecayChange2,
        tokenBDecay
      ).toNumber()
    ).to.equal(expectLiquidityTokens2);
  });

  it("Should return the correct qty of liquidity tokens with a rebase up", async () => {
    // Scenario: We have 1000:5000 A:B or X:Y, a rebase up occurs (of 500 tokens)
    // and a user needs to add 2500 quote tokens to remove the base decay
    const totalSupplyOfLiquidityTokens = 5000;
    const tokenAQtyToAdd = 2500;
    const tokenAInternalReserveQtyAfterTransaction = 7500; // 5000 + 2500 to offset rebase up
    const tokenBDecayChange = 500;
    const tokenBDecay = 500;

    const gamma =
      (tokenAQtyToAdd / tokenAInternalReserveQtyAfterTransaction / 2) *
      (tokenBDecayChange / tokenBDecay);
    const expectLiquidityTokens = Math.floor(
      (totalSupplyOfLiquidityTokens * gamma) / (1 - gamma)
    );
    expect(
     calculateLiquidityTokenQtyForSingleAssetEntry(
        totalSupplyOfLiquidityTokens,
        tokenAQtyToAdd,
        tokenAInternalReserveQtyAfterTransaction,
        tokenBDecayChange,
        tokenBDecay
      ).toNumber()
    ).to.equal(expectLiquidityTokens);

    // if we supply half, and remove half the decay, we should get roughly 1/2 the tokens
    const tokenAQtyToAdd2 = 2500;
    const tokenAInternalReserveQtyAfterTransaction2 = 6250;
    const tokenBDecayChange2 = 250;
    const gamma2 =
      (tokenAQtyToAdd2 / tokenAInternalReserveQtyAfterTransaction2 / 2) *
      (tokenBDecayChange2 / tokenBDecay);
    const expectLiquidityTokens2 = Math.floor(
      (totalSupplyOfLiquidityTokens * gamma2) / (1 - gamma2)
    );

    expect(
      calculateLiquidityTokenQtyForSingleAssetEntry(
        totalSupplyOfLiquidityTokens,
        tokenAQtyToAdd2,
        tokenAInternalReserveQtyAfterTransaction2,
        tokenBDecayChange2,
        tokenBDecay
      ).toNumber()
    ).to.equal(expectLiquidityTokens2);
  });
});

describe("calculateExchangeRate", () => {
  it("Should calculate the exchange rate correctly", async () => {
    const baseTokenReserveQty1 = BigNumber('10.123456789123456789');
    const quoteTokenReserveQty1 = BigNumber('12.123456789123456789');

    const calculatedExchangeRate1 = baseTokenReserveQty1.dividedBy(quoteTokenReserveQty1);
    expect(calculateExchangeRate(baseTokenReserveQty1, quoteTokenReserveQty1).toNumber()).to.equal(calculatedExchangeRate1.toNumber());

    const baseTokenReserveQty2 = BigNumber('10');
    const quoteTokenReserveQty2 = BigNumber('12.123456789123456789');

    const calculatedExchangeRate2 = baseTokenReserveQty2.dividedBy(quoteTokenReserveQty2);
    expect(calculateExchangeRate(baseTokenReserveQty2, quoteTokenReserveQty2).toNumber()).to.equal(calculatedExchangeRate2.toNumber());

  });

  it("Should return an error when incorrect values are provided", async () => {
    const baseTokenReserveQty1 = BigNumber('10.123456789123456789');
    const quoteTokenReserveQty1 = BigNumber('12.123456789123456789');
    const negativequoteTokenReserveQty = BigNumber('-12.123456789123456789');

    // ZERO case
    expect(() => calculateExchangeRate(ZERO, quoteTokenReserveQty1)).to.throw(INSUFFICIENT_LIQUIDITY);
    expect(() => calculateExchangeRate(quoteTokenReserveQty1, ZERO)).to.throw(INSUFFICIENT_LIQUIDITY);
    
    // Negative inputs provided
    expect(() => calculateExchangeRate(quoteTokenReserveQty1, negativequoteTokenReserveQty)).to.throw(NEGATIVE_INPUT);

    // Nan cases
    expect(() => calculateExchangeRate(null, negativequoteTokenReserveQty)).to.throw(NAN_ERROR);
    expect(() => calculateExchangeRate(undefined, negativequoteTokenReserveQty)).to.throw(NAN_ERROR);

  });
});

describe("calculateOutputAmountLessFees", () => {
  it("Should calculateOutputAmount correctly, accounting for fees and  slippage", async () => {
    // slippage and fees 
    // 5 percent slippage
    const slippage = 5;
    const tokenSwapQty = 50;
    const feeInBasisPoints = 30;
    const expectedFeeAmount = (tokenSwapQty * 30) / 10000;
    const tokenAReserveQtyBeforeTrade = 100;
    const tokenAReserveQtyAfterTrade =
      tokenAReserveQtyBeforeTrade + tokenSwapQty - expectedFeeAmount;
    const tokenBReserveQtyBeforeTrade = 5000;
    const pricingConstantK =
      tokenAReserveQtyBeforeTrade * tokenBReserveQtyBeforeTrade;

    const tokenBReserveQtyBeforeTradeAfterTrade =
      pricingConstantK / tokenAReserveQtyAfterTrade;
    const tokenBQtyExpected = Math.floor(
      tokenBReserveQtyBeforeTrade - tokenBReserveQtyBeforeTradeAfterTrade
    );

    const tokenBQtyExpectedLessSlippage = (tokenBQtyExpected) * (1 - (slippage/100));

    expect(
      calculateOutputAmountLessFees(
        tokenSwapQty,
        tokenAReserveQtyBeforeTrade,
        tokenBReserveQtyBeforeTrade,
        slippage,
        feeInBasisPoints
      ).toNumber()
    ).to.equal(tokenBQtyExpectedLessSlippage);

  });

  it("Should calculateOutputAmount correctly, accounting for fees and 0 slippage", async () => {
    // no slippage 
    const tokenSwapQty = 50;
    const feeInBasisPoints = 30;
    const expectedFeeAmount = (tokenSwapQty * 30) / 10000;
    const tokenAReserveQtyBeforeTrade = 100;
    const tokenAReserveQtyAfterTrade =
      tokenAReserveQtyBeforeTrade + tokenSwapQty - expectedFeeAmount;
    const tokenBReserveQtyBeforeTrade = 5000;
    const pricingConstantK =
      tokenAReserveQtyBeforeTrade * tokenBReserveQtyBeforeTrade;

    const tokenBReserveQtyBeforeTradeAfterTrade =
      pricingConstantK / tokenAReserveQtyAfterTrade;
    const tokenBQtyExpected = Math.floor(
      tokenBReserveQtyBeforeTrade - tokenBReserveQtyBeforeTradeAfterTrade
    );

    expect(
      calculateOutputAmountLessFees(
        tokenSwapQty,
        tokenAReserveQtyBeforeTrade,
        tokenBReserveQtyBeforeTrade,
        ZERO,
        feeInBasisPoints
      ).toNumber()
    ).to.equal(tokenBQtyExpected);

  });

  it("Should calculateOutputAmount correctly, accounting for 0 fees and 0 slippage", async() => {
    // no slippage no fees
    const tokenSwapQty = 15;
    const tokenAReserveQtyBeforeTrade = 2000;
    const tokenAReserveQtyAfterTrade =
      tokenAReserveQtyBeforeTrade + tokenSwapQty;
    const tokenBReserveQtyBeforeTrade = 3000;
    const pricingConstantK =
      tokenAReserveQtyBeforeTrade * tokenBReserveQtyBeforeTrade;

    const tokenBReserveQtyBeforeTradeAfterTrade =
      pricingConstantK / tokenAReserveQtyAfterTrade;
    const tokenBQtyExpected = Math.floor(
      tokenBReserveQtyBeforeTrade - tokenBReserveQtyBeforeTradeAfterTrade
    );

    expect(
      calculateOutputAmountLessFees(
        tokenSwapQty,
        tokenAReserveQtyBeforeTrade,
        tokenBReserveQtyBeforeTrade,
        ZERO,
        ZERO
      ).toNumber()
    ).to.equal(tokenBQtyExpected);

  });

  it("Should return an error when incorrect values are provided", async () => {

    const slippage = 5;
    const tokenSwapQty = 50;
    const negativeSwapQty = -50;
    const feeInBasisPoints = 30;
    const expectedFeeAmount = (tokenSwapQty * 30) / 10000;
    const tokenAReserveQtyBeforeTrade = 100;
    const tokenAReserveQtyAfterTrade =
      tokenAReserveQtyBeforeTrade + tokenSwapQty - expectedFeeAmount;
    const tokenBReserveQtyBeforeTrade = 5000;
    const pricingConstantK =
      tokenAReserveQtyBeforeTrade * tokenBReserveQtyBeforeTrade;

    const tokenBReserveQtyBeforeTradeAfterTrade =
      pricingConstantK / tokenAReserveQtyAfterTrade;
    const tokenBQtyExpected = Math.floor(
      tokenBReserveQtyBeforeTrade - tokenBReserveQtyBeforeTradeAfterTrade
    );

    const tokenBQtyExpectedLessSlippage = (tokenBQtyExpected) * (1 - (slippage/100));

    // ZERO case
    expect(() => calculateOutputAmountLessFees(
      tokenSwapQty,
      ZERO,
      tokenBReserveQtyBeforeTrade,
      slippage,
      feeInBasisPoints
    )).to.throw(INSUFFICIENT_LIQUIDITY);

    expect(() => calculateOutputAmountLessFees(
      tokenSwapQty,
      tokenAReserveQtyBeforeTrade,
      ZERO,
      slippage,
      feeInBasisPoints
    )).to.throw(INSUFFICIENT_LIQUIDITY);
    
    // Negative inputs provided
    expect(() => calculateOutputAmountLessFees(
      negativeSwapQty,
      tokenAReserveQtyBeforeTrade,
      tokenBReserveQtyBeforeTrade,
      slippage,
      feeInBasisPoints
    )).to.throw(NEGATIVE_INPUT);

    // Nan cases
    expect(() =>
      calculateOutputAmountLessFees(
        null,
        tokenAReserveQtyBeforeTrade,
        tokenBReserveQtyBeforeTrade,
        slippage,
        feeInBasisPoints
      )).to.throw(NAN_ERROR);
    
    expect(() =>
      calculateOutputAmountLessFees(
        undefined,
        tokenAReserveQtyBeforeTrade,
        tokenBReserveQtyBeforeTrade,
        slippage,
        feeInBasisPoints
      )).to.throw(NAN_ERROR);  

  });

});  

describe("calculatePriceImpact", () => {
  it.only("Should calculate price impact correctly accounting for 0 fees and 0 slippage ", async () => {
    // no slippage no fees
    const tokenSwapQty = BigNumber(15);
    const tokenAReserveQtyBeforeTrade = BigNumber(2000);

    const tokenAReserveQtyAfterTrade = tokenAReserveQtyBeforeTrade.plus(tokenSwapQty);
    console.log("tst: tokenAReserveQtyAfterTrade: ", tokenAReserveQtyAfterTrade.toString());  

    const tokenBReserveQtyBeforeTrade = BigNumber(3000);


    const tokenBOutAmount = calculateOutputAmountLessFees(tokenSwapQty, tokenAReserveQtyAfterTrade,tokenBReserveQtyBeforeTrade, 0, 0);
    
    const tokenBQtyReserveAfterTrade = tokenBReserveQtyBeforeTrade.minus(tokenBOutAmount);
    console.log("tst: tokenBQtyReserveAfterTrade: ", tokenBQtyReserveAfterTrade.toString());

    const initialPrice = BigNumber(tokenAReserveQtyBeforeTrade).dividedBy(BigNumber(tokenBReserveQtyBeforeTrade));
    console.log("tst: initialPrice: ", initialPrice.toString());

    const finalPrice = BigNumber(tokenAReserveQtyAfterTrade).dividedBy(BigNumber(tokenBQtyReserveAfterTrade));
    console.log("tst: finalPrice: ", finalPrice.toString());

    const priceDiff = BigNumber(finalPrice).minus(BigNumber(initialPrice));
    const priceDiffRatio = priceDiff.dividedBy(BigNumber(initialPrice));
    const priceImpact = priceDiffRatio.multipliedBy(BigNumber(100));
    console.log("tst: priceImpact: ", priceImpact.toString());

    expect(
      calculatePriceImpact(
        tokenSwapQty,
        tokenAReserveQtyBeforeTrade,
        tokenBReserveQtyBeforeTrade,
        ZERO,
        ZERO
      ).toNumber()
    ).to.equal(priceImpact.toNumber());


  });

  it("should calculate priceImpact correctly accounting for fees and 0 slippage", async () => {
    

  });

  it.only("should return an error when incorrect values are provided", async() => {
    // no slippage no fees
    const tokenSwapQty = BigNumber(15);
    const tokenAReserveQtyBeforeTrade = BigNumber(2000);

    const tokenAReserveQtyAfterTrade = tokenAReserveQtyBeforeTrade.plus(tokenSwapQty);
    console.log("tst: tokenAReserveQtyAfterTrade: ", tokenAReserveQtyAfterTrade.toString());  

    const tokenBReserveQtyBeforeTrade = BigNumber(3000);


    const tokenBOutAmount = calculateOutputAmountLessFees(tokenSwapQty, tokenAReserveQtyAfterTrade,tokenBReserveQtyBeforeTrade, 0, 0);
    
    const tokenBQtyReserveAfterTrade = tokenBReserveQtyBeforeTrade.minus(tokenBOutAmount);
    console.log("tst: tokenBQtyReserveAfterTrade: ", tokenBQtyReserveAfterTrade.toString());

    const initialPrice = BigNumber(tokenAReserveQtyBeforeTrade).dividedBy(BigNumber(tokenBReserveQtyBeforeTrade));
    console.log("tst: initialPrice: ", initialPrice.toString());

    const finalPrice = BigNumber(tokenAReserveQtyAfterTrade).dividedBy(BigNumber(tokenBQtyReserveAfterTrade));
    console.log("tst: finalPrice: ", finalPrice.toString());

    const priceDiff = BigNumber(finalPrice).minus(BigNumber(initialPrice));
    const priceDiffRatio = priceDiff.dividedBy(BigNumber(initialPrice));
    const priceImpact = priceDiffRatio.multipliedBy(BigNumber(100));
    console.log("tst: priceImpact: ", priceImpact.toString());

    expect(() => 
      calculatePriceImpact(
        tokenSwapQty,
        BigNumber(-100),
        tokenBReserveQtyBeforeTrade,
        ZERO,
        ZERO
      ).toNumber()
    ).to.throw(NEGATIVE_INPUT);


    expect(() => 
      calculatePriceImpact(
        tokenSwapQty,
        0,
        tokenBReserveQtyBeforeTrade,
        ZERO,
        ZERO
      ).toNumber()
    ).to.throw(INSUFFICIENT_LIQUIDITY);

    expect(() => 
    calculatePriceImpact(
      tokenSwapQty,
      null,
      tokenBReserveQtyBeforeTrade,
      ZERO,
      ZERO
    ).toNumber()
  ).to.throw(NAN_ERROR);

  expect(() => 
    calculatePriceImpact(
      tokenSwapQty,
      undefined,
      tokenBReserveQtyBeforeTrade,
      ZERO,
      ZERO
    ).toNumber()
  ).to.throw(NAN_ERROR);
  });
  


});

