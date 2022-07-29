import Cachable from './Cachable';

/**
 * An abstract class for fetching and caching JSON formatted IPFS records.
 *
 * @export
 * @class IPFSJsonBase
 * @extends {Cachable}
 */
export default class IPFSJsonBase extends Cachable {
  /**
   * Creates an instance of IPFSJsonBase.
   *
   * @param {SDK} sdk - An instance of the SDK class
   * @param {string} hash - The IPFS file hash
   * @param {Object} cacheData - An Object instance to use instead of fetching from IPFS (optional)
   * @memberof IPFSJsonBase
   */
  constructor(sdk, hash, cacheData) {
    super(sdk);
    this._hash = hash;
    this.load(false, cacheData);

    this.load = this.load.bind(this);
    this._value = this._value.bind(this);
  }

  /**
   * @readonly
   * @returns {string} - the cached value of this instance's IPFS hash
   * @memberof IPFSJsonBase
   */
  get cached() {
    return this.cache.get(this.id);
  }

  /**
   * @readonly
   * @returns {string} - the hash of this instance's IPFS record
   * @memberof IPFSJsonBase
   */
  get id() {
    return this._hash;
  }

  /**
   * @readonly
   * @returns {boolean} - true if this instance is already stored in the cache
   * @memberof IPFSJsonBase
   */
  get loaded() {
    return this.cache.has(this.id);
  }

  /**
   * @readonly
   * @returns {Promise<boolean>} - true if this instance is already loaded
   * @memberof IPFSJsonBase
   */
  get promise() {
    if (this.loaded) {
      return Promise.resolve(this);
    }

    const key = `loading|${this.id}`;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    return this.load();
  }

  /**
   * Loads the IPFS record from the cache or the network.
   *
   * @param {boolean} [force=false] - if set to true, bypasses the cache (optional)
   * @param {Object} cacheData - Object instance to use instead of the network value (optional)
   * @returns {Object} - the record, deserialized into Object form
   * @memberof IPFSJsonBase
   */
  async load(force = false, cacheData) {
    // use the cache data if it exists and we're not forcing a load
    if (!force && this.loaded) {
      return this;
    }

    // store the provided data in the cache and return it, skipping IPFS network lookup
    if (cacheData) {
      this.cache.set(this.id, cacheData);
      return this;
    }

    const key = `loading|${this.id}`;

    // load the file from the IPFS network unless it's already in the cache
    if (force || !this.cache.get(key)) {
      const raw = await this.sdk.integrations.ipfs.get(this.id);

      try {
        this.cache.set(this.id, JSON.parse(raw)); // cache the parsed IPFS record
      } catch (e) {
        console.log('ERROR LOADING IPFS INSTANCE', this.id, raw);
      }

      this.cache.delete(key); // delete the loading key
    }

    return this;
  }

  // deep linking data lookup with a fallback value if the data is not found
  // TODO: support array structures
  _value(key, fallback) {
    try {
      return key.split('.').reduce((acc, part) => acc[part], this.cached) || fallback;
    } catch (error) {
      return fallback;
    }
  }
}
