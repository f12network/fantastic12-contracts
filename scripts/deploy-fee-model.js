// We require the Buidler Runtime Environment explicitly here. This is optional
// when running the script with `buidler run <script>`: you'll find the Buidler
// Runtime Environment's members available as global variable in that case.
const env = require("@nomiclabs/buidler");

async function main() {
  // You can run Buidler tasks from a script.
  // For example, we make sure everything is compiled by running "compile"
  await env.run("compile");
  const factoryAddress = "0xfa517cf8f786D4E41409af3822e70383A4DDB2C3";

  const PaidFantastic12Factory = env.artifacts.require("PaidFantastic12Factory");
  const FeeModel = env.artifacts.require("FeeModel");

  // Deploy fee model
  const feeModel = await FeeModel.new();
  console.log(`Deployed FeeModel at address ${feeModel.address}`);

  const factory = await PaidFantastic12Factory.at(factoryAddress);
  await factory.setFeeModel(feeModel.address);
  console.log(`Set FeeModel of PaidFantastic12Factory ${factoryAddress} to ${feeModel.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
