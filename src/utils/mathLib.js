const sdk = require("@elastic-dao/sdk");
const BigNumber = require("bignumber.js");
const {utils} = sdk;


// calculates the min amount of output tokens given the slippage percent supplied
const calculateOutputAmount = (inputTokenAmount, inputTokenReserveQty, outputTokenReserveQty, slippagePercent) => {

  // inputTokenReserveQty - X
  // logic: K = X*Y
  // outputTokenAmount = ((X*Y)/ inputTokenAmount)* (1 - (slippagePercent/100))
  // cleanse input to BN
  const inputTokenAmountBN = BigNumber(inputTokenAmount);
  const inputTokenReserveQtyBN = BigNumber(inputTokenReserveQty);
  console.log('inputTokenReserveQtyBN.toString()', inputTokenReserveQtyBN.toString());
  const outputTokenReserveQtyBN = BigNumber(outputTokenReserveQty);
  const slippagePercentBN = BigNumber(slippagePercent);

  if(inputTokenReserveQtyBN.isEqualTo(BigNumber(0)) || outputTokenReserveQtyBN.isEqualTo(BigNumber(0)) ) {
    throw new Error("Error:Empty pool");
  }
  else
    if(inputTokenAmountBN.isEqualTo(0)) {
      throw new Error("Divide by zero");
    }
  
  

  const k = inputTokenReserveQtyBN.multipliedBy(outputTokenReserveQtyBN)

  const outputTokenAmount = inputTokenReserveQtyBN.multipliedBy(outputTokenReserveQtyBN).dividedBy(inputTokenAmountBN)
                              .multipliedBy(BigNumber("1").minus(slippagePercentBN.dividedBy(BigNumber("100"))));
                             

  const outputTokenAmountBN = BigNumber(outputTokenAmount);   
                            
  return outputTokenAmountBN;                                


};

module.exports = {calculateOutputAmount}

