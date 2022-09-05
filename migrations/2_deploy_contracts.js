const EscrowContract = artifacts.require("EscrowContract");
const TestERC20Token = artifacts.require("TestERC20Token");
const TestERC721Token = artifacts.require("TestERC721Token");

module.exports = function(deployer) {
  deployer.deploy(EscrowContract, 9999999);
  deployer.deploy(TestERC20Token);
  deployer.deploy(TestERC721Token);
};
