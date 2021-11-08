const sdk = require("@elastic-dao/sdk");
const BigNumber = require("bignumber.js");
const {utils} = sdk;

// TODO: add support for negative scenarios

// calculates the decay (if any) - and returns the type and value of the decay
const calculateDecay = () => {};

// calculates the current exchange rate (x/y)
const calculateExchangeRate = (inputTokenReserveQty, outputTokenReserveQty) => {
  // cleanse input to BN
  inputTokenReserveQtyBN = BigNumber(inputTokenReserveQty);
  outputTokenReserveQtyBN = BigNumber(outputTokenReserveQty);

  // if any one of them are zero return cause empty pool
  if(inputTokenReserveQtyBN.isEqualTo(0) || outputTokenReserveQtyBN.isEqualTo(0)){
    throw new Error("Error:Empty pool");
  }

  return inputTokenReserveQtyBN.dividedBy(outputTokenReserveQtyBN);

}

// calculates expected Ro amount based on inputs
calculateLPTokenAmount(inputQuoteTokenAmount, inputBaseTokenAmount, quoteTokenReserveQty, baseTokenReserveQty, lpTokenReserveQty, decay , slippage) {
  // 3-LP situations: 
  // initial pool setup: deltaRo = sqrt(inputQuoteTokenAmount, inputBaseTokenAmount) 
  // non decay - Double Asset Entry: deltaRo = (ΔY/Y) * Ro = (inputBaseTokenAmount/baseTokenReserveQty) * lpTokenReserveQty

  // Presence of decay - 
  // call calculate and get back decay value and type
  // based on which gamma gets calculated


} 


// calculates the min amount of output tokens given the slippage percent supplied
const calculateOutputAmount = (inputTokenAmount, inputTokenReserveQty, outputTokenReserveQty, slippagePercent) => {

  // inputTokenReserveQty - X
  // logic: K = X*Y
  // YDash = ((K)/ inputTokenAmount)* (1 - (slippagePercent/100))
  // outputTokenAmount = Y - YDash (difference)
  // cleanse input to BN
  const inputTokenAmountBN = BigNumber(inputTokenAmount);
  const inputTokenReserveQtyBN = BigNumber(inputTokenReserveQty);
  const outputTokenReserveQtyBN = BigNumber(outputTokenReserveQty);
  const slippagePercentBN = BigNumber(slippagePercent);
  

  if(inputTokenReserveQtyBN.isEqualTo(BigNumber(0)) || outputTokenReserveQtyBN.isEqualTo(BigNumber(0)) ) {
    throw new Error("Error:Empty pool");
  }
  else
    if(inputTokenAmountBN.isEqualTo(0)) {
      throw new Error("Error: Divide by zero");
    }

  const k = inputTokenReserveQtyBN.multipliedBy(outputTokenReserveQtyBN);
  const XDash = inputTokenReserveQtyBN.plus(inputTokenAmountBN)
  const YDash = k.dividedBy(XDash).multipliedBy(BigNumber("1").minus(slippagePercentBN.dividedBy(BigNumber("100"))));
  const deltaY = YDash.minus(outputTokenReserveQtyBN);
  const outputTokenAmountBN = deltaY.absoluteValue();
  
                                
  return outputTokenAmountBN;                                


};

// calculates the price impact (or % move in x/y)
const calculatePriceImpact = (inputTokenAmount, inputTokenReserveQty, outputTokenReserveQty, slippagePercent) => {
  // price impact is percentage difference in omega post trade
  // in - x ; out - Y
  // (X'/Y' - X/Y)/ X/Y
  // cleanse input to BN
  const inputTokenAmountBN = BigNumber(inputTokenAmount);
  const inputTokenReserveQtyBN = BigNumber(inputTokenReserveQty);
  const outputTokenReserveQtyBN = BigNumber(outputTokenReserveQty);
  const slippagePercentBN = BigNumber(slippagePercent);

  const priceOfXinY = calculateExchangeRate(inputTokenReserveQtyBN, outputTokenReserveQtyBN);
  const YRecieved = calculateOutputAmount(inputTokenAmountBN, inputTokenReserveQtyBN, outputTokenReserveQtyBN, slippagePercentBN);
  const YDash = YRecieved.minus(outputTokenReserveQtyBN).absoluteValue();
  const XDash = inputTokenReserveQtyBN.plus(inputTokenAmount);
  const priceOfXDashInYDash = calculateExchangeRate(XDash, YDash);
  const difference = priceOfXDashInYDash.minus(priceOfXinY);
  const priceImpact = (difference).dividedBy(priceOfXinY).absoluteValue();
  return priceImpact;

}


module.exports = {calculateOutputAmount, calculateExchangeRate, calculatePriceImpact}

