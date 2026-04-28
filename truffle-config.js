require("dotenv").config();

module.exports = {
  networks: {
    development: {
      host: process.env.GANACHE_HOST || "127.0.0.1",
      port: Number(process.env.GANACHE_PORT) || 7545,
      network_id: process.env.GANACHE_NETWORK_ID || "*"
    }
  },
  compilers: {
    solc: {
      version: "0.8.13"
    }
  }
};