const ReUsePointsToken = artifacts.require("ReUsePointsToken");

module.exports = function (deployer) {
  deployer.deploy(ReUsePointsToken, 1000000);
};