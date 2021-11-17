const sdk = require("@elastic-dao/sdk");
const BigNumber = require("bignumber.js");
const {ROUND_DOWN} = require("bignumber.js")
const {utils} = sdk;

const ZERO = BigNumber('0');
const WAD = BigNumber("1000000000000000000");
const INSUFFICIENT_BASE_QTY = new Error("MathLib: INSUFFICIENT_BASE_QTY");
const INSUFFICIENT_BASE_TOKEN_QTY = new Error( "MathLib: INSUFFICIENT_BASE_TOKEN_QTY");
const INSUFFICIENT_BASE_QTY_DESIRED = new Error("MathLib: INSUFFICIENT_BASE_QTY_DESIRED");
const INSUFFICIENT_CHANGE_IN_DECAY = new Error( "MathLib: INSUFFICIENT_CHANGE_IN_DECAY");
const INSUFFICIENT_DECAY = new Error("MathLib: INSUFFICIENT_DECAY");
const INSUFFICIENT_LIQUIDITY = new Error("MathLib: INSUFFICIENT_LIQUIDITY");
const INSUFFICIENT_QTY = new Error("MathLib: INSUFFICIENT_QTY");
const INSUFFICIENT_QUOTE_QTY = new Error("MathLib: INSUFFICIENT_QUOTE_QTY");
const INSUFFICIENT_QUOTE_QTY_DESIRED = new Error("MathLib: INSUFFICIENT_QUOTE_QTY_DESIRED");
const INSUFFICIENT_QUOTE_TOKEN_QTY = new Error( "MathLib: INSUFFICIENT_QUOTE_TOKEN_QTY");
const INSUFFICIENT_TOKEN_QTY = new Error("MathLib: INSUFFICIENT_TOKEN_QTY");
const NO_QUOTE_DECAY = new Error( "MathLib: NO_QUOTE_DECAY");

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

const BASIS_POINTS = BigNumber('10000');


