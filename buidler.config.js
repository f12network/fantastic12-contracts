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
  }
};