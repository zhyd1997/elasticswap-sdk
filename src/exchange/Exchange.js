import ExchangeSolidity from '@elastic-dao/elasticswap/artifacts/src/contracts/Exchange.sol/Exchange.json';
import ERC20 from '../tokens/ERC20';
import Base from '../Base';

export default class Exchange extends Base {
  constructor(sdk, address, baseTokenAddress, quoteTokenAddress) {
    super(sdk);
    this._contract = sdk.contract({
      abi: ExchangeSolidity.abi,
      address,
      readonly: false,
    });
    this._ownerAddress = sdk.account;
    this._exchangeAddress = address;
    this._baseTokenAddress = baseTokenAddress;
    this._quoteTokenAddress = quoteTokenAddress;
    this._baseToken = new ERC20(sdk, baseTokenAddress);
    this._quoteToken = new ERC20(sdk, quoteTokenAddress);
  }

  get contract() {
    return this._contract;
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

  get baseTokenBalance() {
    return this._baseToken.balanceOf(this.ownerAddress);
  }

  get quoteTokenBalance() {
    return this._quoteToken.balanceOf(this.ownerAddress);
  }

  get baseTokenAllowance() {
    return this._baseToken.allowance(this.ownerAddress, this.address);
  }

  get quoteTokenAllowance() {
    return this._quoteToken.allowance(this.ownerAddress, this.address);
  }

  get liquidityFee() {
    return this.contract.TOTAL_LIQUIDITY_FEE;
  }

  async addLiquidity(
    baseTokenQtyDesired,
    quoteTokenQtyDesired,
    baseTokenQtyMin,
    quoteTokenQtyMin,
    liquidityTokenRecipient,
    expirationTimestamp,
    overrides = {}) {
/*     if (!(this.baseTokenBalance > 0) && !(this.quoteTokenBalance > 0)) {
      return false;
    }
    if (!(this.baseTokenAllowance > 0) && !(this.quoteTokenAllowance > 0)) {
      return false;
    } */
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
    if (!(this.baseTokenAllowance > 0) && !(this.quoteTokenAllowance > 0)) {
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
    if (!(this.baseTokenBalance > 0)) {
      return false;
    }
    if (!(this.baseTokenAllowance > 0)) {
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
    BaseTokenQntyMin,
    expirationTimestamp,
    overrides = {}) {
    if (!(this.quoteTokenBalance > 0)) {
      return false;
    }
    if (!(this.quoteTokenAllowance > 0)) {
      return false;
    }
    const exchange = await this.contract;
    const swapQuoteTokenForBaseTokenStatus = await exchange.swapQuoteTokenForBaseToken(
      quoteTokenQnty,
      BaseTokenQntyMin,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return swapQuoteTokenForBaseTokenStatus;
  }
}