/**
 * @dev used to calculate the qty of base tokens required and liquidity tokens (deltaRo) to be issued
 * in order to add liquidity and remove base token decay.
 * @param _baseTokenQtyDesired the amount of base token the user wants to contribute
 * @param _baseTokenQtyMin the minimum amount of base token the user wants to contribute (allows for slippage)
 * @param _baseTokenReserveQty the external base token reserve qty prior to this transaction
 * @param _totalSupplyOfLiquidityTokens the total supply of our exchange's liquidity tokens (aka Ro)
 * @param _internalBalances internal balances struct from our exchange's internal accounting
 *
 * @return {baseTokenQty, liquidityTokenQty}
 * baseTokenQty - qty of base token the user must supply
 * liquidityTokenQty - qty of liquidity tokens to be issued in exchange
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
    throw INSUFFICIENT_DECAY;
  }

  let baseTokenQty;
  if(baseTokenQtyDesiredBN.isGreaterThan(maxBaseTokenQty)){
    baseTokenQty = maxBaseTokenQty;
  } 
  else{
    baseTokenQty = baseTokenQtyDesiredBN;
  }

  // determine the quote token qty decay change quoted on our current ratios
  const internalQuoteToBaseTokenRatio = (internalBalances.quoteTokenReserveQty).dividedBy(internalBalances.baseTokenReserveQty);


  const quoteTokenQtyDecayChange = baseTokenQty.multipliedBy(internalQuoteToBaseTokenRatio);

  if(quoteTokenQtyDecayChange.isLessThanOrEqualTo(ZERO)){
    throw INSUFFICIENT_CHANGE_IN_DECAY;
  }

  // we can now calculate the total amount of quote token decay
  const quoteTokenDecay = maxBaseTokenQty.multipliedBy(internalQuoteToBaseTokenRatio);

  if(quoteTokenDecay.isLessThanOrEqualTo(ZERO)){
    throw NO_QUOTE_DECAY;
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
    quoteTokenDecay
  );

  const baseAndLiquidityTokenQty = {
    baseTokenQty : baseTokenQty, 
    liquidityTokenQty : liquidityTokenQty
  };
  
  return baseAndLiquidityTokenQty;
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
 * @return tokenQtys = {baseTokenQty, quoteTokenQty, liquidityTokenQty} - qty of tokens needed to complete transaction 
 */
 const calculateAddLiquidityQuantities = (
  _baseTokenQtyDesired,
  _quoteTokenQtyDesired,
  _baseTokenQtyMin,
  _quoteTokenQtyMin,
  _baseTokenReserveQty,
  _quoteTokenReserveQty,
  _totalSupplyOfLiquidityTokens,
  _internalBalances
) => {

  // cleanse input
  const baseTokenQtyDesiredBN = BigNumber(_baseTokenQtyDesired);
  const quoteTokenQtyDesiredBN = BigNumber(_quoteTokenQtyDesired);
  const baseTokenQtyMinBN = BigNumber(_baseTokenQtyMin);
  const quoteTokenQtyMinBN = BigNumber(_quoteTokenQtyMin);
  const baseTokenReserveQtyBN = BigNumber(_baseTokenReserveQty);
  const quoteTokenReserveQtyBN = BigNumber(_quoteTokenReserveQty);
  const totalSupplyOfLiquidityTokensBN = BigNumber(_totalSupplyOfLiquidityTokens);
  const internalBalances = internalBalancesBNCleaner(_internalBalances);

  if(totalSupplyOfLiquidityTokensBN.isGreaterThan(ZERO)){
    let tokenQtys = {
      baseTokenQty: ZERO,
      quoteTokenQty: ZERO,
      liquidityTokenQty: ZERO,
      liquidityTokenFeeQty: ZERO
    };

    // we have outstanding liquidity tokens present and an existing price curve
    tokenQtys.liquidityTokenFeeQty = calculateLiquidityTokenFees(
      totalSupplyOfLiquidityTokensBN,
      internalBalances
    );

    // we need to take this amount (that will be minted) into account for below calculations
    totalSupplyOfLiquidityTokensBN = (tokenQtys.liquidityTokenFeeQty).plus(totalSupplyOfLiquidityTokensBN);
    
    // confirm that we have no beta or alpha decay present
    // if we do, we need to resolve that first
    if( isSufficientDecayPresent( baseTokenReserveQtyBN, internalBalances) ) {
      // decay is present and needs to be dealt with by the caller.

      let baseTokenQtyFromDecay;
      let quoteTokenQtyFromDecay;
      let liquidityTokenQtyFromDecay;
      
      if( baseTokenReserveQtyBN.isGreaterThan(internalBalances.baseTokenReserveQty)){
        // we have more base token than expected (base token decay) due to rebase up
        // we first need to handle this situation by requiring this user
        // to add quote tokens
        const fetchCalculateAddQuoteTokenLiquidityQuantities = calculateAddQuoteTokenLiquidityQuantities(
          quoteTokenQtyDesiredBN,
          ZERO,
          baseTokenReserveQtyBN,
          totalSupplyOfLiquidityTokensBN,
          internalBalances
        );
        
        quoteTokenQtyFromDecay = fetchCalculateAddQuoteTokenLiquidityQuantities.quoteTokenQty;
        liquidityTokenQtyFromDecay = fetchCalculateAddQuoteTokenLiquidityQuantities. liquidityTokenQty;

      } else {
        // we have less base token than expected (quote token decay) due to a rebase down
        // we first need to handle this by adding base tokens to offset this.

        const fetchCalculateAddBaseTokenLiquidityQuantities = calculateAddBaseTokenLiquidityQuantities(
          baseTokenQtyDesiredBN,
          ZERO,
          baseTokenReserveQtyBN,
          totalSupplyOfLiquidityTokensBN,
          internalBalances
        );
        
        // {baseTokenQty, liquidityTokenQty}
        baseTokenQtyFromDecay = fetchCalculateAddBaseTokenLiquidityQuantities.baseTokenQty;
        liquidityTokenQtyFromDecay = fetchCalculateAddBaseTokenLiquidityQuantities.liquidityTokenQty;
      }

      if( quoteTokenQtyFromDecay.isLessThan(quoteTokenQtyDesiredBN) && baseTokenQtyFromDecay.isLessThan(baseTokenQtyDesiredBN) ){
        // the user still has qty that they desire to contribute to the exchange for liquidity

        const fetchTokenQty = calculateAddTokenPairLiquidityQuantities(
          baseTokenQtyDesiredBN.minus(baseTokenQtyFromDecay),
          quoteTokenQtyDesiredBN.minus(quoteTokenQtyFromDecay),
          ZERO,
          ZERO,
          quoteTokenReserveQtyBN.plus(quoteTokenQtyFromDecay),
          totalSupplyOfLiquidityTokensBN.plus(liquidityTokenQtyFromDecay),
          internalBalances
        );

        tokenQtys.baseTokenQty = fetchTokenQty.baseTokenQty;
        tokenQtys.quoteTokenQty = fetchTokenQty.quoteTokenQty;
        tokenQtys.liquidityTokenQty = fetchTokenQty.liquidityTokenQty;

        tokenQtys.baseTokenQty = (tokenQtys.baseTokenQty).plus(baseTokenQtyFromDecay);
        tokenQtys.quoteTokenQty = (tokenQtys.quoteTokenQty).plus(quoteTokenQtyFromDecay);
        tokenQtys.liquidityTokenQty = (tokenQtys.liquidityTokenQty).plus(liquidityTokenQtyFromDecay);

        if((tokenQtys.baseTokenQty).isLessThan(baseTokenQtyMinBN)){
          throw INSUFFICIENT_BASE_QTY;
        }
        if((tokenQtys.quoteTokenQty).isLessThan(quoteTokenQtyMinBN)){
          throw INSUFFICIENT_QUOTE_QTY;
        }
        

      }
       

    } else {
      const fetchTokenQtys = calculateAddTokenPairLiquidityQuantities(
        baseTokenQtyDesiredBN,
        quoteTokenQtyDesiredBN,
        baseTokenQtyMinBN,
        quoteTokenQtyMinBN,
        quoteTokenReserveQtyBN,
        totalSupplyOfLiquidityTokensBN,
        internalBalances
      );
      tokenQtys.baseTokenQty = fetchTokenQtys.baseTokenQty;
      tokenQtys.quoteTokenQty = fetchTokenQtys.quoteTokenQty;
      tokenQtys.liquidityTokenQty = fetchTokenQtys.liquidityTokenQty;
    }

  } else {
    // this user will set the initial pricing curve
    if(baseTokenQtyDesiredBN.isLessThanOrEqualTo(ZERO)){
      throw INSUFFICIENT_BASE_QTY_DESIRED;
    }
    if(quoteTokenQtyDesiredBN.isLessThanOrEqualTo(ZERO)){
      throw INSUFFICIENT_QUOTE_QTY_DESIRED;
    }

    tokenQtys.baseTokenQty = baseTokenQtyDesiredBN;
    tokenQtys.quoteTokenQty = quoteTokenQtyDesiredBN;
    tokenQtys.liquidityTokenQty = (baseTokenQtyDesiredBN.multipliedBy(quoteTokenQtyDesiredBN)).sqrt();

    internalBalances.baseTokenReserveQty = internalBalances.baseTokenReserveQty.plus(tokenQtys.baseTokenQty);
    internalBalances.quoteTokenReserveQty = internalBalances.quoteTokenReserveQty.plus(tokenQtys.quoteTokenQty);
  }

 };

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
 * @returns {quoteTokenQty, liquidityTokenQty}
 * quoteTokenQty - qty of quote token the user must supply
 * liquidityTokenQty -  qty of liquidity tokens to be issued in exchange
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
  const internalBalances = internalBalancesBNCleaner(_internalBalances);

  const baseTokenDecay = baseTokenReserveQtyBN.minus(internalBalances.baseTokenReserveQty);

  // omega - X/Y
  const internalBaseTokenToQuoteTokenRatio = internalBalances.baseTokenReserveQty.dividedBy(quoteTokenReserveQty);

  // alphaDecay / omega (A/B)
  const maxQuoteTokenQty = baseTokenDecay.dividedBy(internalBaseTokenToQuoteTokenRatio);

  if(quoteTokenQtyMinBN.isGreaterThanOrEqualTo(maxQuoteTokenQty)){
      throw INSUFFICIENT_DECAY;
  }

  // deltaBeta
  let quoteTokenQty;
  if (quoteTokenQtyDesiredBN > maxQuoteTokenQty) {
    quoteTokenQty = maxQuoteTokenQty;
  } else {
    quoteTokenQty = quoteTokenQtyDesiredBN;
  }

  const baseTokenQtyDecayChange = quoteTokenQty.multipliedBy(internalBaseTokenToQuoteTokenRatio);

  if(baseTokenQtyDecayChange.isLessThanOrEqualTo(ZERO)){
      throw INSUFFICIENT_DECAY;
  }
  // x += alphaDecayChange
  // y += deltaBeta

  // doubt: not required as this is a lib?
  internalBalances.baseTokenReserveQty = internalBalances.baseTokenReserveQty.plus(baseTokenQtyDecayChange);
  internalBalances.quoteTokenReserveQty = internalBalances.quoteTokenReserveQty.plus(quoteTokenQty);

  const liquidityTokenQty = calculateLiquidityTokenQtyForSingleAssetEntry(
    totalSupplyOfLiquidityTokensBN, 
    quoteTokenQty, 
    internalBalances.quoteTokenReserveQty, 
    baseTokenQtyDecayChange, 
    baseTokenDecay );

  const quoteAndLiquidityTokenQty  = {
    quoteTokenQty: quoteTokenQty, 
    liquidityTokenQty : liquidityTokenQty
  };
    

  return quoteAndLiquidityTokenQty;


    

};

