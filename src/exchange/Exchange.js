import Base from '../Base';

export default class Exchange extends Base {
  get baseTokenAddress() {}

  get quoteTokenAddress() {}

  get liquidityFee() {}

  async addLiquidity() {}

  async removeLiquidity() {}

  async swapBaseTokenForQuoteToken() {}

  async swapQuoteTokenForBaseToken() {}
}
