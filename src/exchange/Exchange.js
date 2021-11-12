import ExchangeSolidity from '@elastic-dao/elasticswap/artifacts/src/contracts/Exchange.sol/Exchange.json';
import ERC20 from '../tokens/ERC20';
import Base from '../Base';

export default class Exchange extends Base {
  constructor(sdk, address, baseTokenAddress, quoteTokenAddress) {
    super(sdk);
    this._ownerAddress = sdk.account;
    this._exchangeAddress = address;
    this._baseTokenAddress = baseTokenAddress;
    this._quoteTokenAddress = quoteTokenAddress;
    this._baseToken = new ERC20(sdk, baseTokenAddress);
    this._quoteToken = new ERC20(sdk, quoteTokenAddress);
    this._lpToken = new ERC20(sdk, address);
  }

  static contract(sdk, address, readonly = false) {
    return sdk.contract({
      abi: ExchangeSolidity.abi,
      address,
      readonly,
    });
  }

  get contract() {
    return this.constructor.contract(this.sdk, this.address, false);
  }

  get readonlyContract() {
    return this.constructor.contract(this.sdk, this.address, true);
  }

  get ownerAddress() {
    return this._ownerAddress;
  }

  get address() {
    return this._exchangeAddress;
  }

  get baseTokenAddress() {
    return this._baseTokenAddress;
  }

  get quoteTokenAddress() {
    return this._quoteTokenAddress;
  }

  get baseToken() {
    return this._baseToken;
  }

  get quoteToken() {
    return this._quoteToken;
  }

  get lpToken() {
    return this._lpToken;
  }

  get baseTokenBalance() {
    return this.baseToken.balanceOf(this.ownerAddress);
  }

  get quoteTokenBalance() {
    return this.quoteToken.balanceOf(this.ownerAddress);
  }

  get lpTokenBalance() {
    return this.lpToken.balanceOf(this.ownerAddress);
  }

  get baseTokenAllowance() {
    return this.baseToken.allowance(this.ownerAddress, this.address);
  }

  get quoteTokenAllowance() {
    return this.quoteToken.allowance(this.ownerAddress, this.address);
  }

  get liquidityFee() {
    return this.contract.TOTAL_LIQUIDITY_FEE();
  }

  async addLiquidity(
    baseTokenQtyDesired,
    quoteTokenQtyDesired,
    baseTokenQtyMin,
    quoteTokenQtyMin,
    liquidityTokenRecipient,
    expirationTimestamp,
    overrides = {}) {
    if (!(this.baseTokenBalance) || !(this.quoteTokenBalance)) {
      return false;
    }
    if (!(this.baseTokenAllowance) || !(this.quoteTokenAllowance)) {
      return false;
    }
    const exchange = await this.contract;
    const addLiquidityStatus = await exchange.addLiquidity(
      baseTokenQtyDesired,
      quoteTokenQtyDesired,
      baseTokenQtyMin,
      quoteTokenQtyMin,
      liquidityTokenRecipient,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return addLiquidityStatus;
  }

  async removeLiquidity(
    liquidityTokenQty,
    baseTokenQtyMin,
    quoteTokenQtyMin,
    tokenRecipient,
    expirationTimestamp,
    overrides = {}) {
    if (!(this.baseTokenAllowance) || !(this.quoteTokenAllowance)) {
      return false;
    }
    const exchange = await this.contract;
    const removeLiquidityStatus = await exchange.removeLiquidity(
      liquidityTokenQty,
      baseTokenQtyMin,
      quoteTokenQtyMin,
      tokenRecipient,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return removeLiquidityStatus;
  }

  async swapBaseTokenForQuoteToken(
    baseTokenQnty,
    quoteTokenQntyMin,
    expirationTimestamp,
    overrides = {}) {
    if (!(this.baseTokenBalance)) {
      return false;
    }
    if (!(this.baseTokenAllowance)) {
      return false;
    }
    const exchange = await this.contract;
    const swapBaseTokenForQuoteTokenStatus = await exchange.swapBaseTokenForQuoteToken(
      baseTokenQnty,
      quoteTokenQntyMin,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return swapBaseTokenForQuoteTokenStatus;
  }

  async swapQuoteTokenForBaseToken(
    quoteTokenQnty,
    baseTokenQntyMin,
    expirationTimestamp,
    overrides = {}) {
    if (!(this.quoteTokenBalance)) {
      return false;
    }
    if (!(this.quoteTokenAllowance)) {
      return false;
    }
    const exchange = await this.contract;
    const swapQuoteTokenForBaseTokenStatus = await exchange.swapQuoteTokenForBaseToken(
      quoteTokenQnty,
      baseTokenQntyMin,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return swapQuoteTokenForBaseTokenStatus;
  }
}