/**
 * @dev calculates the qty of base and quote tokens required and liquidity tokens (deltaRo) to be issued
 * in order to add liquidity when no decay is present.
 * @param _baseTokenQtyDesired the amount of base token the user wants to contribute
 * @param _quoteTokenQtyDesired the amount of quote token the user wants to contribute
 * @param _baseTokenQtyMin the minimum amount of base token the user wants to contribute (allows for slippage)
 * @param _quoteTokenQtyMin the minimum amount of quote token the user wants to contribute (allows for slippage)
 * @param _quoteTokenReserveQty the external quote token reserve qty prior to this transaction
 * @param _totalSupplyOfLiquidityTokens the total supply of our exchange's liquidity tokens (aka Ro)
 * @param _internalBalances internal balances struct from our exchange's internal accounting
 *
 * @return baseTokenQty qty of base token the user must supply
 * @return quoteTokenQty qty of quote token the user must supply
 * @return liquidityTokenQty qty of liquidity tokens to be issued in exchange
 */
 const calculateAddTokenPairLiquidityQuantities = (
  _baseTokenQtyDesired,
  _quoteTokenQtyDesired,
  _baseTokenQtyMin,
  _quoteTokenQtyMin,
  _quoteTokenReserveQty,
  _totalSupplyOfLiquidityTokens,
  _internalBalances
) => {
  // cleanse input
  const baseTokenQtyDesiredBN = BigNumber(_baseTokenQtyDesired);
  const quoteTokenQtyDesiredBN = BigNumber(_quoteTokenQtyDesired);
  const baseTokenQtyMinBN = BigNumber(_baseTokenQtyMin);
  const quoteTokenQtyMinBN = BigNumber(_quoteTokenQtyMin);
  const quoteTokenReserveQtyBN = BigNumber(_quoteTokenReserveQty);
  const totalSupplyOfLiquidityTokensBN = BigNumber(_totalSupplyOfLiquidityTokens);
  const internalBalances = internalBalancesBNCleaner(_internalBalances);

  let baseTokenQty;
  let quoteTokenQty;
  let liquidityTokenQty;

  const requiredQuoteTokenQty = calculateQty(baseTokenQtyDesiredBN, internalBalances.baseTokenReserveQty, internalBalances.quoteTokenReserveQty);

  if(requiredQuoteTokenQty.isLessThanOrEqualTo(quoteTokenQtyDesiredBN)){
    // user has to provide less than their desired amount
    if(requiredQuoteTokenQty.isLessThan(quoteTokenQtyMinBN)){
      throw INSUFFICIENT_QUOTE_QTY;
    }
    baseTokenQty = baseTokenQtyDesiredBN;
    quoteTokenQty = requiredQuoteTokenQty;

  } else {

    // we need to check the opposite way.
    const requiredBaseTokenQty = calculateQty(quoteTokenQtyDesiredBN, internalBalances.quoteTokenReserveQty, internalBalances.baseTokenReserveQty);
    if(requiredBaseTokenQty.isLessThan(baseTokenQtyMinBN)){
      throw INSUFFICIENT_BASE_QTY;
    }
    baseTokenQty = requiredBaseTokenQty;
    quoteTokenQty = quoteTokenQtyDesiredBN;

  }

  liquidityTokenQty = calculateLiquidityTokenQtyForDoubleAssetEntry(totalSupplyOfLiquidityTokensBN, quoteTokenQty, quoteTokenReserveQtyBN);

  internalBalances.baseTokenReserveQty = baseTokenQty.plus(internalBalances.baseTokenReserveQty);
  internalBalances.quoteTokenReserveQty = quoteTokenQty.plus(internalBalances.quoteTokenReserveQty);

  const baseQuoteLiquidityTokenQty = {
    baseTokenQty: baseTokenQty,
    quoteTokenQty: quoteTokenQty,
    liquidityTokenQty: liquidityTokenQty
  }

  return baseQuoteLiquidityTokenQty;
};

 /**
   * @dev calculates the qty of base tokens a user will receive for swapping their quote tokens (less fees)
   * @param _quoteTokenQty the amount of quote tokens the user wants to swap
   * @param _baseTokenQtyMin the minimum about of base tokens they are willing to receive in return (slippage)
   * @param _baseTokenReserveQty the external base token reserve qty prior to this transaction
   * @param _liquidityFeeInBasisPoints the current total liquidity fee represented as an integer of basis points
   * @param _internalBalances internal balances struct from our exchange's internal accounting
   *
   * @return baseTokenQty qty of base token the user will receive back
   */
  const calculateBaseTokenQty = (
    _quoteTokenQty,
    _baseTokenQtyMin,
    _baseTokenReserveQty,
    _liquidityFeeInBasisPoints,
    _internalBalances
  ) => {
    // cleanse inputs
    const quoteTokenQtyBN = BigNumber(_quoteTokenQty);
    const baseTokenQtyMinBN = BigNumber(_baseTokenQtyMin);
    const baseTokenReserveQtyBN = BigNumber(_baseTokenReserveQty);
    const liquidityFeeInBasisPointsBN = BigNumber(_liquidityFeeInBasisPoints);
    const internalBalances = internalBalancesBNCleaner(_internalBalances);

    let baseTokenQty = ZERO;

    if(baseTokenReserveQtyBN.isLessThan(ZERO) && (internalBalances.baseTokenReserveQty).isLessThan(ZERO)){
      throw INSUFFICIENT_BASE_TOKEN_QTY;
    }

    // check to see if we have experienced quote token Decay / a rebase down event
    if( baseTokenReserveQtyBN.isLessThan(internalBalances.baseTokenReserveQty) ) {
      // we have less reserves than our current price curve will expect, we need to adjust the curve
      const pricingRatio = (internalBalances.baseTokenReserveQty).dividedBy(internalBalances.quoteTokenReserveQty);
      //    ^ is Omega

      const impliedQuoteTokenQty = baseTokenReserveQtyBN.dividedBy(pricingRatio);
      baseTokenQty = calculateQtyToReturnAfterFees(quoteTokenQtyBN, impliedQuoteTokenQty, baseTokenReserveQtyBN, liquidityFeeInBasisPointsBN);
      
    } else {
      // we have the same or more reserves, no need to alter the curve.
      baseTokenQty = calculateQtyToReturnAfterFees(
        quoteTokenQtyBN, 
        internalBalances.quoteTokenReserveQty,
        internalBalances.baseTokenReserveQty,
        liquidityFeeInBasisPointsBN 
        );
    };

    if( baseTokenQty.isLessThanOrEqualTo(baseTokenQtyMinBN)) {
      throw INSUFFICIENT_BASE_TOKEN_QTY;
    }
    internalBalances.baseTokenReserveQty = internalBalances.baseTokenReserveQty.minus(baseTokenQty);
    internalBalances.quoteTokenReserveQty = internalBalances.quoteTokenReserveQty.plus(quoteTokenQtyBN);


    return baseTokenQty;

  };

