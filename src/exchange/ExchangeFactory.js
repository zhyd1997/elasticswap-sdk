import Base from '../Base';
import ExchangeFactory from '@elastic-dao/elasticswap/artifacts/src/contracts/ExchangeFactory.sol/ExchangeFactory.json';

export default class ExchangeFactory extends Base {
  
  static contract(sdk, address, readonly = false) {
    return sdk.contract({
      abi: ExchangeFactory.abi,
      address,
      readonly,
    });
  }

  get address() {
    return this.sdk.env.factoryAddress;
  }

  get contract() {
    return this.constructor.contract(this.sdk, this.address);
  }

  get readonlyContract() {
    return this.constructor.contract(this.sdk, this.address, true);
  }

  get feeAddress() {
    // TODO
  }

  getExchangeAddress(baseTokenAddress, quoteTokenAddress) {

  }

  async createNewExchange() {
    // TODO
  }

  _handleTransaction(tx) {
    this.sdk.notify(tx);
    return tx;
  }

  // TODO: subscribe to events
  // NewExchange()
}