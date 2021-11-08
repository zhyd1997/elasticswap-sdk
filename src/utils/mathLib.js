const sdk = require("@elastic-dao/sdk");
const BigNumber = require("bignumber.js");
const {utils} = sdk;

// TODO: add support for negative scenarios

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
  console.log("calcOutputAmount inputs:",inputTokenAmountBN.toString(), inputTokenReserveQtyBN.toString(), outputTokenReserveQtyBN.toString());

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
  
  console.log("calcoutput: outputBN: ", outputTokenAmountBN.toString())                              
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
  console.log("priceImpactfunc: ", inputTokenAmountBN.toString(), inputTokenReserveQtyBN.toString(), outputTokenReserveQtyBN.toString());

  const priceOfXinY = calculateExchangeRate(inputTokenReserveQtyBN, outputTokenReserveQtyBN);
  console.log("priceOfXinY:", priceOfXinY.toString());
  const YRecieved = calculateOutputAmount(inputTokenAmountBN, inputTokenReserveQtyBN, outputTokenReserveQtyBN, slippagePercentBN);
  console.log("Yreceived:", YRecieved.toString());
  const YDash = YRecieved.minus(outputTokenReserveQtyBN).absoluteValue();
  const XDash = inputTokenReserveQtyBN.plus(inputTokenAmount);
  console.log("XDash:", XDash.toString());
  console.log("YDash:", YDash.toString());
  const priceOfXDashInYDash = calculateExchangeRate(XDash, YDash);
  console.log("priceOfXDashInYDash:", priceOfXDashInYDash.toString());
  const difference = priceOfXDashInYDash.minus(priceOfXinY);
  console.log("diffrence:", difference.toString());
  const priceImpact = (difference).dividedBy(priceOfXinY).absoluteValue();
  return priceImpact;

}

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


module.exports = {calculateOutputAmount, calculateExchangeRate, calculatePriceImpact}

