const { Web3 } = require("web3");
const contractData = require("./build/contracts/ReUsePointsToken.json");
require("dotenv").config();

const rpcUrl = `http://${process.env.GANACHE_HOST || "127.0.0.1"}:${process.env.GANACHE_PORT || 7545}`;
const contractAddress = process.env.TOKEN_CONTRACT_ADDRESS;

const web3 = new Web3(rpcUrl);

const contract = new web3.eth.Contract(
  contractData.abi,
  contractAddress
);

async function getAccounts() {
  return await web3.eth.getAccounts();
}

async function getTokenBalance(address) {
  const balance = await contract.methods.balanceOf(address).call();
  return Number(balance);
}

async function getTokenName() {
  return await contract.methods.name().call();
}

async function getTokenSymbol() {
  return await contract.methods.symbol().call();
}

async function rewardUser(to, amount) {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];

  const decimals = 10n ** 18n;
  const value = BigInt(amount) * decimals;

  return await contract.methods
    .transfer(to, value.toString())
    .send({
      from,
      gas: 200000
    });
}

async function spendUserTokens(from, amount) {
  const accounts = await web3.eth.getAccounts();
  const platformWallet = accounts[0];

  const decimals = 10n ** 18n;
  const value = BigInt(amount) * decimals;

  return await contract.methods
    .transfer(platformWallet, value.toString())
    .send({
      from,
      gas: 200000
    });
}
module.exports = {
  web3,
  contract,
  getAccounts,
  getTokenBalance,
  getTokenName,
  getTokenSymbol,
  rewardUser,
  spendUserTokens
};