/**
 * @dev calculates the qty of liquidity tokens that should be sent to the DAO due to the growth in K from trading.
 * The DAO takes 1/6 of the total fees (30BP total fee, 25 BP to lps and 5 BP to the DAO)
 * @param _totalSupplyOfLiquidityTokens the total supply of our exchange's liquidity tokens (aka Ro)
 * @param _internalBalances internal balances struct from our exchange's internal accounting
 *
 * @return liquidityTokenFeeQty qty of tokens to be minted to the fee address for the growth in K
 */ 
 const calculateLiquidityTokenFees = (
  _totalSupplyOfLiquidityTokens,
  _internalBalances
) => {
  // cleanse inputs
  const totalSupplyOfLiquidityTokensBN = BigNumber(_totalSupplyOfLiquidityTokens);
  const internalBalances = internalBalancesBNCleaner(_internalBalances);

  const rootK = ((internalBalances.baseTokenReserveQty).multipliedBy(internalBalances.quoteTokenReserveQty)).sqrt();
  const rootKLast = (internalBalances.kLast).sqrt();
  
  if(rootK.isGreaterThan(rootKLast)){
    const numerator = totalSupplyOfLiquidityTokensBN.multipliedBy(rootK.minus(rootKLast));
    const denominator = (rootK.multipliedBy(BigNumber(5))).plus(rootKLast);
    const liquidityTokenFeeQty = numerator.dividedBy(denominator);
    return liquidityTokenFeeQty;
  }

};  

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
  const numerator = quoteTokenQtyBN.multipliedBy(totalSupplyOfLiquidityTokensBN).dp(18, ROUND_DOWN);
  const liquidityTokenQty = (numerator).dividedBy(quoteTokenReserveBalanceBN).dp(18, ROUND_DOWN);
  return liquidityTokenQty;

}



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

  console.log("sdk: inputs--------");
  console.log("_totalSupplyOfLiquidityTokensBN: ", totalSupplyOfLiquidityTokensBN.toString());
  console.log("_tokenQtyAToAddBN: ", tokenQtyAToAddBN.toString());
  console.log("internalTokenAReserveQtyBN: ", internalTokenAReserveQtyBN.toString());
  console.log("tokenBDecayChangeBN: ", tokenBDecayChangeBN.toString());
  console.log("tokenBDecayBN: ", tokenBDecayBN.toString());
  console.log("-----------------------");

  const aTokenDiv = tokenQtyAToAddBN.dividedBy(internalTokenAReserveQtyBN);
  console.log("aTokenDiv: ", aTokenDiv.toString());

  const bTokenWADMul = tokenBDecayChangeBN;
  console.log("bTokenWADMul: ", bTokenWADMul.toString());

  const aAndBDecayMul = aTokenDiv.multipliedBy(bTokenWADMul);
  console.log("aAndBdecayMul: ", aAndBDecayMul.toString());

  const AAndBDecayMulDivByTokenBDecay = aAndBDecayMul.dividedBy(tokenBDecayBN);
  console.log("AAndBDecayMulDivByTokenBDecay: ", AAndBDecayMulDivByTokenBDecay.toString());

  const altWGamma = (AAndBDecayMulDivByTokenBDecay.dividedBy(BigNumber(2))).dp(18, ROUND_DOWN);
  console.log("altWGamma: ", altWGamma.toString());

 

  // /*
  
  // # gamma = deltaY / Y' / 2 * (deltaX / alphaDecay')
  
  //             deltaY  *   deltaX * 2
  // # gamma =  ------------------------ 
  //               Y'    *   alphaDecay'

  // */
  // const deltaY = tokenQtyAToAddBN;
  // const YDash = internalTokenAReserveQtyBN;
  // const deltaX = tokenBDecayChangeBN;
  // const alphaDecayDash = tokenBDecayBN;

  // const gammaNumerator = (deltaY.multipliedBy(deltaX)).multipliedBy(BigNumber(2));
  // console.log('gammaNumerator: ', gammaNumerator.toString());
  // const gammaDenominator = (YDash.multipliedBy(alphaDecayDash));
  // console.log("gammaDenominat: ", gammaDenominator.toString());
  

  // const gamma = gammaNumerator.dividedBy(gammaDenominator);
  // console.log("gamma: ", gamma.toString());


  /*
  12.500000000000000000

  # liquidityTokens - Ro
  # ΔRo = (Ro/(1 - γ)) * γ

  # deltaRo =  totalSupplyOfLiquidityTokens  * gamma
              ------------------------------------------
                  ( 1 - gamma )

  */
  const liquidityTokenQty = (totalSupplyOfLiquidityTokensBN.multipliedBy(altWGamma)).dividedBy(BigNumber(1).minus(altWGamma)).dp(0, ROUND_DOWN);
  console.log("liquidityTokenQty: ", liquidityTokenQty.toString());

  return liquidityTokenQty;
}

 /**
 * @dev used to calculate the qty of token a liquidity provider
 * must add in order to maintain the current reserve ratios
 * @param _tokenAQty base or quote token qty to be supplied by the liquidity provider
 * @param _tokenAReserveQty current reserve qty of the base or quote token (same token as tokenA)
 * @param _tokenBReserveQty current reserve qty of the other base or quote token (not tokenA)
 * @return tokenBQty
 */
