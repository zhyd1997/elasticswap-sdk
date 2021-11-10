import ERC20Contract from '@elastic-dao/elasticswap/artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json';
import Base from '../Base';

export default class ERC20 extends Base {
  constructor(sdk, address) {
    super(sdk);
    this._address = address;
    this._contract = sdk.contract({
      abi: ERC20Contract.abi,
      address,
      readonly: false,
    });
  }

  get address() {
    return this._address;
  }

  get contract() {
    return this._contract;
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
}
