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
  
  const inputTokenAmountBN = BigNumber(inputTokenAmount);
  console.log('library:', inputTokenAmountBN instanceof BigNumber); 
  const inputTokenReserveQtyBN = BigNumber(inputTokenReserveQty);
  const outputTokenReserveQtyBN = BigNumber(outputTokenReserveQty);
  const slippagePercentBN = BigNumber(slippagePercent);

  const k = inputTokenReserveQtyBN.multipliedBy(outputTokenReserveQtyBN)

  const outputTokenAmount = inputTokenReserveQtyBN.multipliedBy(outputTokenReserveQtyBN).dividedBy(inputTokenAmountBN)
                              .multipliedBy(BigNumber("1").minus(slippagePercentBN.dividedBy(BigNumber("100"))));
                             

  const outputTokenAmountBN = BigNumber(outputTokenAmount);   
  console.log('library:', outputTokenAmountBN instanceof BigNumber);                           
  return outputTokenAmountBN;                                


};

module.exports = {calculateOutputAmount}

