/* eslint import/extensions: 0 */
import chai, { expect } from 'chai';
import mathLib from '../../src/utils/MathLib.js'
import BigNumber from 'bignumber.js'

const { assert } = chai;
const { calculateOutputAmount } = mathLib;



describe('MathLib', () => {


  it.only('calculates using calculateOutputAmount correctly', async() => {
    
    // no slippage
    const answer = calculateOutputAmount(1, 100, 100, 0);
    assert.isTrue(answer.isEqualTo(BigNumber("10000")));

    // 5 percent slippage
    const slipageAnswer = calculateOutputAmount(1, 100, 100, 5);
    assert.isTrue(slipageAnswer.isEqualTo(BigNumber("9500")))

    // empty reserves should return sane error
    assert.throws(() => calculateOutputAmount(1, 0, 100, 5), "Error:Empty pool")
    assert.throws(() => calculateOutputAmount(1, 100, 0, 5), "Error:Empty pool")
    assert.throws(() => calculateOutputAmount(0, 100, 100, 5), "Divide by zero")

  });




});