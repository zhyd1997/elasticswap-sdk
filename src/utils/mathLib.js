const sdk = require("@elastic-dao/sdk");
const BigNumber = require("bignumber.js");
const {utils} = sdk;

const ZERO = BigNumber('0');

// let internalBalances = {
//   baseTokenReserveQty: ZERO,
//   quoteTokenReserveQty: ZERO,
//   kLast: ZERO

// };

// let TokenQtys = {
//   baseTokenQty: ZERO,
//   quoteTokenQty: ZERO,
//   liquidityTokenQty: ZERO,
//   liquidityTokenFeeQty: ZERO
// }

const BASIS_POINTS = Bignumber('1000');

/**
 * @dev defines the amount of decay needed in order for us to require a user to handle the
 * decay prior to a double asset entry as the equivalent of 1 unit of quote token
 * @param _baseTokenReserveQty current reserve qty of the baseToken
 * @param _internalBalances the internal balance Struct
 * internalBalances = {
 *  baseTokenReserveQty: ,
 *  quoteTokenReserveQty: ,
 *  kLast: 
 * }
 */
// todo: logic check on _internalbalances
const isSufficientDecayPresent = (_baseTokenReserveQty, _internalBalances) => {
  const baseTokenReserveQtyBN = BigNumber(_baseTokenReserveQty);
  const cleansedInternalBalances = internalBalancesBNCleaner(_internalBalances);
  
  const baseTokenReserveDifference = baseTokenReserveQtyBN.minus(cleansedInternalBalances.baseTokenReserveQty);
  const internalBalanceRatio = (cleansedInternalBalances.baseTokenReserveQty).dividedBy(cleansedInternalBalances.quoteTokenReserveQty);

  const decayPresentComparison = (baseTokenReserveDifference).dividedBy(internalBalanceRatio).isGreaterThan(BigNumber('1'));

  return decayPresentComparison;
}

 /**
 * @dev used to calculate the qty of token a liquidity provider
 * must add in order to maintain the current reserve ratios
 * @param _tokenAQty base or quote token qty to be supplied by the liquidity provider
 * @param _tokenAReserveQty current reserve qty of the base or quote token (same token as tokenA)
 * @param _tokenBReserveQty current reserve qty of the other base or quote token (not tokenA)
 */
const calculateQty = (_tokenAQty, _tokenAReserveQty, _tokenBReserveQty) => {
  // cleanse input 
  const tokenAQtyBN = BigNumber(_tokenAQty);
  const tokenAReserveQtyBN = BigNumber(_tokenAReserveQty);
  const tokenBReserveQtyBN = BigNumber(_tokenBReserveQty);

  if(tokenAQtyBN.isLessThanOrEqualTo(BigNumber(0)) ){
  throw new Error( "MathLib: INSUFFICIENT_QTY");
  }
  if(tokenAReserveQtyBN.isLessThanOrEqualTo(BigNumber(0)) || tokenBReserveQtyBN.isLessThanOrEqualTo(BigNumber(0))){
  throw new Error( "MathLib: INSUFFICIENT_LIQUIDITY");
  }
  const qty = tokenAQtyBN.multipliedBy(tokenBReserveQtyBN).dividedBy(tokenAReserveQtyBN);
  return qty;

};

 /**
 * @dev used to calculate the qty of token a trader will receive (less fees)
 * given the qty of token A they are providing
 * @param _tokenASwapQty base or quote token qty to be swapped by the trader
 * @param _tokenAReserveQty current reserve qty of the base or quote token (same token as tokenA)
 * @param _tokenBReserveQty current reserve qty of the other base or quote token (not tokenA)
 * @param _liquidityFeeInBasisPoints fee to liquidity providers represented in basis points
 */
const calculateQtyToReturnAfterFees = (
  _tokenASwapQty,
  _tokenAReserveQty,
  _tokenBReserveQty,
  _liquidityFeeInBasisPoints ) => {
  
  // cleanse inputs
  const tokenASwapQtyBN = BigNumber(_tokenASwapQty);
  const tokenAReserveQtyBN = BigNumber(_tokenAReserveQty);
  const tokenBReserveQtyBN = BigNumber(_tokenBReserveQty);
  const liquidityFeeInBasisPointsBN = BigNumber(_liquidityFeeInBasisPoints);

  const tokenASwapQtyLessFee = tokenASwapQtyBN.multipliedBy(BASIS_POINTS.multipliedBy(liquidityFeeInBasisPointsBN));
  
  const numerator = tokenASwapQtyBN.multipliedBy(tokenBReserveQtyBN);
  const denominator = (tokenAReserveQtyBN.multipliedBy(BASIS_POINTS)).plus(tokenASwapQtyLessFee);

  const qtyToReturn = (numerator).dividedBy(denominator);

  return qtyToReturn;

}; 

