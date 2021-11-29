import Base from './Base.mjs';
import Cache from './Cache.mjs';

export default class Cachable extends Base {
  constructor(sdk, { persist = true } = {}) {
    super(sdk);
    this._cachableStorage = new Cache(sdk, this.constructor.name, { persist });
  }

  get cache() {
    return this._cachableStorage;
  }
}
