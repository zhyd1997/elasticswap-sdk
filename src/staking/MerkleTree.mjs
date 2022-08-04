import { addresses } from '../utils/utils.mjs';
import IPFSJsonBase from '../IPFSJsonBase.mjs';

/**
 * Wraps the raw merkle tree data from IPFS
 *
 * @export
 * @class MerkleTree
 * @extends {IPFSJsonBase}
 */
export default class MerkleTree extends IPFSJsonBase {
  /**
   * Creates an instance of MerkleTree.

   * @param {SDK} sdk - An instance of the SDK class
   * @memberof MerkleTree
   */
  constructor(sdk) {
    super(sdk, sdk.merkleHash);
  }

  /**
   * Returns the chainId
   *
   * @readonly
   * @returns {integer} - The chainId
   * @memberof MerkleTree
   */
  get chainId() {
    return this.toNumber(this._value(`${this.rootPath}.chainId`));
  }

  /**
   * Returns the lpTokensGenerated across all pools
   *
   * @readonly
   * @returns {BigNumber}
   * @memberof MerkleTree
   */
  get lpTokensGenerated() {
    return this.toBigNumber(this._value(`${this.rootPath}.lpTokensGenerated`), 18);
  }

  /**
   * Returns the name of the chain
   *
   * @readonly
   * @returns {string} - The name of the chain
   * @memberof MerkleTree
   */
  get name() {
    return this._value(`${this.rootPath}.name`);
  }

  /**
   * Returns the data object for all pools
   *
   * @readonly
   * @returns {Object} - The pool data
   * @memberof MerkleTree
   */
  get pools() {
    return this._value(`${this.rootPath}.pools`);
  }

  /**
   * Returns root key path for the current network
   *
   * @readonly
   * @returns {string} - The root key
   * @memberof MerkleTree
   */
  get rootPath() {
    return `chains.${this.sdk.networkId}`;
  }

  /**
   * Returns the snapshotBlock
   *
   * @readonly
   * @returns {BigNumber}
   * @memberof MerkleTree
   */
  get snapshotBlock() {
    return this.toBigNumber(this._value(`${this.rootPath}.snapshotBlock`, 0), 18);
  }

  /**
   * Returns the total TIC consumed by reward generation
   *
   * @readonly
   * @returns {BigNumber}
   * @memberof MerkleTree
   */
  get ticConsumed() {
    return this.toBigNumber(this._value(`${this.rootPath}.ticConsumed`), 18);
  }

  /**
   * Returns the index for a specific account and pool
   *
   * @param {string} account - thie address of the account
   * @param {number} poolId - the id of the pool
   * @returns {number} - the index of the claim
   * @memberof MerkleTree
   */
  index(account, poolId) {
    const { addressLower, addressChecksum } = addresses(account);

    return this._value(
      `${this.rootPath}.pools.${poolId}.claims.${addressLower}.index`,
      this._value(`${this.rootPath}.pools.${poolId}.claims.${addressChecksum}.index`),
    );
  }

  /**
   * Returns the proof array for a specific account and pool
   *
   * @param {string} account - the address of the account to get the proof for
   * @param {number} poolId - the id of the pool
   * @returns {Array<string>} - the proof
   * @memberof MerkleTree
   */
  proof(account, poolId) {
    const { addressLower, addressChecksum } = addresses(account);

    if (this.totalLPTokenAmount(account, poolId).isZero()) {
      return [];
    }

    return this._value(
      `${this.rootPath}.pools.${poolId}.claims.${addressLower}.proof`,
      this._value(`${this.rootPath}.pools.${poolId}.claims.${addressChecksum}.proof`, []),
    );
  }

  /**
   * Returns amount of reward tokens that the account is eligible to claim from the specified pool
   *
   * @param {string} account - the address which can claim reward tokens
   * @param {number} poolId - the id of the pool
   * @returns {BigNumber} - the claimable amount
   * @memberof MerkleTree
   */
  totalLPTokenAmount(account, poolId) {
    const { addressLower, addressChecksum } = addresses(account);

    const amount = this._value(
      `${this.rootPath}.pools.${poolId}.claims.${addressLower}.totalLPTokenAmount`,
      this._value(
        `${this.rootPath}.pools.${poolId}.claims.${addressChecksum}.totalLPTokenAmount`,
        '0',
      ),
    );

    return this.toBigNumber(amount, 18);
  }

  /**
   * Returns the total TIC amount consumed by the LP rewards
   *
   * @param {string} account - the address which can claim reward tokens
   * @param {number} poolId - the id of the pool
   * @returns {BigNumber} - the consumed amount
   * @memberof MerkleTree
   */
  totalTICAmount(account, poolId) {
    const { addressLower, addressChecksum } = addresses(account);

    return this.toBigNumber(
      this._value(
        `${this.rootPath}.pools.${poolId}.claims.${addressLower}.totalTICAmount`,
        this._value(
          `${this.rootPath}.pools.${poolId}.claims.${addressChecksum}.totalTICAmount`,
          '0',
        ),
      ),
      18,
    );
  }
}