/**
 * @dev used to calculate the qty of liquidity tokens (deltaRo) we will be issued to a supplier
 * of a single asset entry when decay is present.
 * @param _totalSupplyOfLiquidityTokens the total supply of our exchange's liquidity tokens (aka Ro)
 * @param _tokenQtyAToAdd the amount of tokens being added by the caller to remove the current decay
 * @param _internalTokenAReserveQty the internal balance (X or Y) of token A as a result of this transaction
 * @param _tokenBDecayChange the change that will occur in the decay in the opposite token as a result of
 * this transaction
 * @param _tokenBDecay the amount of decay in tokenB
 *
 * @return liquidityTokenQty qty of liquidity tokens to be issued in exchange
 */
const calculateLiquidityTokenQtyForSingleAssetEntry = (
  _totalSupplyOfLiquidityTokens,
  _tokenQtyAToAdd,
  _internalTokenAReserveQty,
  _tokenBDecayChange,
  _tokenBDecay ) => {
  // cleanse input to BN
  const totalSupplyOfLiquidityTokensBN = BigNumber(_totalSupplyOfLiquidityTokens);
  const tokenQtyAToAddBN = BigNumber(_tokenQtyAToAdd);
  const internalTokenAReserveQtyBN = BigNumber(_internalTokenAReserveQty);
  const tokenBDecayChangeBN = BigNumber(_tokenBDecayChange);
  const tokenBDecayBN = BigNumber(_tokenBDecay);

  /*
  
  # gamma = deltaY / Y' / 2 * (deltaX / alphaDecay')
  
              deltaY  *   deltaX * 2
  # gamma =  ------------------------ 
                Y'    *   alphaDecay'

  */
  const deltaY = tokenQtyAToAddBN;
  const YDash = internalTokenAReserveQtyBN;
  const deltaX = tokenBDecayChangeBN;
  const alphaDecayDash = tokenBDecayBN;

  const gammaNumerator = deltaY.multipliedBy(deltaX).multipliedBy(BigNumber(2));
  const gammaDenominator = YDash.multipliedBy(alphaDecayDash);
  
  const gamma = gammaNumerator.dividedBy(gammaDenominator);

  /*

  # liquidityTokens - Ro
  # ΔRo = (Ro/(1 - γ)) * γ

  # deltaRo =  totalSupplyOfLiquidityTokens  * gamma
              ------------------------------------------
                  ( 1 - gamma )

  */
  const deltaRo = (totalSupplyOfLiquidityTokens.multipliedBy(gamma)).dividedBy(BigNumber(1).minus(gamma));
  return deltaRo;

}

/**
 * @dev used to calculate the qty of liquidity tokens (deltaRo) we will be issued to a supplier
 * of a single asset entry when decay is present.
 * @param _totalSupplyOfLiquidityTokens the total supply of our exchange's liquidity tokens (aka Ro)
 * @param _quoteTokenQty the amount of quote token the user it adding to the pool (deltaB or deltaY)
 * @param _quoteTokenReserveBalance the total balance (external) of quote tokens in our pool (Beta)
 *
 * @return liquidityTokenQty qty of liquidity tokens to be issued in exchange
 */
const calculateLiquidityTokenQtyForDoubleAssetEntry = (
  _totalSupplyOfLiquidityTokens,
  _quoteTokenQty,
  _quoteTokenReserveBalance ) => {
  // cleanse the input 
  const totalSupplyOfLiquidityTokensBN = BigNumber(_totalSupplyOfLiquidityTokens);
  const quoteTokenQtyBN = BigNumber(_quoteTokenQty);
  const quoteTokenReserveBalanceBN = BigNumber(_quoteTokenReserveBalance);

  /*

  # liquidityTokens - Ro
  # ΔRo =  (ΔY/Y) * Ro

  # deltaRo =  _quoteTokenQty  * _totalSupplyOfLiquidityTokens
              ------------------------------------------
                  _quoteTokenReserveBalance

  */
  const deltaRo = (quoteTokenQtyBN.multipliedBy(totalSupplyOfLiquidityTokensBN)).dividedBy(quoteTokenReserveBalanceBN);
  return deltaRo;

}