const calculateQty = (_tokenAQty, _tokenAReserveQty, _tokenBReserveQty) => {
  // cleanse input 
  const tokenAQtyBN = BigNumber(_tokenAQty);
  const tokenAReserveQtyBN = BigNumber(_tokenAReserveQty);
  const tokenBReserveQtyBN = BigNumber(_tokenBReserveQty);

  if(tokenAQtyBN.isLessThanOrEqualTo(ZERO) ){
    throw INSUFFICIENT_QTY;
  }
  if(tokenAReserveQtyBN.isLessThanOrEqualTo(ZERO) || tokenBReserveQtyBN.isLessThanOrEqualTo(ZERO)){
    throw INSUFFICIENT_LIQUIDITY;
  }
  const tokenBQty = tokenAQtyBN.multipliedBy(tokenBReserveQtyBN).dividedBy(tokenAReserveQtyBN).dp(18, ROUND_DOWN);
  return tokenBQty;

};



/**
 * @dev used to calculate the qty of token a trader will receive (less fees)
 * given the qty of token A they are providing
 * @param _tokenASwapQty base or quote token qty to be swapped by the trader
 * @param _tokenAReserveQty current reserve qty of the base or quote token (same token as tokenA)
 * @param _tokenBReserveQty current reserve qty of the other base or quote token (not tokenA)
 * @param _liquidityFeeInBasisPoints fee to liquidity providers represented in basis points
 * @return qtyToReturn
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


  const differenceInBP = BASIS_POINTS.minus(liquidityFeeInBasisPointsBN);
  const tokenASwapQtyLessFee = (tokenASwapQtyBN.multipliedBy(differenceInBP)).dp(18, ROUND_DOWN);
  
  
  const numerator = (tokenASwapQtyLessFee.multipliedBy(tokenBReserveQtyBN)).dp(18, ROUND_DOWN);
  const denominator = ((tokenAReserveQtyBN.multipliedBy(BASIS_POINTS)).dp(18, ROUND_DOWN)).plus(tokenASwapQtyLessFee);

  const qtyToReturn = (numerator.dividedBy(denominator)).dp(0, ROUND_DOWN);

  return qtyToReturn;

}; 


 

/**
 * @dev calculates the qty of quote tokens a user will receive for swapping their base tokens (less fees)
 * @param _baseTokenQty the amount of bases tokens the user wants to swap
 * @param _quoteTokenQtyMin the minimum about of quote tokens they are willing to receive in return (slippage)
 * @param _liquidityFeeInBasisPoints the current total liquidity fee represented as an integer of basis points
 * @param _internalBalances internal balances struct from our exchange's internal accounting
 *
 * @return quoteTokenQty qty of quote token the user will receive back
 */
