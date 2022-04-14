import { ethers } from 'ethers';

export const BASIS_POINTS = ethers.BigNumber.from('10000');
export const WAD = ethers.utils.parseUnits('1', 18);

/**
 * get the base qty expected to output (assuming no slippage) based on the quoteTokenQty
 * passed in.
 * @param {ethers.BigNumber} quoteTokenQty quoteTokenQty to swap
 * @param {ethers.BigNumber} baseTokenReserveQty current baseToken.balanceOf(exchange)
 * @param {ethers.BigNumber} fee fee amount in basis points
 * @param {object} internalBalances { baseTokenReserveQty, quoteTokenReserveQty }
 * representing internal accounting of the exchange contract
 * @returns baseToken qty
 */
export const getBaseTokenQtyFromQuoteTokenQty = (
  quoteTokenQty,
  baseTokenReserveQty,
  fee,
  internalBalances,
) => {
  // check to see if we have experienced quote token Decay / a rebase down event
  if (baseTokenReserveQty.lt(internalBalances.baseTokenReserveQty)) {
    // we have less reserves than our current price curve will expect, we need to adjust the curve
    const pricingRatio = wDiv(
      internalBalances.baseTokenReserveQty,
      internalBalances.quoteTokenReserveQty,
    );
    //    ^ is Omega
    const impliedQuoteTokenQty = wDiv(baseTokenReserveQty, pricingRatio);

    return calculateQtyToReturnAfterFees(
      quoteTokenQty,
      impliedQuoteTokenQty,
      baseTokenReserveQty,
      fee,
    );
  }
  // we have the same or more reserves, no need to alter the curve.
  return calculateQtyToReturnAfterFees(
    quoteTokenQty,
    internalBalances.quoteTokenReserveQty,
    internalBalances.baseTokenReserveQty,
    fee,
  );
};

/**
 * Returns the quote qty expected to output (given no slippage) based on the baseTokenQty
 * passed in for the given internal balances and fee.
 * @param {ethers.BigNumber} baseTokenQty
 * @param {ethers.BigNumber} fee fee amount in basis points
 * @param {object} internalBalances { baseTokenReserveQty, quoteTokenReserveQty }
 * representing internal accounting of the exchange contract
 * @returns quoteToken qty
 */
export const getQuoteTokenQtyFromBaseTokenQty = (baseTokenQty, fee, internalBalances) =>
  calculateQtyToReturnAfterFees(
    baseTokenQty,
    internalBalances.baseTokenReserveQty,
    internalBalances.quoteTokenReserveQty,
    fee,
  );

/**
 *
 * @param {ethers.BigNumber} lpTokenQty
 * @param {ethers.BigNumber} baseTokenReserveQty α baseToken.balanceOf(exchange)
 * @param {ethers.BigNumber} quoteTokenReserveQty β quoteToken.balanceOf(exchange)
 * @param {ethers.BigNumber} totalLPTokenSupply exchange.totalSupply();
 * @returns {object} { baseTokenQty: ethers.BigNumber, quoteTokenQty: ethers.BigNumber }
 */
export const getTokenQtysFromLPTokenQty = (
  lpTokenQty,
  baseTokenReserveQty,
  quoteTokenReserveQty,
  totalLPTokenSupply,
) => {
  const lpRatio = lpTokenQty.mul(totalLPTokenSupply);
  const baseTokenQty = baseTokenReserveQty.mul(lpRatio);
  const quoteTokenQty = quoteTokenReserveQty.mul(lpRatio);

  const tokenQtys = {
    baseTokenQty,
    quoteTokenQty,
  };

  return tokenQtys;
};

/**
 *
 * @param {ethers.BigNumber} tokenASwapQty
 * @param {ethers.BigNumber} tokenAReserveQty
 * @param {ethers.BigNumber} tokenBReserveQty
 * @param {ethers.BigNumber} fee fee amount in basis points
 * @returns ethers.BigNumber token qty
 */
export const calculateQtyToReturnAfterFees = (
  tokenASwapQty,
  tokenAReserveQty,
  tokenBReserveQty,
  fee,
) => {
  const differenceInBP = BASIS_POINTS.sub(fee);
  const tokenASwapQtyLessFee = tokenASwapQty.mul(differenceInBP);
  const numerator = tokenASwapQtyLessFee.mul(tokenBReserveQty);
  const denominator = tokenAReserveQty.mul(BASIS_POINTS).add(tokenASwapQtyLessFee);
  const qtyToReturn = numerator.div(denominator);
  return qtyToReturn;
};

/**
 * returns a / b in the form of a WAD integer (18 decimals of precision)
 * NOTE: this rounds to the nearest integer (up or down). For example .666666 would end up
 * rounding to .66667.
 * @param {ethers.BigNumber} a
 * @param {ethers.BigNumber} b
 * @returns wad value of a/b
 */
const wDiv = (a, b) => a.mul(WAD).add(b.div(2)).div(b);

export default {
  BASIS_POINTS,
  calculateQtyToReturnAfterFees,
  getBaseTokenQtyFromQuoteTokenQty,
  getQuoteTokenQtyFromBaseTokenQty,
  getTokenQtysFromLPTokenQty,
};
