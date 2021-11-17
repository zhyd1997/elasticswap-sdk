import ExchangeSolidity from '@elastic-dao/elasticswap/artifacts/src/contracts/Exchange.sol/Exchange.json';
import ERC20 from '../tokens/ERC20';
import Base from '../Base';

export default class Exchange extends Base {
  constructor(sdk, exchangeAddress, baseTokenAddress, quoteTokenAddress) {
    super(sdk);
    this._exchangeAddress = exchangeAddress;
    this._baseTokenAddress = baseTokenAddress;
    this._quoteTokenAddress = quoteTokenAddress;
    this._baseToken = new ERC20(sdk, baseTokenAddress);
    this._quoteToken = new ERC20(sdk, quoteTokenAddress);
    this._lpToken = new ERC20(sdk, exchangeAddress);
    this._contract = sdk.contract({
      abi: ExchangeSolidity.abi,
      address: exchangeAddress,
      readonly: false,
    });
  }

  static contract(sdk, address, readonly = false) {
    return sdk.contract({
      abi: ExchangeSolidity.abi,
      address,
      readonly,
    });
  }

  get contract() {
    return this._contract;
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
    return this.baseToken.balanceOf(this.sdk.account);
  }

  get quoteTokenBalance() {
    return this.quoteToken.balanceOf(this.sdk.account);
  }

  get lpTokenBalance() {
    return this.lpToken.balanceOf(this.sdk.account);
  }

  get baseTokenAllowance() {
    return this.baseToken.allowance(this.sdk.account, this.address);
  }

  get quoteTokenAllowance() {
    return this.quoteToken.allowance(this.sdk.account, this.address);
  }

  get lpTokenAllowance() {
    return this.lpToken.allowance(this.sdk.account, this.address);
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
    overrides = {},
  ) {
    if (expirationTimestamp < new Date().getTime() / 1000) {
      return false;
    }
    if (
      baseTokenQtyDesired <= baseTokenQtyMin ||
      quoteTokenQtyDesired <= quoteTokenQtyMin
    ) {
      return false;
    }
    if (
      this.baseTokenBalance < baseTokenQtyDesired ||
      this.quoteTokenBalance < quoteTokenQtyDesired
    ) {
      return false;
    }
    if (
      this.baseTokenAllowance < baseTokenQtyDesired ||
      this.quoteTokenAllowance < quoteTokenQtyDesired
    ) {
      return false;
    }
    const txStatus = await this.contract.addLiquidity(
      baseTokenQtyDesired,
      quoteTokenQtyDesired,
      baseTokenQtyMin,
      quoteTokenQtyMin,
      liquidityTokenRecipient,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return txStatus;
  }

  async removeLiquidity(
    liquidityTokenQty,
    baseTokenQtyMin,
    quoteTokenQtyMin,
    tokenRecipient,
    expirationTimestamp,
    overrides = {},
  ) {
    if (expirationTimestamp < new Date().getTime() / 1000) {
      return false;
    }
    if (this.lpTokenAllowance < liquidityTokenQty) {
      return false;
    }
    const txStatus = await this.contract.removeLiquidity(
      liquidityTokenQty,
      baseTokenQtyMin,
      quoteTokenQtyMin,
      tokenRecipient,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return txStatus;
  }

  async swapBaseTokenForQuoteToken(
    baseTokenQty,
    quoteTokenQtyMin,
    expirationTimestamp,
    overrides = {},
  ) {
    if (expirationTimestamp < new Date().getTime() / 1000) {
      return false;
    }
    if (
      this.baseTokenBalance < baseTokenQty ||
      this.baseTokenAllowance < baseTokenQty
    ) {
      return false;
    }
    const txStatus = await this.contract.swapBaseTokenForQuoteToken(
      baseTokenQty,
      quoteTokenQtyMin,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return txStatus;
  }

  async swapQuoteTokenForBaseToken(
    quoteTokenQty,
    baseTokenQtyMin,
    expirationTimestamp,
    overrides = {},
  ) {
    if (expirationTimestamp < new Date().getTime() / 1000) {
      return false;
    }
    if (
      this.quoteTokenBalance < quoteTokenQty ||
      this.quoteTokenAllowance < quoteTokenQty
    ) {
      return false;
    }
    const txStatus = await this.contract.swapQuoteTokenForBaseToken(
      quoteTokenQty,
      baseTokenQtyMin,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return txStatus;
  }
}
