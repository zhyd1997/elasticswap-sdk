import Base from './Base.mjs';
import IPFS from './integrations/IPFS.mjs';

/**
 * Provides an access point for 3rd party service integrations
 *
 * @export
 * @class Integrations
 * @extends {Base}
 */
export default class Integrations extends Base {
  /**
   * Creates an instance of Integrations.
   *
   * @param {SDK} sdk
   * @memberof Integrations
   */
  constructor(sdk) {
    super(sdk);
    this._ipfs = new IPFS(this.sdk);
  }

  /**
   * Returns the IPFS instance
   *
   * @readonly
   * @memberof Integrations
   */
  get ipfs() {
    return this._ipfs;
  }
}
