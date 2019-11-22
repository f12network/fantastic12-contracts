usePlugin("@nomiclabs/buidler-truffle5");

module.exports = {
  solc: {
    version: "0.5.13",
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  paths: {
    sources: "./contracts/5",
  },
  networks: {
    mainnet: {
      url: "https://mainnet.infura.io/v3/7a7dd3472294438eab040845d03c215c",
      chainId: 1,
      from: require('./secret.json').account,
      accounts: {
        mnemonic: require('./secret.json').mnemonic
      }
    }
  }
};