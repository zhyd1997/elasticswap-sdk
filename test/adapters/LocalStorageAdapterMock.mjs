/* eslint class-methods-use-this: 0 */

export default class LocalStorageAdapterMock {
  constructor() {
    // create a mapping for us to get data from
    this._storage = {};
  }

  get available() {
    return true;
  }

  awaitAvailable() {
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  ensureAvailable() {}

  async load(key) {
    await this.awaitAvailable();
    this.ensureAvailable();
    return JSON.parse(this._storage[key]);
  }

  async persist(key, object) {
    this._storage[key] = JSON.stringify(object);
    return true;
  }

  async remove(key) {
    this._storage[key] = null;
    // TODO: syntax for deleting a key?
    return true;
  }
}
