import ExchangeSolidity from '@elastic-dao/elasticswap/artifacts/src/contracts/Exchange.sol/Exchange.json';
import ERC20 from '../tokens/ERC20';
import Base from '../Base';
import ErrorHandling from '../ErrorHandling';

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
    this._errorHandling = new ErrorHandling('exchange');
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

  get errorHandling() {
    return this._errorHandling;
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
      const { error } = this.errorHandling.error('TIMESTAMP_EXPIRED');
      throw error;
    }
    if (
      baseTokenQtyDesired <= baseTokenQtyMin ||
      this.baseTokenBalance < baseTokenQtyDesired
    ) {
      const { error } = this.errorHandling.error('NOT_ENOUGH_BASE_TOKEN_BALANCE');
      throw error;
    }
    if (
      quoteTokenQtyDesired <= quoteTokenQtyMin ||
      this.quoteTokenBalance < quoteTokenQtyDesired
    ) {
      const { error } = this.errorHandling.error('NOT_ENOUGH_QUOTE_TOKEN_BALANCE');
      throw error;
    }
    if (
      this.baseTokenAllowance < baseTokenQtyDesired ||
      this.quoteTokenAllowance < quoteTokenQtyDesired
    ) {
      const { error } = this.errorHandling.error('TRANSFER_NOT_APPROVED');
      throw error;
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
      const { error } = this.errorHandling.error('TIMESTAMP_EXPIRED');
      throw error;
    }
    if (this.lpTokenAllowance < liquidityTokenQty) {
      const { error } = this.errorHandling.error('TRANSFER_NOT_APPROVED');
      throw error;
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
      const { error } = this.errorHandling.error('TIMESTAMP_EXPIRED');
      throw error;
    }
    if (this.baseTokenBalance < baseTokenQty) {
      const { error } = this.errorHandling.error('NOT_ENOUGH_BASE_TOKEN_BALANCE');
      throw error;
    }
    if (this.baseTokenAllowance < baseTokenQty) {
      const { error } = this.errorHandling.error('TRANSFER_NOT_APPROVED');
      throw error;
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
      const { error } = this.errorHandling.error('TIMESTAMP_EXPIRED');
      throw error;
    }
    if (this.quoteTokenBalance < quoteTokenQty) {
      const { error } = this.errorHandling.error('NOT_ENOUGH_QUOTE_TOKEN_BALANCE');
      throw error;
    }
    if (this.quoteTokenAllowance < quoteTokenQty) {
      const { error } = this.errorHandling.error('TRANSFER_NOT_APPROVED');
      throw error;
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
