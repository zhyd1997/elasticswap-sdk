const sdk = require("@elastic-dao/sdk");
const BigNumber = require("bignumber.js");
const {utils} = sdk;


// calculates the min amount of output tokens given the slippage percent supplied
const calculateOutputAmount = (inputTokenAmount, inputTokenReserveQty, outputTokenReserveQty, slippagePercent) => {

  // got to make sure inputs come  in clean -BN
  // inputTokenReserveQty - X

  // logic: K = X*Y
  // outputTokenAmount = ((X*Y)/ inputTokenAmount)* (1 - (slippagePercent/100))
  // max outputtoken = (X*Y)/ inputTokenAmount)
  // min output token = (X*Y)/ inputTokenAmount) * (1 - (maxSlippage/100))
  // cleanse input to BN

  if(inputTokenReserveQty === 0 || inputTokenReserveQty === null || inputTokenReserveQty === BigNumber(0)
     || outputTokenReserveQty === 0 || outputTokenReserveQty === null || outputTokenReserveQty === BigNumber(0)) {
    
    throw new Error("Error:Empty pool");
    
  }
  else
    if(inputTokenAmount === 0 || inputTokenAmount === null || inputTokenAmount === BigNumber(0)) {
      throw new Error("Divide by zero");
    }
  
  const inputTokenAmountBN = BigNumber(inputTokenAmount);
  const inputTokenReserveQtyBN = BigNumber(inputTokenReserveQty);
  const outputTokenReserveQtyBN = BigNumber(outputTokenReserveQty);
  const slippagePercentBN = BigNumber(slippagePercent);

  const k = inputTokenReserveQtyBN.multipliedBy(outputTokenReserveQtyBN)

  const outputTokenAmount = inputTokenReserveQtyBN.multipliedBy(outputTokenReserveQtyBN).dividedBy(inputTokenAmountBN)
                              .multipliedBy(BigNumber("1").minus(slippagePercentBN.dividedBy(BigNumber("100"))));
                             

  const outputTokenAmountBN = BigNumber(outputTokenAmount);   
                            
  return outputTokenAmountBN;                                


};

module.exports = {calculateOutputAmount}

