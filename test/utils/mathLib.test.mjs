/* eslint import/extensions: 0 */
import chai, { expect } from 'chai';
import mathLib from '../../src/utils/MathLib.js'
import BigNumber from 'bignumber.js'

const { assert } = chai;
const { 
  isSufficientDecayPresent,
  calculateQty,
  calculateQtyToReturnAfterFees,
  calculateLiquidityTokenQtyForSingleAssetEntry,
  calculateLiquidityTokenQtyForDoubleAssetEntry,
  calculateAddQuoteTokenLiquidityQuantities,
  calculateAddBaseTokenLiquidityQuantities,
  calculateAddLiquidityQuantities,
  calculateAddTokenPairLiquidityQuantities,
  calculateBaseTokenQty,
  calculateQuoteTokenQty,
  calculateLiquidityTokenFees } = mathLib;



describe("calculateQty", () => {

  it("Should return the correct calculateQty", async () => {
    assert.isTrue(calculateQty(500, 100, 5000).isEqualTo(BigNumber(25000)));
    assert.isTrue(calculateQty(100, 500, 5000).isEqualTo(BigNumber(1000)));
  });

  it("Should revert if any value is 0", async () => {
    assert.throws(() => calculateQty(0, 100, 500), "MathLib: INSUFFICIENT_QTY");
    assert.throws(() => calculateQty(500, 0, 1000), "MathLib: INSUFFICIENT_LIQUIDITY");
    assert.throws(() => calculateQty(500, 100, 0), "MathLib: INSUFFICIENT_LIQUIDITY");
  });

});

describe("calculateQtyToReturnAfterFees", () => {
  // NOTE: this is the test with the issue currently
  it.only("Should return the correct values", async () => {
    const tokenSwapQty = BigNumber(50);
    const feeInBasisPoints = BigNumber(30);
    const expectedFeeAmount =   (tokenSwapQty.multipliedBy(feeInBasisPoints)).dividedBy(BigNumber(10000));
    const tokenAReserveQtyBeforeTrade = BigNumber(100);
    const tokenAReserveQtyAfterTrade = (tokenAReserveQtyBeforeTrade.plus(tokenSwapQty)).minus(expectedFeeAmount);
    const tokenBReserveQtyBeforeTrade = BigNumber(5000);

    const pricingConstantK = tokenAReserveQtyBeforeTrade.multipliedBy(tokenBReserveQtyBeforeTrade);

    const tokenBReserveQtyBeforeTradeAfterTrade = pricingConstantK.dividedBy(tokenAReserveQtyAfterTrade);

    const tokenBQtyExpected = tokenBReserveQtyBeforeTrade.minus(tokenBReserveQtyBeforeTradeAfterTrade);

    const fetchedCalculateQtyToReturnAfterFees = calculateQtyToReturnAfterFees(
      tokenSwapQty,
      tokenAReserveQtyBeforeTrade,
      tokenBReserveQtyBeforeTrade,
      feeInBasisPoints
    );

    console.log(fetchedCalculateQtyToReturnAfterFees.toString());
    console.log(tokenBQtyExpected.toString());
    // for reference the tests in solidity result in 1663 which is floor of tokenBQtyExpected
    // further pointing to an error in the sdk implmentation

    assert.isTrue(fetchedCalculateQtyToReturnAfterFees.isEqualTo(tokenBQtyExpected));

  });

});


