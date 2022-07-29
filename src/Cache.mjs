import { isPOJO } from './utils/typeChecks.mjs';
import Base from './Base.mjs';

const localData = {
  ignore: {},
};

/**
 * Provides a unified Caching layer with optional adapter configured in the SDK constructor.
 *
 * @export
 * @class Cache
 * @extends {Base}
 */
export default class Cache extends Base {
  /**
   * Creates an instance of Cache.
   * @param {SDK} sdk - An instance of the SDK class
   * @param {string} [key='default'] - A unique cache key for storage namespacing
   * @param {Object} [{ persist = true }={}] - configuration object
   * @memberof Cache
   */
  constructor(sdk, key = 'default', { persist = true } = {}) {
    super(sdk);

    // add the package name for namespacing
    this._key = `@elasticswap/sdk - ${key}`;
    this._globalPersist = persist;

    // create the ignore object in memory
    if (!isPOJO(localData.ignore[this._key])) {
      localData.ignore[this._key] = {};
    }

    // create the in memory version of the cache
    if (persist && !localData[this.key]) {
      localData[this.key] = { loading: true };

      // load the data from the adapter
      this.adapter
        .load(this.key)
        .then((data) => {
          localData[this.key] = data;

          // if we get back something that isn't a plain Object, clear all the things
          if (!isPOJO(localData[this.key])) {
            this.clear();
          }
        })
        .catch(() => {
          this.clear(); // clear all the things if any error occurs... this is best effort
        })
        .finally(() => {
          delete localData[this.key].loading;
        });
    } else if (!localData[this.key]) {
      localData[this.key] = {};
    }
  }

  /**
   * @readonly
   * @returns {StorageAdapter} - The configured {@link StorageAdapter}
   * @memberof Cache
   */
  get adapter() {
    return this.sdk.storageAdapter;
  }

  /**
   * @readonly
   * @returns {string} - The key / namespace of the cache records
   * @memberof Cache
   */
  get key() {
    return this._key;
  }

  /**
   * @readonly
   * @returns {Promise<>} - resolves when the cache is available
   * @memberof Cache
   */
  get promise() {
    // if we're not persisting, cache is in memory and therefore available
    if (!this._globalPersist) {
      return Promise.resolve();
    }

    // if we're done loading and the adapter is available, cache is available
    if (!localData[this.key].loading && this.sdk.storageAdapter.available) {
      return Promise.resolve();
    }

    // return a promise chain which keeps checking every 50ms and resolves when available
    return new Promise((resolve) => {
      setTimeout(() => {
        this.promise.then(resolve);
      }, 50);
    });
  }

  /**
   * @readonly
   * @returns {Object} - the locally loaded cache data
   * @memberof Cache
   */
  get raw() {
    return localData[this.key];
  }

  /**
   * @readonly
   * @returns {SDK} - An instance of the SDK class
   * @memberof Cache
   */
  get sdk() {
    return this._sdk;
  }

  /**
   * Deletes all data in memory and from the adapter if available.
   *
   * @memberof Cache
   */
  clear() {
    if (this.adapter.available) {
      this.adapter.remove(this.key);
    }

    localData[this.key] = {};
  }

  /**
   * Deletes a specific item from the cache
   *
   * @param {string} key - unique key referencing the location of the data to delete
   * @param {Object} [{ persist = true }={}] - optional config object
   * @memberof Cache
   */
  delete(key, { persist = true } = {}) {
    // delete the data in memory
    delete localData[this.key][key];

    // if persist is true, save the updated data async
    if (persist) {
      setTimeout(() => this.persist(), 0);
    }
  }

  /**
   * Returns the data associated with a specific key
   *
   * @param {string} key - unique key referencing the location of the data
   * @returns {*} - the data found
   * @memberof Cache
   */
  get(key) {
    return localData[this.key][key];
  }

  /**
   * Returns a boolean indicating if data referenced by key exists
   *
   * @param {string} key - unique key referencing the location of the data
   * @return {boolean} - true if data exists, false otherwise
   * @memberof Cache
   */
  has(key) {
    return Object.keys(localData[this.key]).includes(key);
  }

  /**
   * Saves the local version of the Cache via the configured adapter. If this class was initialized
   * without persistance, of the adapter is not available, this method does nothing.
   *
   * @memberof Cache
   */
  persist() {
    if (this._globalPersist && this.adapter.available) {
      // create a new copy of the data, excluding any ignored keys
      const persistable = {};

      // Loop through all of the keys in the local data and copy any that are not ignored
      Object.keys(localData[this.key]).forEach((key) => {
        if (!localData.ignore[this.key][key]) {
          persistable[key] = localData[this.key][key];
        }
      });

      // Save
      this.adapter.persist(this.key, persistable);
    }
  }

  /**
   * Sets the data associated with key
   *
   * @param {string} key - unique key referencing the location of the data
   * @param {*} value - data to store at the key
   * @param {Object} [{ persist = true }={}] - optional config object
   * @memberof Cache
   */
  set(key, value, { persist = true } = {}) {
    localData[this.key][key] = value;
    if (persist) {
      this.persist();
    } else {
      localData.ignore[this.key][key] = true;
    }
  }
}
