/* eslint class-methods-use-this: 0 */

import { ethers } from 'ethers';
import Base from '../Base.mjs';

const ticLogo = 'https://raw.githubusercontent.com/ElasticSwap/brand/master/TIC/tic-circle.png';
const elpLogo =
  'https://raw.githubusercontent.com/ElasticSwap/brand/master/ELP/ELP-circle-400px.png';
const amplUSDCLogo = './images/stake/ampl-usdc-elp.png';
const ticUSDCLogo = './images/stake/tic-usdc-elp.png';
const esLogo =
  'https://raw.githubusercontent.com/ElasticSwap/brand/master/ElasticSwap/circle-400px.png';

const TIC_USDC_ELP_ADDRESS = '0x4ae1da57f2d6b2e9a23d07e264aa2b3bbcaed19a';

/**
 * Provides interface for compiled staking pool data.
 *
 * @export
 * @class MerklePool
 * @extends {Base}
 */
export default class MerklePool extends Base {
  constructor(sdk, poolId) {
    super(sdk);

    this._lastUpdate = Date.now();
    this._poolId = poolId;
    this._promise = this.load();

    this.sdk.subscribe(() => {
      if (this.sdk.account && this.sdk.account !== this.account) {
        this.load();
        return;
      }

      // 30 second refresh time
      if (this._lastUpdate + 30000 < Date.now() && this.visible) {
        this.load();
      }
    });
  }

  /**
   * The most recent account noticed by the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get account() {
    return this._account;
  }

  /**
   * A boolean indicating if the pool is currently active (providing rewards)
   *
   * @readonly
   * @memberof MerklePool
   */
  get active() {
    return this.rewardRate.isGreaterThan(0);
  }

  /**
   * The apr of the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get apr() {
    return this._apr;
  }

  /**
   * A promise which is resolved after the first data load
   *
   * @readonly
   * @memberof MerklePool
   */
  get awaitInitialized() {
    return this._promise;
  }

  /**
   * The exchange for this pool, if any
   *
   * @readonly
   * @memberof MerklePool
   */
  get exchange() {
    return this._exchange;
  }

  /**
   * The url of an image to use with the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get image() {
    if (this.token.address === this.sdk.contractAddress('TicToken')) {
      return ticLogo;
    }

    if (this.token.address === this.sdk.contractAddress('TimeTokenTeam')) {
      return esLogo;
    }

    if (this.token.address === this.sdk.contractAddress('TimeTokenPreSeed')) {
      return esLogo;
    }

    if (this.token.address === '0xa0c5aa50ce3cc69b1c478d8235597bc0c51dfdab') {
      return elpLogo;
    }

    if (this.token.address === '0x1b80e501e397dbf8b7d86d06bd42679d61cac756') {
      return amplUSDCLogo;
    }

    return ticUSDCLogo;
  }

  /**
   * The id of the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get id() {
    return this._poolId;
  }

  /**
   * The name of the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get name() {
    if (this.token.address === this.sdk.contractAddress('TicToken')) {
      return 'TIC';
    }

    if (this.token.address === this.sdk.contractAddress('TimeTokenTeam')) {
      return 'Team';
    }

    if (this.token.address === this.sdk.contractAddress('TimeTokenPreSeed')) {
      return 'Pre-seed';
    }

    if (this.token.address === '0xa0c5aa50ce3cc69b1c478d8235597bc0c51dfdab') {
      return 'AMPL/TIC ELP';
    }

    if (this.token.address === '0x1b80e501e397dbf8b7d86d06bd42679d61cac756') {
      return 'AMPL/USDC.e ELP';
    }

    return 'TIC/USDC.e ELP';
  }

  /**
   * The reward rate of the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get rewardRate() {
    return this._rewardRate;
  }

  /**
   * The staked balance of account
   *
   * @readonly
   * @memberof MerklePool
   */
  get staked() {
    return this._staked;
  }

  /**
   * Active or Inactive based on the active boolean value
   *
   * @readonly
   * @memberof MerklePool
   */
  get status() {
    return this.active ? 'Active' : 'Inactive';
  }

  /**
   * The ERC20 instance of the token which can be deposited
   *
   * @readonly
   * @memberof MerklePool
   */
  get token() {
    return this._token;
  }

  /**
   * The amount of token the staking pool is allowed to pull from account
   *
   * @readonly
   * @memberof MerklePool
   */
  get tokenAllowance() {
    return this._tokenAllowance;
  }

  /**
   * The current token balance of account
   *
   * @readonly
   * @memberof MerklePool
   */
  get tokenBalance() {
    return this._tokenBalance;
  }

