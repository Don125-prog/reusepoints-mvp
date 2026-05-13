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

// начисление токенов пользователю
async function rewardUser(to, amount) {
  const accounts = await web3.eth.getAccounts();
  const owner = accounts[0];

  return await contract.methods
    .rewardUser(to, amount)
    .send({
      from: owner,
      gas: 200000
    });
}

// сжигание токенов пользователя
async function spendUserTokens(user, amount) {
  const accounts = await web3.eth.getAccounts();
  const owner = accounts[0];

  return await contract.methods
    .burnUserTokens(user, amount)
    .send({
      from: owner,
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