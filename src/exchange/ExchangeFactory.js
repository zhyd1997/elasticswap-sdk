import ExchangeFactorySolidity from '@elastic-dao/elasticswap/artifacts/src/contracts/ExchangeFactory.sol/ExchangeFactory.json';
import Base from '../Base';

export default class ExchangeFactory extends Base {
  constructor(sdk, address) {
    super(sdk);
    this._address = address;
    this._contract = sdk.contract({
      abi: ExchangeFactorySolidity.abi,
      address,
      readonly: false,
    });
  }

  get address() {
    return this._address;
  }

  get contract() {
    return this._contract;
  }

  async getFeeAddress() {
    return this._contract.feeAddress();
  }

  getExchangeAddress(baseTokenAddress, quoteTokenAddress) {}

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
