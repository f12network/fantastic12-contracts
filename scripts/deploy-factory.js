// We require the Buidler Runtime Environment explicitly here. This is optional
// when running the script with `buidler run <script>`: you'll find the Buidler
// Runtime Environment's members available as global variable in that case.
const env = require("@nomiclabs/buidler");

async function main() {
  // You can run Buidler tasks from a script.
  // For example, we make sure everything is compiled by running "compile"
  await env.run("compile");
  const accounts = await env.web3.eth.getAccounts();
  const DAI_ADDR = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

  const Fantastic12 = env.artifacts.require("Fantastic12");
  const squad = await Fantastic12.new();
  await squad.init(
    accounts[0],
    DAI_ADDR,
    0
  );
  console.log(`Deployed Fantastic12 at address ${squad.address}`);

  const PaidFantastic12Factory = env.artifacts.require("PaidFantastic12Factory");
  const factory = await PaidFantastic12Factory.new(squad.address);
  console.log(`Deployed PaidFantastic12Factory at address ${factory.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