describe("calculateLiquiditytokenQtyForDoubleAssetEntry", () => {
  it("Should return the correct qty of liquidity tokens", async () => {
    const totalSupplyOfLiquidityTokens = BigNumber(50);
    const quoteTokenBalance = BigNumber(50);
    const quoteTokenQtyToAdd = BigNumber(15);
    const calculatedLiquidityTokenQtyForDoubleAssetEntry = calculateLiquidityTokenQtyForDoubleAssetEntry(
      totalSupplyOfLiquidityTokens, // 50
      quoteTokenQtyToAdd, // 15
      quoteTokenBalance, // 50
       
    );

    assert.isTrue(calculatedLiquidityTokenQtyForDoubleAssetEntry.isEqualTo(BigNumber(15)));
  });
});



  // it('calculates using calculateOutputAmount correctly', async() => {
    
  //   // no slippage
  //   const answer = calculateOutputAmount(10, 500, 100, 0);
  //   assert.isTrue(answer.isEqualTo(BigNumber("1.96078431372549019608")));

  //   // 5 percent slippage
  //   const slippageAnswer = calculateOutputAmount(10, 500, 100, 5);
  //   assert.isTrue(slippageAnswer.isEqualTo(BigNumber("6.862745098039215686276")));

  //   // empty reserves should return sane error
  //   assert.throws(() => calculateOutputAmount(1, 0, 100, 5), "Error:Empty pool")
  //   assert.throws(() => calculateOutputAmount(1, 100, 0, 5), "Error:Empty pool")

  //   // incorrect trade amount
  //   assert.throws(() => calculateOutputAmount(0, 100, 100, 5), "Error: Divide by zero")

  // });

  // it('calculates the exchange rate using calculateExchangeRate correctly', async ()  => {

  //   // bunch of sane values
  //   const rate1 = calculateExchangeRate(100,100);
  //   assert.isTrue(rate1.isEqualTo(BigNumber(1)));
  //   const rate2 = calculateExchangeRate(600,10000);
  //   assert.isTrue(rate2.isEqualTo(BigNumber(0.06)));

  //   // null values - should err gracefully
  //   assert.throws(() => calculateExchangeRate(0, 100), "Error:Empty pool");
  //   assert.throws(() => calculateExchangeRate(100, 0), "Error:Empty pool");
  // });

  // it('calculates priceImpact correctly', async () => {
  //   const priceImpact1 = calculatePriceImpact(10, 500, 100, 0);
  //   assert.isTrue(priceImpact1.isEqualTo(BigNumber(0.0404)));

  //   const priceImpact2 = calculatePriceImpact(10, 500, 100, 5);
  //   assert.isTrue(priceImpact2.isEqualTo(BigNumber("0.09515789473684210526")));

  //   // empty reserves should return sane error
  //   assert.throws(() => calculatePriceImpact(1, 0, 100, 5), "Error:Empty pool");
  //   assert.throws(() => calculatePriceImpact(1, 100, 0, 5), "Error:Empty pool");

  //   // incorrect trade amount
  //   assert.throws(() => calculatePriceImpact(0, 100, 100, 5), "Error: Divide by zero");

  // });

  // it('calculates Decay correctly', async () => {
  //   // alpha decay
  //   const positiveAlphaDecay = calculateDecay(100, 125, 100, 100);
  //   assert.isTrue(positiveAlphaDecay.type === "alphaDecay");
  //   assert.isTrue(positiveAlphaDecay.value.isEqualTo(BigNumber("25")));

  //   const negativeAlphaDecay = calculateDecay(100, 75, 100 , 100);
  //   assert.isTrue(negativeAlphaDecay.type === "alphaDecay");
  //   assert.isTrue(negativeAlphaDecay.value.isEqualTo(BigNumber("-25")));

  //   // beta decay
  //   const positiveBetaDecay = calculateDecay(100, 100, 100, 125);
  //   assert.isTrue(positiveBetaDecay.type === "betaDecay");
  //   assert.isTrue(positiveBetaDecay.value.isEqualTo(BigNumber("25")));

  //   const negativeBetaDecay = calculateDecay(100, 100, 125 , 100);
  //   assert.isTrue(negativeBetaDecay.type === "betaDecay");
  //   assert.isTrue(negativeBetaDecay.value.isEqualTo(BigNumber("-25")));

  //   // no decay
  //   const noDecay = calculateDecay(1000, 1000, 1000, 1000);
  //   assert.isTrue(noDecay.type === "noDecay");
  //   assert.isTrue(noDecay.value.isZero());
  //   // test
  // });

  