const calculateQuoteTokenQty = (
  _baseTokenQty,
  _quoteTokenQtyMin,
  _liquidityFeeInBasisPoints,
  _internalBalances
) => {

  // cleanse input
  const baseTokenQtyBN = BigNumber(_baseTokenQtyMin);
  const quoteTokenQtyMinBN = BigNumber(_quoteTokenQty);
  const liquidityFeeInBasisPointsBN = BigNumber(_liquidityFeeInBasisPoints);
  const internalBalances = internalBalancesBNCleaner(_internalBalances);

  let quoteTokenQty = ZERO;

  if(baseTokenQtyBN.isLessThanOrEqualTo(ZERO) && quoteTokenQtyMinBN.isLessThanOrEqualTo(ZERO)){
    throw INSUFFICIENT_TOKEN_QTY;
  }

  quoteTokenQty = calculateQtyToReturnAfterFees(
    baseTokenQtyBN,
    internalBalances.baseTokenReserveQty,
    internalBalances.quoteTokenReserveQty,
    liquidityFeeInBasisPointsBN
  );

  if(quoteTokenQty.isLessThanOrEqualTo(quoteTokenQtyMinBN)){
    throw INSUFFICIENT_QUOTE_TOKEN_QTY;
  }

  internalBalances.baseTokenReserveQty = (internalBalances.baseTokenReserveQty).plus(baseTokenQtyBN);
  internalBalances.quoteTokenReserveQty = (internalBalances.quoteTokenReserveQty).minus(quoteTokenQty);

  return quoteTokenQty;


};  




   



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
  const internalBalances = internalBalancesBNCleaner(_internalBalances);
  
  const baseTokenReserveDifference = baseTokenReserveQtyBN.minus(internalBalances.baseTokenReserveQty);
  const internalBalanceRatio = (internalBalances.baseTokenReserveQty).dividedBy(internalBalances.quoteTokenReserveQty);

  const decayPresentComparison = (baseTokenReserveDifference.dividedBy(internalBalanceRatio)).isGreaterThan(BigNumber('1'));

  return decayPresentComparison;
}






// helper function
const internalBalancesBNCleaner = (_internalBalances) => {
  _internalBalances.baseTokenReserveQty = BigNumber( _internalBalances.baseTokenReserveQty);
  _internalBalances.quoteTokenReserveQty = BigNumber(_internalBalances.quoteTokenReserveQty);
  _internalBalances.kLast = BigNumber( _internalBalances.kLast);

  return _internalBalances;

}

   
// };
// const objectBNCleaner = (objectToBeCleaned) => {
//   return Object.keys(objectToBeCleaned).map((key) => {
//     let cleanedObj = {};
//     cleanedObj[key] = BigNumber(key);
//     return cleanedObj;
//   })
// }

module.exports = {
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
calculateLiquidityTokenFees,
INSUFFICIENT_QTY,
INSUFFICIENT_LIQUIDITY


}
