const sdk = require("@elastic-dao/sdk");
const BigNumber = require("bignumber.js");
const {utils} = sdk;

// TODO: add support for negative scenarios
// TODO: refactor function params to take in alphabetically
// recommend passing in all numbers as string or BN instances so that BN constructor works properly

// calculates the decay (if any) - and returns the type and value of the decay
const calculateDecay = (quoteTokenReserveQty, alpha, baseTokenReserveQty, beta) => {
   // cleanse input:
   const quoteTokenReserveQtyBN = BigNumber(quoteTokenReserveQty);
   const baseTokenReserveQtyBN = BigNumber(baseTokenReserveQty);
   const alphaBN = BigNumber(alpha);
   const betaBN = BigNumber(beta);

   let decay = {
     type: "",
     value: "",
   }

   // handle error cases
   if(quoteTokenReserveQtyBN.isZero() || baseTokenReserveQtyBN.isZero()|| alphaBN.isZero() || betaBN.isZero() ) {
    throw new Error("Error:Empty pool");
  }

   if( !(betaBN.minus(baseTokenReserveQtyBN).isZero()) ){
     const betaDecayValue = betaBN.minus(baseTokenReserveQtyBN);
     decay.type = "betaDecay";
     decay.value = betaDecayValue;

   }
   else
    if(!(alphaBN.minus(quoteTokenReserveQtyBN).isZero())){
      const alphaDecayValue = alphaBN.minus(quoteTokenReserveQtyBN);
      decay.type = "alphaDecay";
      decay.value = alphaDecayValue;

    }
    else {
      decay.type = "noDecay"
      decay.value = BigNumber("0");
    }
    return decay;
};

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
const calculateLPTokenAmount = (inputQuoteTokenAmount, inputBaseTokenAmount, quoteTokenReserveQty, alpha, baseTokenReserveQty, beta, lpTokenReserveQty,  slippage) => {
  // cleanse input:
  const inputQuoteTokenAmountBN = BigNumber(inputQuoteTokenAmount);
  const inputBaseTokenAmountBN = BigNumber(inputBaseTokenAmount);
  const quoteTokenReserveQtyBN = BigNumber(quoteTokenReserveQty);
  const baseTokenReserveQtyBN = BigNumber(baseTokenReserveQty);
  const lpTokenReserveQtyBN = BigNumber(lpTokenReserveQty);
  //decay will be object need to clean its value key
  
  const slippageBN = BigNumber(slippage);

  const ZERO = BigNumber(0);


  // 3-LP situations: 
  // initial pool setup: deltaRo = sqrt(inputQuoteTokenAmount, inputBaseTokenAmount) 
  // open q : can we reach a state where only 1 side has liquidity - and how does that affect this
  if(quoteTokenReserveQtyBN.isEqualTo(ZERO) && baseTokenReserveQtyBN.isEqualTo(ZERO)){
    const deltaRo = inputQuoteTokenAmountBN.multipliedBy(baseTokenReserveQtyBN).sqrt();
    return deltaRo;
  }
  
  // non decay - Double Asset Entry: deltaRo = (ΔY/Y) * Ro = (inputBaseTokenAmount/baseTokenReserveQty) * lpTokenReserveQty
  

  // Presence of decay - 
  // call calculate and get back decay value and type
  // based on which gamma gets calculated

  // calculate gamma based on type of decay 


};


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


module.exports = {
  calculateOutputAmount,
  calculateExchangeRate, 
  calculatePriceImpact, 
  calculateDecay,
}

