/* eslint import/extensions: 0 */
import chai from 'chai';
import fetch from 'node-fetch';
import hardhat from 'hardhat';
import elasticSwapSDK from '../../dist/index.js';

const { ethers, deployments } = hardhat;
const { assert } = chai;

describe('ERC20', () => {
  let sdk;

  before(async () => {
    const env = {
      networkId: 99999,
      exchangeFactoryAddress: '0x8C2251e028043e38f58Ac64c00E1F940D305Aa62'
    };
    const accounts = await ethers.getSigners();
    sdk = new elasticSwapSDK.SDK({ env, customFetch: fetch, provider: hardhat.ethers.provider, signer: accounts[0]});
  });

  describe('Constructor', () => {
    it('can be created via constructor', async () => {
      await deployments.fixture();
      const QuoteToken = await deployments.get('QuoteToken');
      const erc20 = new elasticSwapSDK.ERC20(sdk, QuoteToken.address);
      assert.equal(QuoteToken.address, erc20.address);
      assert.isNotNull(erc20.contract);


      // test that the address is correct
      // test that contract is not null 
    });
  });

  describe('balanceOf', () => {
    it('gets correct balance of address when balance is not zero', async () => {
      const accounts = await ethers.getSigners();

      await deployments.fixture();
      const QuoteToken = await deployments.get('QuoteToken');
      const quoteToken = new ethers.Contract(
        QuoteToken.address,
        QuoteToken.abi,
        accounts[0]
      );

      const erc20 = new elasticSwapSDK.ERC20(sdk, QuoteToken.address);
      const expectedBalance = await quoteToken.balanceOf(accounts[0].address);
      const balance = await erc20.balanceOf(accounts[0].address);
      console.log(expectedBalance.toString())
      console.log(balance.toString())
      assert.isTrue(expectedBalance.eq(balance));
    });

    it('gets zero balance of address when balance is zero', async () => {
      // const accounts = await ethers.getSigners();

      // await deployments.fixture();
      // const QuoteToken = await deployments.get('QuoteToken');
      // const quoteToken = new ethers.Contract(
      //   QuoteToken.address,
      //   QuoteToken.abi,
      //   accounts[0]
      // );
      
    });


  });

  describe('approve', () => {
    it('approve balance increases', async () => {
      const accounts = await ethers.getSigners();

      await deployments.fixture();
      const QuoteToken = await deployments.get('QuoteToken');
      const quoteToken = new ethers.Contract(
        QuoteToken.address,
        QuoteToken.abi,
        accounts[0]
      );

      const approvalAddress = QuoteToken.address;
      const erc20 = new elasticSwapSDK.ERC20(sdk, QuoteToken.address);

      // checking initial approvals
      const startingApproval = await quoteToken.allowance(accounts[0].address, approvalAddress);
      console.log(startingApproval.toString());
      const approvalAmount = 50000;
      await erc20.approve(approvalAddress, approvalAmount); // need to fix this to attach signer
      // confirm the approval went through
      const endingApproval = await quoteToken.allowance(accounts[0].address, approvalAddress);
      console.log(endingApproval.toString());
      assert.isTrue(endingApproval.eq(approvalAmount));
    });
  });
});
