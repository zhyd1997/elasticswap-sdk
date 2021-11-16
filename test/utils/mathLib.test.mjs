/* eslint import/extensions: 0 */
import chai, { expect } from 'chai';
import mathLib from '../../src/utils/MathLib.js';
import BigNumber from 'bignumber.js';


const { assert } = chai;
const { ROUND_DOWN } = BigNumber;
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

  it.only("Should return the correct values", async () => {

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

      assert.isTrue(
        calculateQtyToReturnAfterFees(
          tokenSwapQty,
          tokenAReserveQtyBeforeTrade,
          tokenBReserveQtyBeforeTrade,
          feeInBasisPoints
        ).isEqualTo(tokenBQtyExpected)
      );

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



  



