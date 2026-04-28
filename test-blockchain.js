const {
  getAccounts,
  getTokenBalance,
  getTokenName,
  getTokenSymbol
} = require("./blockchain");

async function run() {
  try {
    const accounts = await getAccounts();
    console.log("Аккаунты Ganache:", accounts);

    const tokenName = await getTokenName();
    const tokenSymbol = await getTokenSymbol();

    console.log("Название токена:", tokenName);
    console.log("Символ токена:", tokenSymbol);

    const firstAccount = accounts[0];
    const balance = await getTokenBalance(firstAccount);

    console.log("Баланс первого аккаунта:", balance);
  } catch (error) {
    console.error("Ошибка проверки блокчейна:", error.message);
  }
}

run();