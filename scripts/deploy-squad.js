// We require the Buidler Runtime Environment explicitly here. This is optional
// when running the script with `buidler run <script>`: you'll find the Buidler
// Runtime Environment's members available as global variable in that case.
const env = require("@nomiclabs/buidler");

async function main() {
  // You can run Buidler tasks from a script.
  // For example, we make sure everything is compiled by running "compile"
  await env.run("compile");
  const accounts = await env.web3.eth.getAccounts();

  // Deploy factory
  const Fantastic12Factory = env.artifacts.require("Fantastic12Factory");
  const factory = await Fantastic12Factory.new();
  console.log(`Deployed Fantastic12Factory at address ${factory.address}`);

  // Deploy squad
  const result = await factory.createSquad(accounts[0]);
  const squadAddress = result.logs[0].args.squad;
  console.log(`Deployed Fantastic12 squad at address ${squadAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
