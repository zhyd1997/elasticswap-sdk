import ExchangeSolidity from '@elasticswap/elasticswap/artifacts/src/contracts/Exchange.sol/Exchange.json';
import ERC20 from '../tokens/ERC20.mjs';
import Base from '../Base.mjs';
import ErrorHandling from '../ErrorHandling.mjs';
import { calculateExchangeRate } from '../utils/mathLib.mjs';
import { toBigNumber } from '../utils/utils.mjs';

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

  async calculateExchangeRate(inputTokenAddress) {
    const inputTokenAddressLowerCase = inputTokenAddress.toLowerCase();
    let inputTokenReserveQty = toBigNumber(0);
    let outputTokenReserveQty = toBigNumber(0);

    const internalBalances = await this.contract.internalBalances();
    if (inputTokenAddressLowerCase === this.baseTokenAddress.toLowerCase()) {
      inputTokenReserveQty = internalBalances.baseTokenReserveQty;
      outputTokenReserveQty = internalBalances.quoteTokenReserveQty;
    } else if (inputTokenAddress === this.quoteTokenAddress.toLowerCase()) {
      inputTokenReserveQty = internalBalances.quoteTokenReserveQty;
      outputTokenReserveQty = internalBalances.baseTokenReserveQty;
    }

    return calculateExchangeRate(inputTokenReserveQty, outputTokenReserveQty);
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
      throw this.errorHandling.error('TIMESTAMP_EXPIRED');
    }
    if (baseTokenQtyDesired <= baseTokenQtyMin) {
      throw this.errorHandling.error(
        'TOKEN_QTY_DESIRED_LESS_OR_EQUAL_THAN_MINIMUM',
      );
    }
    if ((await this.baseTokenBalance) < baseTokenQtyDesired) {
      throw this.errorHandling.error('NOT_ENOUGH_BASE_TOKEN_BALANCE');
    }
    if (quoteTokenQtyDesired <= quoteTokenQtyMin) {
      throw this.errorHandling.error(
        'TOKEN_QTY_DESIRED_LESS_OR_EQUAL_THAN_MINIMUM',
      );
    }
    if ((await this.quoteTokenBalance) < quoteTokenQtyDesired) {
      throw this.errorHandling.error('NOT_ENOUGH_QUOTE_TOKEN_BALANCE');
    }
    if (
      (await this.baseTokenAllowance) < baseTokenQtyDesired ||
      (await this.quoteTokenAllowance) < quoteTokenQtyDesired
    ) {
      throw this.errorHandling.error('TRANSFER_NOT_APPROVED');
    }

    this._contract = this.confirmSigner(this.contract);
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
      throw this.errorHandling.error('TIMESTAMP_EXPIRED');
    }
    if ((await this.lpTokenBalance) < liquidityTokenQty) {
      throw this.errorHandling.error('NOT_ENOUGH_LP_TOKEN_BALANCE');
    }
    if ((await this.lpTokenAllowance) < liquidityTokenQty) {
      throw this.errorHandling.error('TRANSFER_NOT_APPROVED');
    }

    this._contract = this.confirmSigner(this.contract);
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
      throw this.errorHandling.error('TIMESTAMP_EXPIRED');
    }
    if ((await this.baseTokenBalance) < baseTokenQty) {
      throw this.errorHandling.error('NOT_ENOUGH_BASE_TOKEN_BALANCE');
    }
    if ((await this.baseTokenAllowance) < baseTokenQty) {
      throw this.errorHandling.error('TRANSFER_NOT_APPROVED');
    }

    this._contract = this.confirmSigner(this.contract);
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
      throw this.errorHandling.error('TIMESTAMP_EXPIRED');
    }
    if ((await this.quoteTokenBalance) < quoteTokenQty) {
      throw this.errorHandling.error('NOT_ENOUGH_QUOTE_TOKEN_BALANCE');
    }
    if ((await this.quoteTokenAllowance) < quoteTokenQty) {
      throw this.errorHandling.error('TRANSFER_NOT_APPROVED');
    }

    this._contract = this.confirmSigner(this.contract);
    const txStatus = await this.contract.swapQuoteTokenForBaseToken(
      quoteTokenQty,
      baseTokenQtyMin,
      expirationTimestamp,
      this.sanitizeOverrides(overrides),
    );
    return txStatus;
  }
}