  /**
   * The current token balance of the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get totalDeposited() {
    return this._totalDeposited;
  }

  /**
   * The total value locked in the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get tvl() {
    return this._tvl;
  }

  /**
   * The amount of unclaimed rewards for account
   *
   * @readonly
   * @memberof MerklePool
   */
  get unclaimed() {
    return this._unclaimed;
  }

  /**
   * The value of each token deposited in the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get valuePerToken() {
    return this._valuePerToken;
  }

  /**
   * Boolean indicating if account can see the pool
   *
   * @readonly
   * @memberof MerklePool
   */
  get visible() {
    return this._visible;
  }

  /**
   * Loads all of the pool data
   *
   * @return {bool}
   * @memberof MerklePool
   */
  async load() {
    this._lastUpdate = Date.now();

    // Only valid on Avalanche. We have not yet deployed this contract elsewhere
    if (this.sdk.networkHex !== '0xa86a') {
      this._account = ethers.constants.AddressZero;
      this._apr = this.toBigNumber(0);
      this._rewardRate = this.toBigNumber(0);
      this._staked = this.toBigNumber(0);
      this._token = undefined;
      this._tokenAllowance = this.toBigNumber(0);
      this._tokenBalance = this.toBigNumber(0);
      this._totalDeposited = this.toBigNumber(0);
      this._tvl = this.toBigNumber(0);
      this._unclaimed = this.toBigNumber(0);
      this._valuePerToken = this.toBigNumber(0);
      this._visible = false;

      return true;
    }

    this._account = this.sdk.account || ethers.constants.AddressZero;

    const [poolTotalDeposited, poolRewardRate, poolTokenAddress, apr, staked, unclaimed] =
      await Promise.all([
        this.sdk.merklePools.getPoolTotalDeposited(this.id),
        this.sdk.merklePools.getPoolRewardRate(this.id),
        this.sdk.merklePools.getPoolToken(this.id),
        this.sdk.merklePools.getAPR(this.id),
        this.sdk.merklePools.getStakeTotalDeposited(this.account, this.id),
        this.sdk.merklePools.getStakeTotalUnclaimed(this.account, this.id),
      ]);

    const preSeedAddress = this.sdk.contractAddress('TimeTokenPreSeed');
    this._exchange = this.sdk.exchangeFactory.exchangeByAddress(poolTokenAddress);
    const ticAddress = this.sdk.contractAddress('TicToken');
    const ticToken = this.sdk.erc20(ticAddress);

    this._apr = apr;
    this._rewardRate = poolRewardRate;
    this._staked = staked;
    this._token = this.sdk.erc20(poolTokenAddress);
    this._totalDeposited = poolTotalDeposited;
    this._unclaimed = unclaimed;
    this._valuePerToken = this.toBigNumber(0);

    // if this is the TIC token, we can use the spot value of the ELP pool
    if (this.token.address === ticAddress) {
      const ticExchange = this.sdk.exchangeFactory.exchangeByAddress(TIC_USDC_ELP_ADDRESS);
      this._valuePerToken = ticExchange.quoteTokenBalance.dividedBy(ticExchange.baseTokenBalance);
    }

    // if this is an ELP exchange, we express the value in quote tokens
    if (this.exchange) {
      const totalSupply = await this.exchange.totalSupply();
      this._valuePerToken = this.exchange.quoteTokenBalance.dividedBy(totalSupply).multipliedBy(2);
    }

    const [tokenBalance, tokenAllowance, tvl] = await Promise.all([
      this.token.balanceOf(this.account, { multicall: true }),
      this.token.allowance(this.account, this.sdk.merklePools.address, { multicall: true }),
      this.sdk.merklePools.getTVL(this.id, this.valuePerToken),
    ]);

    this._tokenAllowance = tokenAllowance;
    this._tokenBalance = tokenBalance;
    this._tvl = tvl;

    if (this.token.address === preSeedAddress) {
      this._valuePerToken = this.toBigNumber(1); // 1 Pre-seed = 1 ETH
      this._tvl = poolTotalDeposited; // TVL = the amount of pre-seed / ETH value staked
    }

    // visibility check
    this._visible = !this.tokenBalance.plus(this.staked).isZero();

    if (this.exchange || this.token.address === ticToken.address) {
      this._visible = true;
    }

    console.log('merkle pool', this.id, 'load took', Date.now() - this._lastUpdate, 'ms');

    this.touch();
    this.sdk.touch();
    return true;
  }
}
