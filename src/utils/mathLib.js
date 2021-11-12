const sdk = require("@elastic-dao/sdk");
const BigNumber = require("bignumber.js");
const {utils} = sdk;

// TODO: add support for negative scenarios
// TODO: refactor function params to take in alphabetically
// recommend passing in all numbers as string or BN instances so that BN constructor works properly

// calculates the decay (if any) - and returns the type and value of the decay
//                        Y                    α            X               β
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
   // BetaDecay (β^) = β-Y => beta - quoteTokenReserveQty
   if( !(betaBN.minus(quoteTokenReserveQtyBN).isZero()) ){
     const betaDecayValue = betaBN.minus(quoteTokenReserveQtyBN);
     decay.type = "betaDecay";
     decay.value = betaDecayValue;

   }
   else
    // AlphaDecay (α^) = α-X => alpha - baseTokenReserveQty
    if(!(alphaBN.minus(baseTokenReserveQtyBN).isZero())){
      const alphaDecayValue = alphaBN.minus(baseTokenReserveQtyBN);
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
  const alphaBN = BigNumber(alpha);
  const baseTokenReserveQtyBN = BigNumber(baseTokenReserveQty);
  const betaBN = Bignumber(beta);
  const lpTokenReserveQtyBN = BigNumber(lpTokenReserveQty);
  //decay will be object need to clean its value key
  
  const slippageBN = BigNumber(slippage);



  // 3-LP situations: 
  // initial pool setup: deltaRo = sqrt(inputQuoteTokenAmount, inputBaseTokenAmount) 
  // open q : can we reach a state where only 1 side has liquidity - and how does that affect this
  if(quoteTokenReserveQtyBN.isEqualTo(ZERO) && baseTokenReserveQtyBN.isEqualTo(ZERO)){
    const deltaRo = inputQuoteTokenAmountBN.multipliedBy(baseTokenReserveQtyBN).sqrt();
    return deltaRo;
  }
  
  // non decay - Double Asset Entry: deltaRo = (ΔY/Y) * Ro = (inputQuoteTokenAmount/quoteTokenReserveQty) * lpTokenReserveQty
  const decay = calculateDecay(quoteTokenReserveQtyBN, alphaBN, baseTokenReserveQtyBN, betaBN);
  if(decay.value.isZero()){
    const deltaRo = (inputQuoteTokenAmountBN.dividedBy(quoteTokenReserveQtyBN)).multipliedBy(lpTokenReserveQtyBN);
    return deltaRo; 
  }
  else 
    if( !(decay.value.isZero()) && decay.type === "betaDecay" ){
      // calculate gamma
    }
  

  // Presence of decay - 
  // call calculate and get back decay value and type
  // based on which gamma gets calculated

  // calculate gamma based on type of decay 


};


// gamma is different based on the type of decay prsent in the system
//                                   
const calculateGamma = (alpha, baseTokenReserveQty, beta, decay, inputBaseTokenAmount, inputQuoteTokenAmount, quoteTokenReserveQty) => {
  // cleanse input 
  const quoteTokenReserveQtyBN = BigNumber(quoteTokenReserveQty);
  const alphaBN = BigNumber(alpha);
  const baseTokenReserveQtyBN = BigNumber(baseTokenReserveQty);
  const betaBN = BigNumber(beta);
  const inputQuoteTokenAmountBN = BigNumber(inputQuoteTokenAmount);
  const inputBaseTokenAmountBN = BigNumber(inputBaseTokenAmount);

  // omega = X/Y => baseTokenReserve/ quoteTokenReserve
  const omega =  baseTokenReserveQtyBN.dividedBy(quoteTokenReserveQtyBN);

  let gamma;
  const decayType = decay.type;
  if(decayType === "betaDecay"){
    /* 
    When there is betaDecay
    # γ = ΔX / X / 2 * ( ΔX / β^ )
    # ΔX = α - X   - The max amount of baseTokens required to completely offset betaDecay(and by extension alphaDecay).
      (Provided by the user)
    # β^ = ΔX  / ω
    # Omega (ω) - X/Y - The ratio of the internal balance of baseToken to the internal balance of quoteToken
    */
   const deltaX =  alphaBN.minus(baseTokenReserveQtyBN);
   
   /*
   BetaDecay (β^) = β-Y -> The amount of Beta(β) not contributing to the liquidity,
   Due to an imbalance in the tokens caused by elastic supply (a rebase).
   */
   const betaDecay = decay.value;
   gamma = (deltaX.dividedBy(baseTokenReserveQtyBN.dividedBy(BigNumber(2)))).multipliedBy(deltaX.dividedBy(betaDecay))
   return gamma;
  }
  else
    if(decayType == "alphaDecay") {
      /* 
      When there is alphaDecay
      # γ= ΔY / Y / 2 * ( ΔX / α^ )
      # ΔY = α^ / ω   = The amount of quoteTokens required to completely offset alphaDecay.
      # AlphaDecay (α^) = α-X -> The amount of Alpha(α) not contributing to the liquidity, 
      # Due to an imbalance in the tokens caused by elastic supply (a rebase).
      # Omega (ω) - X/Y - The ratio of the internal balance of baseToken to the internal balance of quoteToken
      */
      const alphaDecay = decay.value;
      const deltaY = alphaDecay.dividedBy(omega);
      // deltaX - is this correct tho
      const deltaX = inputQuoteTokenAmountBN;
      gamma = (deltaY.dividedBy(quoteTokenReserveQtyBN.dividedBy(BigNumber(2)))).multipliedBy(deltaX.dividedBy(alphaDecay));
      return gamma;


    }
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

