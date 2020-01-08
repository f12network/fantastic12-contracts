usePlugin("@nomiclabs/buidler-truffle5");
usePlugin("@nomiclabs/buidler-etherscan");

let secret;

try {
  secret = require('./secret.json');
} catch {
  secret = {
    account: "",
    mnemonic: ""
  };
}

module.exports = {
  solc: {
    version: "0.5.16",
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
      from: secret.account,
      accounts: {
        mnemonic: secret.mnemonic
      }
    }
  },
  etherscan: {
    // The url for the Etherscan API you want to use.
    // For example, here we're using the one for the Ropsten test network
    url: "https://api.etherscan.io/api",
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "Q8RK76PHC75A3KBHQNBPZPVXIVF35Q32Q2"
  }
};