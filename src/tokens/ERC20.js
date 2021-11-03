import ERC20Contract from '../abis/ERC20.json';
import Base from '../Base';

export default class ERC20 extends Base {
  constructor(sdk, address) {
    super(sdk);
    this._address = address;
    this._contract = sdk.contract({
      abi: ERC20Contract,
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

  async approve(spenderAddress, amount) { // evaluate further checks for approve
    const ERC20Token = await this.contract; // maybe await won't be needed; try without await and check if this works
    const approveStatus = await ERC20Token.approve(
      spenderAddress,
      this.toEthersBigNumber(amount, 18), // can't assume 18 decimals; try get decimals from the contract;   
    );
    return approveStatus;
  }

  async balanceOf(accountAddress) {
    const ERC20Token = await this.readonlyContract;
    const balance = await ERC20Token.balanceOf(
      accountAddress,
    );

    return this.toBigNumber(balance.toString(), 18);
  }
}
