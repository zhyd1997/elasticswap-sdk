import Base from '../Base';

export default class ERC20 extends Base {
  constructor(sdk, address) {
    super(sdk);
    this._address = address;
    this._contract = sdk.contract({
      address,
      readonly: false,
    });
  }

  static contract(sdk, address, readonly = false) {
    return sdk.contract({
      address,
      readonly,
    });
  }

  get address() {
    return this._address;
  }

  get contract() {
    return this._contract;
  }

  get readonlyContract() {
    return this.constructor.contract(this.sdk, this.address, true);
  }

  async approve(spenderAddress, amount, overrides = {}) {
    const txStatus = await this.contract.approve(
      spenderAddress,
      this.toEthersBigNumber(amount),
      this.sanitizeOverrides(overrides),
    );
    return txStatus;
  }

  async transfer(recipient, amount, overrides = {}) {
    const txStatus = await this.contract.transfer(
      recipient,
      this.toEthersBigNumber(amount),
      this.sanitizeOverrides(overrides),
    );
    return txStatus;
  }

  async balanceOf(accountAddress, overrides = {}) {
    const balance = await this.contract.balanceOf(
      accountAddress,
      this.sanitizeOverrides(overrides, true),
    );
    return balance;
  }

  async allowance(ownerAddress, spenderAddress, overrides = {}) {
    const ERC20Token = await this.readonlyContract;
    const allowance = await ERC20Token.allowance(
      ownerAddress,
      spenderAddress,
      this.sanitizeOverrides(overrides, true),
    );

    return allowance;
  }
}
