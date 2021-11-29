/* eslint class-methods-use-this: 0 */

import ExchangeFactorySolidity from '@elastic-dao/elasticswap/artifacts/src/contracts/ExchangeFactory.sol/ExchangeFactory.json';
import BaseEvents from '../BaseEvents.mjs';
import { toKey } from '../utils/utils.mjs';
import QueryFilterable from '../QueryFilterable.mjs';

class Events extends BaseEvents {
  async NewExchange() {
    return this.observeEvent({
      eventName: 'NewExchange',
      keyBase: this.target.address,
      subjectBase: toKey('ExchangeFactory', this.target.address),
    });
  }
}

export default class ExchangeFactory extends QueryFilterable {
  constructor(sdk, address) {
    super(sdk);
    this._address = address;
    this._contract = sdk.contract({
      abi: ExchangeFactorySolidity.abi,
      address,
      readonly: false,
    });

    // this.getNewExchangeEvents();
    // start listening to events emitted from the contract for the `NewExchange` event.
    // create a callback function that responds to the event.
    // callback function would create the Exchange class (from the SDK) and store it
    // in a mapping here.
    // this._exchangesByAddress[baseTokenAddress][quoteTokenAddress] = new exchange();
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

  getExchanges() {
    // return all exchanges
  }

  getExchangeAddress(baseTokenAddress) {
    // return this._exchangesByAddress[baseTokenAddress];
  }

  getExchangeAddress(baseTokenAddress, quoteTokenAddress) {
    // return this._exchangesByAddress[baseTokenAddress][quoteTokenAddress];
  }

  async createNewExchange(baseTokenAddress, quoteTokenAddress) {
    // check to ensure the exchange doesn't exist already
    // check locally and also check solidity
    // this._contract.exchangeAddressByTokenAddress(baseTokenAdress, quotTokenAddress) (if the exchange doesn't exist, this will return the 0 address ethers.constants.ZERO_ADDRESS);
    // if no exchange exists than check that base token !- quote token
    // and that baseToken != ethers.constants.ZERO_ADDRESS and quoteToken != ethers.constants.ZERO_ADDRESS
  }

  async getNewExchangeEvents(overrides = {}) {
    let endingBlock = overrides.blockTag;
    if (!endingBlock) {
      endingBlock = await this.sdk.provider.getBlockNumber();
    }

    const results = await this.queryFilter(
      'NewExchange',
      12056930, // TODO: FIX ME
      endingBlock,
    );

    results.forEach((event) => createExchangeFromEvent(event));
  }

  createExchangeFromEvent(event) {
    console.log(event);
    console.log('Events topics', event.topics);
  }

  get events() {
    const key = toKey(this.id, 'Events');
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    this.cache.set(key, new Events(this), { persist: false });
    return this.cache.get(key);
  }

  _handleTransaction(tx) {
    this.sdk.notify(tx);
    return tx;
  }
}
