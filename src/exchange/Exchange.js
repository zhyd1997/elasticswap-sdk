import Base from '../Base';

export default class ExchangeFactory extends Base {
  get baseTokenAddress() {}

  get quoteTokenAddress() {}

  get liquidityFee() {}

  async addLiquidity() {}

  async removeLiquidity() {}

  async swapBaseTokenForQuoteToken() {}

  async swapQuoteTokenForBaseToken() {}
}