/**
 * @dev used to calculate the qty of quote token required and liquidity tokens (deltaRo) to be issued
 * in order to add liquidity and remove base token decay.
 * @param _quoteTokenQtyDesired the amount of quote token the user wants to contribute
 * @param _quoteTokenQtyMin the minimum amount of quote token the user wants to contribute (allows for slippage)
 * @param _baseTokenReserveQty the external base token reserve qty prior to this transaction
 * @param _totalSupplyOfLiquidityTokens the total supply of our exchange's liquidity tokens (aka Ro)
 * @param _internalBalances internal balances struct from our exchange's internal accounting
 *
 *
 * @return quoteTokenQty qty of quote token the user must supply
 * @return liquidityTokenQty qty of liquidity tokens to be issued in exchange
 */
const calculateAddQuoteTokenLiquidityQuantities = (
  _quoteTokenQtyDesired,
  _quoteTokenQtyMin,
  _baseTokenReserveQty,
  _totalSupplyOfLiquidityTokens,
  _internalBalances ) => {
  
  // cleanse input
  const quoteTokenQtyDesiredBN = BigNumber(_quoteTokenQtyDesired);
  const quoteTokenQtyMinBN = BigNumber(_quoteTokenQtyMin);
  const baseTokenReserveQtyBN = BigNumber(_baseTokenReserveQty);
  const totalSupplyOfLiquidityTokensBN = BigNumber(_totalSupplyOfLiquidityTokens);
  const cleansedInternalBalances = internalBalancesBNCleaner(_internalBalances);

  const baseTokenDecay = baseTokenReserveQtyBN.minus(cleansedInternalBalances.baseTokenReserveQty);

  // omega
  const internalBaseTokenToQuoteTokenRatio = cleansedInternalBalances.baseTokenReserveQty.dividedBy(quoteTokenReserveQty);

  // alphaDecay / omega (A/B)
  const maxQuoteTokenQty = baseTokenDecay.dividedBy(internalBaseTokenToQuoteTokenRatio);

  if(quoteTokenQtyMinBN.isGreaterThanOrEqualTo(maxQuoteTokenQty)){
      throw new Error("MathLib: INSUFFICIENT_DECAY");
  }

  // deltaBeta
  let quoteTokenQty;
  if (quoteTokenQtyDesiredBN > maxQuoteTokenQty) {
    quoteTokenQty = maxQuoteTokenQty;
  } else {
    quoteTokenQty = quoteTokenQtyDesiredBN;
  }

  const baseTokenQtyDecayChange = quoteTokenQty.multipliedBy(internalBaseTokenToQuoteTokenRatio);

  if(baseTokenQtyDecayChange.isLessThanOrEqualTo(BigNumber(0))){
      throw new Error("MathLib: INSUFFICIENT_DECAY");
  }
  // x += alphaDecayChange
  // y += deltaBeta

  // doubt: not required as this is a lib?
  cleansedInternalBalances.baseTokenReserveQty = cleansedInternalBalances.baseTokenReserveQty.plus(baseTokenQtyDecayChange);
  cleansedInternalBalances.quoteTokenReserveQty = cleansedInternalBalances.quoteTokenReserveQty.plus(quoteTokenQty);

  const liquidityTokenQty = calculateLiquidityTokenQtyForSingleAssetEntry(
    totalSupplyOfLiquidityTokensBN, 
    quoteTokenQty, 
    cleansedInternalBalances.quoteTokenReserveQty, 
    baseTokenQtyDecayChange, 
    baseTokenDecay );

  return {quoteTokenQty, liquidityTokenQty};


    

};

/**
 * @dev used to calculate the qty of base tokens required and liquidity tokens (deltaRo) to be issued
 * in order to add liquidity and remove base token decay.
 * @param _baseTokenQtyDesired the amount of base token the user wants to contribute
 * @param _baseTokenQtyMin the minimum amount of base token the user wants to contribute (allows for slippage)
 * @param _baseTokenReserveQty the external base token reserve qty prior to this transaction
 * @param _totalSupplyOfLiquidityTokens the total supply of our exchange's liquidity tokens (aka Ro)
 * @param _internalBalances internal balances struct from our exchange's internal accounting
 *
 * @return baseTokenQty qty of base token the user must supply
 * @return liquidityTokenQty qty of liquidity tokens to be issued in exchange
 */
