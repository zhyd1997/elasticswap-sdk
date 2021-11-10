import ERC20Contract from '@elastic-dao/elasticswap/artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json';
import Base from '../Base';

export default class ERC20 extends Base {
  constructor(sdk, address) {
    super(sdk);
    this._address = address;
  }

  static contract(sdk, address, readonly = false) {
    return sdk.contract({
      abi: ERC20Contract.abi,
      address,
      readonly,
    });
  }

  get address() {
    return this._address;
  }

  get contract() {
    return this.constructor.contract(this.sdk, this.address, false);
  }

  get readonlyContract() {
    return this.constructor.contract(this.sdk, this.address, true);
  }

  async approve(spenderAddress, amount, overrides = {}) {
    const ERC20Token = await this.contract;
    const approveStatus = await ERC20Token.approve(
      spenderAddress,
      this.toEthersBigNumber(amount),
      this.sanitizeOverrides(overrides),
    );
    return approveStatus;
  }

  async balanceOf(accountAddress, overrides = {}) {
    const ERC20Token = await this.contract;
    const balance = await ERC20Token.balanceOf(
      accountAddress,
      this.sanitizeOverrides(overrides, true),
    );

    return this.toBigNumber(balance.toString());
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
