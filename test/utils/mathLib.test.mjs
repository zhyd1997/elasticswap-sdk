/* eslint import/extensions: 0 */
import chai from 'chai';
import mathLib from '../../src/utils/MathLib.js'
import BigNumber from 'bignumber.js'
const { ethers, deployments } = hardhat;
const { assert } = chai;
const { calculateOutputAmount } = mathLib;



describe('MathLib', () => {
  let sdk;

  before(async () => {
    const env = {
      networkId: 99999,
      exchangeFactoryAddress: '0x8C2251e028043e38f58Ac64c00E1F940D305Aa62'
    };
    sdk = new elasticSwapSDK.SDK({ env, customFetch: fetch, provider: hardhat.ethers.provider });
  });


  it('calculateOutputAmount', async() => {
    
    const answer = calculateOutputAmount(1, 100, 100, 0);

    console.log(answer.toString());
    console.log(BigNumber("10000").toString());

    console.log(answer);
    console.log(BigNumber("10000"));
    
    console.log(answer instanceof BigNumber);
    console.log(BigNumber("10000") instanceof BigNumber);
    
    assert.isTrue(answer.isEqualTo(BigNumber("10000")));

  });




});