const calculateAddBaseTokenLiquidityQuantities = (
  _baseTokenQtyDesired,
  _baseTokenQtyMin,
  _baseTokenReserveQty,
  _totalSupplyOfLiquidityTokens,
  _internalBalances
) => {

  // cleanse input 
  const baseTokenQtyDesiredBN = BigNumber(_baseTokenQtyDesiredBN);
  const baseTokenQtyMinBN = BigNumber(_baseTokenQtyMin);
  const baseTokenReserveQtyBN = BigNumber(_baseTokenReserveQty);
  const totalSupplyOfLiquidityTokensBN = BigNumber(_totalSupplyOfLiquidityTokens);
  const internalBalances = internalBalancesBNCleaner(_internalBalances);

  const maxBaseTokenQty = internalBalances.baseTokenReserveQty.minus(baseTokenReserveQtyBN);
  if(baseTokenQtyMinBN.isGreaterThanOrEqualTo(maxBaseTokenQty)){
    throw new Error("MathLib: INSUFFICIENT_DECAY");
  }

  let baseTokenQty;
  if(baseTokenQtyDesiredBN.isGreaterThan()){
    baseTokenQty = maxBaseTokenQty;
  } 
  else{
    baseTokenQty = baseTokenQtyDesiredBN;
  }

  // determine the quote token qty decay change quoted on our current ratios
  const internalQuoteToBaseTokenRatio = (internalBalances.quoteTokenReserveQty).dividedBy(internalBalances.baseTokenReserveQty);

  // NOTE we need this function to use the same
  // rounding scheme as wDiv in order to avoid a case
  // in which a user is trying to resolve decay in which
  // quoteTokenQtyDecayChange ends up being 0 and we are stuck in
  // a bad state.

  const quoteTokenQtyDecayChange = baseTokenQty.multipliedBy(internalQuoteToBaseTokenRatio);

  if(quoteTokenQtyDecayChange.isLessThanOrEqualTo(BigNumber(0))){
    throw new Error( "MathLib: INSUFFICIENT_CHANGE_IN_DECAY");
  }

  const quoteTokenDecay = maxBaseTokenQty.multipliedBy(internalQuoteToBaseTokenRatio);

  if(quoteTokenDecay.isLessThanOrEqualTo(BigNumber(0))){
    throw new Error( "MathLib: NO_QUOTE_DECAY");
  }
  // we are not changing anything about our internal accounting here. We are simply adding tokens
  // to make our internal account "right"...or rather getting the external balances to match our internal
  // quoteTokenReserveQty += quoteTokenQtyDecayChange;
  // baseTokenReserveQty += baseTokenQty;

  const liquidityTokenQty = calculateLiquidityTokenQtyForSingleAssetEntry(
    totalSupplyOfLiquidityTokensBN,
    baseTokenQty,
    internalBalances.baseTokenReserveQty,
    quoteTokenQtyDecayChange,
    quoteTokenQtyDecayChange
  );
  
  return {
    baseTokenQty,
    liquidityTokenQty
  }

};  

/**
 * @dev used to calculate the qty of tokens a user will need to contribute and be issued in order to add liquidity
 * @param _baseTokenQtyDesired the amount of base token the user wants to contribute
 * @param _quoteTokenQtyDesired the amount of quote token the user wants to contribute
 * @param _baseTokenQtyMin the minimum amount of base token the user wants to contribute (allows for slippage)
 * @param _quoteTokenQtyMin the minimum amount of quote token the user wants to contribute (allows for slippage)
 * @param _baseTokenReserveQty the external base token reserve qty prior to this transaction
 * @param _quoteTokenReserveQty the external quote token reserve qty prior to this transaction
 * @param _totalSupplyOfLiquidityTokens the total supply of our exchange's liquidity tokens (aka Ro)
 * @param _internalBalances internal balances struct from our exchange's internal accounting
 *
 * @return tokenQtys qty of tokens needed to complete transaction 
 */
  // calculateAddLiquidityQuantities
 










// helper function
const internalBalancesBNCleaner = (_internalBalances) => {
  _internalBalances.baseTokenReserveQty = BigNumber( _internalBalances.baseTokenReserveQty);
  _internalBalances.quoteTokenReserveQty = BigNumber(_internalBalances.quoteTokenReserveQty);
  _internalBalances.kLast = BigNumber( _internalBalances.kLast);

  return _internalBalances;

}
// const objectBNCleaner = (objectToBeCleaned) => {
//   return Object.keys(objectToBeCleaned).map((key) => {
//     let cleanedObj = {};
//     cleanedObj[key] = BigNumber(key);
//     return cleanedObj;
//   })
// }






























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

