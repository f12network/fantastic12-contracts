const Fantastic12 = artifacts.require("Fantastic12");
const StandardBounties = artifacts.require("StandardBounties");
const StandardBountiesV1 = artifacts.require("StandardBountiesV1");
const MockERC20 = artifacts.require("MockERC20");

const PRECISION = 1e18;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

const BigNumber = require('bignumber.js');

contract("Fantastic12", accounts => {
  const summoner = accounts[0];
  const hero1 = accounts[1];
  const hero2 = accounts[2];

  let DAI;
  let Bounties;
  let BountiesV1;
  let squad0;

  let approveAndSubmit = async function (func, argTypes, args, approvers, salts) {
    let funcSig = web3.eth.abi.encodeFunctionSignature(`${func}(${argTypes.join()},address[],bytes[],uint256[])`);
    let funcParams = web3.eth.abi.encodeParameters(argTypes, args);
    let msgHashes = await Promise.all(approvers.map(async (_, i) => {
      return await squad0.naiveMessageHash(funcSig, funcParams, salts[i]);
    }))
    let sigs = await Promise.all(approvers.map(async (approver, i) => {
      return await web3.eth.sign(msgHashes[i], approver);
    }));

    args.push(approvers);
    args.push(sigs);
    args.push(salts);
    return await squad0[func].apply(null, args);
  }

  let addMembers = async function (newMembers, tributes, approvers, salts) {
    // Approve tribute for newMember
    for (let i in newMembers) {
      let newMember = newMembers[i];
      let tribute = tributes[i];
      await DAI.approve(squad0.address, tribute, { from: newMember });
    }

    let func = 'addMembers';
    let argTypes = ['address[]', 'uint256[]'];
    let args = [newMembers, tributes];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let transferDAI = async function (dests, amounts, approvers, salts) {
    let func = 'transferDAI';
    let argTypes = ['address[]', 'uint256[]'];
    let args = [dests, amounts];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let transferTokens = async function (dests, amounts, tokens, approvers, salts) {
    let func = 'transferTokens';
    let argTypes = ['address[]', 'uint256[]', 'address[]'];
    let args = [dests, amounts, tokens];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let postBounty = async function (data, deadline, reward, bounties, version, approvers, salts) {
    let func = 'postBounty';
    let argTypes = ['string', 'uint256', 'uint256', 'address', 'uint256'];
    let args = [data, deadline, reward, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let addBountyReward = async function (bountyID, reward, bounties, version, approvers, salts) {
    let func = 'addBountyReward';
    let argTypes = ['uint256', 'uint256', 'address', 'uint256'];
    let args = [bountyID, reward, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let refundBountyReward = async function (bountyID, contributionIDs, bounties, version, approvers, salts) {
    let func = 'refundBountyReward';
    let argTypes = ['uint256', 'uint256[]', 'address', 'uint256'];
    let args = [bountyID, contributionIDs, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let changeBountyData = async function (bountyID, data, bounties, version, approvers, salts) {
    let func = 'changeBountyData';
    let argTypes = ['uint256', 'string', 'address', 'uint256'];
    let args = [bountyID, data, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let changeBountyDeadline = async function (bountyID, deadline, bounties, version, approvers, salts) {
    let func = 'changeBountyDeadline';
    let argTypes = ['uint256', 'uint256', 'address', 'uint256'];
    let args = [bountyID, deadline, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let acceptBountySubmission = async function (bountyID, fulfillmentID, tokenAmounts, bounties, version, approvers, salts) {
    let func = 'acceptBountySubmission';
    let argTypes = ['uint256', 'uint256', 'uint256[]', 'address', 'uint256'];
    let args = [bountyID, fulfillmentID, tokenAmounts, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let performBountyAction = async function (bountyID, data, bounties, version, approvers, salts) {
    let func = 'performBountyAction';
    let argTypes = ['uint256', 'string', 'address', 'uint256'];
    let args = [bountyID, data, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let fulfillBounty = async function (bountyID, data, bounties, version, approvers, salts) {
    let func = 'fulfillBounty';
    let argTypes = ['uint256', 'string', 'address', 'uint256'];
    let args = [bountyID, data, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let updateBountyFulfillment = async function (bountyID, fulfullmentID, data, bounties, version, approvers, salts) {
    let func = 'updateBountyFulfillment';
    let argTypes = ['uint256', 'uint256', 'string', 'address', 'uint256'];
    let args = [bountyID, fulfullmentID, data, bounties, version];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  let declare = async function (message, approvers, salts) {
    let func = 'declare';
    let argTypes = ['string'];
    let args = [message];
    return await approveAndSubmit(func, argTypes, args, approvers, salts);
  };

  beforeEach(async function () {
    // Init contracts
    DAI = await MockERC20.new();
    TOK = await MockERC20.new(); // non-DAI ERC20 token
    Bounties = await StandardBounties.new();
    BountiesV1 = await StandardBountiesV1.new();
    squad0 = await Fantastic12.new();
    await squad0.init(summoner, DAI.address);

    // Mint DAI for accounts
    const mintAmount = `${100 * PRECISION}`;
    await DAI.mint(summoner, mintAmount);
    await DAI.mint(hero1, mintAmount);
    await DAI.mint(hero2, mintAmount);

    // Mint TOK for accounts
    await TOK.mint(summoner, mintAmount);
    await TOK.mint(hero1, mintAmount);
    await TOK.mint(hero2, mintAmount);
  });

  it("shout()", async function() {
    let msg = "Hello world!";
    let result = await squad0.shout(msg);
    let shoutMsg = result.logs[0].args.message;
    assert.equal(shoutMsg, msg, "Message mismatch");
  });

  it("declare()", async function() {
    let msg = "Hello world!";
    let result = await declare(msg, [summoner], [0]);
    let declareMsg = result.logs[0].args.message;
    assert.equal(declareMsg, msg, "Message mismatch");
  });

  it("addMembers()", async function () {
    // Add hero1
    let tribute1 = `${10 * PRECISION}`;
    await addMembers([hero1], [tribute1], [summoner], [1]);

    // Verify hero1 has been added
    assert(await squad0.isMember(hero1), "Didn't add hero1 to isMember");
    assert.equal(await squad0.memberCount(), 2, "Didn't add hero1 to memberCount");

    // Verify tribute has been transferred
    assert.equal(await DAI.balanceOf(squad0.address), tribute1, "Didn't transfer hero1's tribute");

    // Add hero2 to squad0
    await addMembers([hero2], [0], [summoner, hero1], [0, 0]);

    // Verify hero2 has been added
    assert(await squad0.isMember(hero2), "Didn't add hero2 to isMember");
    assert.equal(await squad0.memberCount(), 3, "Didn't add hero2 to memberCount");
  });

  it("rageQuit()", async function () {
    // Add hero1 to squad0
    let tribute1 = 10 * PRECISION;
    let tribute1Str = `${tribute1}`;
    await addMembers([hero1], [tribute1Str], [summoner], [0]);

    // hero1 ragequits
    await squad0.rageQuit([DAI.address], { from: hero1 });

    // Verify hero1 has been removed
    assert.equal(await squad0.isMember(hero1), false, "Didn't remove hero1 from isMember");
    assert.equal(await squad0.memberCount(), 1, "Didn't remove hero1 from memberCount");

    // Verify hero1 received half of squad funds
    assert.equal(await DAI.balanceOf(squad0.address), tribute1 / 2, "Didn't withdraw funds to hero1");
  });

  it("transferDAI()", async function () {
    // Transfer DAI from summoner to squad
    let amount = 10 * PRECISION;
    let amountStr = `${amount}`;
    await DAI.transfer(squad0.address, amountStr);

    // Transfer DAI from squad to hero1 and hero2
    let hero1Amount = `${3 * PRECISION}`;
    let hero2Amount = `${4 * PRECISION}`;
    await transferDAI([hero1, hero2], [hero1Amount, hero2Amount], [summoner], [0]);

    // Verify hero1 and hero2 received correct funds
    let initialBalance = 100 * PRECISION;
    let actualHero1Amount = +(await DAI.balanceOf(hero1)) - initialBalance;
    let actualHero2Amount = +(await DAI.balanceOf(hero2)) - initialBalance;
    assert.equal(hero1Amount, actualHero1Amount, "hero1 received amount mismatch");
    assert.equal(hero2Amount, actualHero2Amount, "hero2 received amount mismatch");
  });

  it("transferTokens()", async function () {
    // Transfer TOK from summoner to squad
    let amount = 10 * PRECISION;
    let amountStr = `${amount}`;
    await TOK.transfer(squad0.address, amountStr);

    // Transfer Ether from summoner to squad
    await web3.eth.sendTransaction({from: summoner, to: squad0.address, value: amountStr});

    // Transfer TOK and Ether from squad to hero1 and hero2
    let hero1Amount = `${3 * PRECISION}`;
    let hero2Amount = `${4 * PRECISION}`;
    let hero2InitialBalance = +(await web3.eth.getBalance(hero2));
    await transferTokens([hero1, hero2], [hero1Amount, hero2Amount], [TOK.address, ZERO_ADDR], [summoner], [0]);

    // Verify hero1 and hero2 received correct funds
    let hero1InitialBalance = 100 * PRECISION;
    let actualHero1Amount = +(await TOK.balanceOf(hero1)) - hero1InitialBalance;
    let actualHero2Amount = BigNumber(await web3.eth.getBalance(hero2)).minus(hero2InitialBalance);
    assert.equal(hero1Amount, actualHero1Amount, "hero1 received amount mismatch");
    assert(actualHero2Amount.eq(hero2Amount), "hero2 received amount mismatch");
  });

  it("postBounty() V1", async function () {
    let version = 1;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result = await postBounty(
      data,
      deadline,
      amount,
      BountiesV1.address,
      version,
      [summoner],
      [0]
    );

    // Verify the bounty's info
    let bountyID = result.logs[0].args.bountyID;
    let bountyInfo = await BountiesV1.getBounty(bountyID);
    assert.equal(bountyInfo[1], deadline, "Deadline mismatch");
    assert.equal(bountyInfo[5], amount, "Reward mismatch");
  });

  it("addBountyReward() V1", async function () {
    let version = 1;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result0 = await postBounty(
      data,
      deadline,
      amount,
      BountiesV1.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = result0.logs[0].args.bountyID;

    // Add reward to bounty
    await addBountyReward(+bountyID, amount, BountiesV1.address, version, [summoner], [1]);

    // Verify that reward has been added
    let bountyInfo = await BountiesV1.getBounty(bountyID);
    assert.equal(bountyInfo[5], `${+amount * 2}`, "Reward mismatch");
  });

  it("refundBountyReward() V1", async function () {
    let version = 1;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result = await postBounty(
      data,
      deadline,
      amount,
      BountiesV1.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Refund reward
    await refundBountyReward(+bountyID, [0], BountiesV1.address, version, [summoner], [1]);

    // Verify the reward has been refunded
    let bountyInfo = await BountiesV1.getBounty(bountyID);
    assert.equal(bountyInfo[5], 0, "Refund mismatch");
  });

  it("changeBountyDeadline() V1", async function () {
    let version = 1;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result = await postBounty(
      data,
      deadline,
      amount,
      BountiesV1.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Change bounty's deadline
    let newDeadline = now + 2000;
    await changeBountyDeadline(+bountyID, newDeadline, BountiesV1.address, version, [summoner], [1]);

    // Verify that the deadline wad changed
    let bountyInfo = await BountiesV1.getBounty(bountyID);
    assert.equal(bountyInfo[1], newDeadline, "Deadline mismatch");
  });

  it("acceptBountySubmission() V1", async function () {
    let version = 1;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    let amountNum = +amount;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result = await postBounty(
      data,
      deadline,
      amount,
      BountiesV1.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = +result.logs[0].args.bountyID;

    // Let hero1 submit a fulfillment
    await BountiesV1.fulfillBounty(bountyID, "TestData1", { from: hero1 });

    // Accept bounty fulfillment
    await acceptBountySubmission(bountyID, 0, [], BountiesV1.address, version, [summoner], [1]);

    // Verify that the bounty was fulfilled
    let bountyInfo = await BountiesV1.getBounty(bountyID);
    assert.equal(bountyInfo[4], 1, "bountyStage mismatch");

    // Verify that hero1 got the correct reward
    let initialBalance = 100 * PRECISION;
    let actualHero1Reward = +(await DAI.balanceOf(hero1)) - initialBalance;
    assert.equal(amountNum, actualHero1Reward, "hero1 reward mismatch");
  });

  it("fulfillBounty() V1", async function () {
    let version = 1;

    // Let hero1 post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let amount = `${10 * PRECISION}`;
    await DAI.approve(BountiesV1.address, amount, { from: hero1 });
    let result0 = await BountiesV1.issueAndActivateBounty(
      hero1,
      deadline,
      data,
      amount,
      hero1,
      true,
      DAI.address,
      amount,
      { from: hero1 }
    );
    let bountyID = +result0.logs[0].args.bountyId;

    // Submit bounty fulfillment
    let fulfillmentData = "TestData1";
    await fulfillBounty(bountyID, fulfillmentData, BountiesV1.address, version, [summoner], [0]);

    // Verify that the fulfillment has the correct info
    let fulfillmentID = 0;
    let fulfillmentInfo = await BountiesV1.getFulfillment(bountyID, fulfillmentID);
    assert.equal(fulfillmentInfo[0], false, "accepted mismatch");
    assert.equal(fulfillmentInfo[1], squad0.address, "Fulfiller mismatch");
    assert.equal(fulfillmentInfo[2], fulfillmentData, "Fulfillment data mismatch");

    // Let hero1 accept the fulfillment
    await BountiesV1.acceptFulfillment(
      bountyID,
      fulfillmentID,
      { from: hero1 }
    );

    // Verify that the bounty was fulfilled
    fulfillmentInfo = await BountiesV1.getFulfillment(bountyID, fulfillmentID);
    assert.equal(fulfillmentInfo[0], true, "accepted mismatch");

    // Verify that the squad received the reward
    assert.equal(await DAI.balanceOf(squad0.address), amount, "Reward amount mismatch");
  });

  it("updateBountyFulfillment() V1", async function () {
    let version = 1;
    
    // Let hero1 post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let amount = `${10 * PRECISION}`;
    await DAI.approve(BountiesV1.address, amount, { from: hero1 });
    let result0 = await BountiesV1.issueAndActivateBounty(
      hero1,
      deadline,
      data,
      amount,
      hero1,
      true,
      DAI.address,
      amount,
      { from: hero1 }
    );
    let bountyID = +result0.logs[0].args.bountyId;

    // Submit bounty fulfillment
    let fulfillmentData = "TestData1";
    await fulfillBounty(bountyID, fulfillmentData, BountiesV1.address, version, [summoner], [0]);

    // Update bounty fulfillment
    let newData = "TestData2";
    let fulfillmentID = 0;
    await updateBountyFulfillment(bountyID, fulfillmentID, newData, BountiesV1.address, version, [summoner], [1]);
  });

  it("postBounty()", async function () {
    let version = 2;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result = await postBounty(
      data,
      deadline,
      amount,
      Bounties.address,
      version,
      [summoner],
      [0]
    );

    // Verify the bounty's info
    let bountyID = result.logs[0].args.bountyID;
    let bountyInfo = await Bounties.getBounty(bountyID);
    assert.equal(bountyInfo.deadline, deadline, "Deadline mismatch");
    assert.equal(bountyInfo.token, DAI.address, "Token address mismatch");
    assert.equal(bountyInfo.tokenVersion, "20", "Token version mismatch");
    assert.equal(bountyInfo.balance, amount, "Reward mismatch");
    assert.equal(bountyInfo.hasPaidOut, false, "hasPaidOut mismatch");
    assert.equal(bountyInfo.fulfillments.length, 0, "Fulfillments mismatch");
  });

  it("addBountyReward()", async function () {
    let version = 2;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result0 = await postBounty(
      data,
      deadline,
      amount,
      Bounties.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = result0.logs[0].args.bountyID;

    // Add reward to bounty
    await addBountyReward(+bountyID, amount, Bounties.address, version, [summoner], [1]);

    // Verify that reward has been added
    let bountyInfo = await Bounties.getBounty(bountyID);
    assert.equal(bountyInfo.balance, `${+amount * 2}`, "Reward mismatch");
  });

  it("refundBountyReward()", async function () {
    let version = 2;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now - 1000; // Deadline needs to be in the past to refund bounty reward
    let result = await postBounty(
      data,
      deadline,
      amount,
      Bounties.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Refund reward
    await refundBountyReward(+bountyID, [0], Bounties.address, version, [summoner], [1]);

    // Verify the reward has been refunded
    let bountyInfo = await Bounties.getBounty(bountyID);
    assert.equal(bountyInfo.balance, 0, "Refund mismatch");
  });

  it("changeBountyData()", async function () {
    let version = 2;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now - 1000; // Deadline needs to be in the past to refund bounty reward
    let result = await postBounty(
      data,
      deadline,
      amount,
      Bounties.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Change bounty's data
    let newData = "TestData1";
    await changeBountyData(+bountyID, newData, Bounties.address, version, [summoner], [1]);
  });

  it("changeBountyDeadline()", async function () {
    let version = 2;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now - 1000; // Deadline needs to be in the past to refund bounty reward
    let result = await postBounty(
      data,
      deadline,
      amount,
      Bounties.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Change bounty's deadline
    let newDeadline = now + 2000;
    await changeBountyDeadline(+bountyID, newDeadline, Bounties.address, version, [summoner], [1]);

    // Verify that the deadline wad changed
    let bountyInfo = await Bounties.getBounty(bountyID);
    assert.equal(bountyInfo.deadline, newDeadline, "Deadline mismatch");
  });

  it("acceptBountySubmission()", async function () {
    let version = 2;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    let amountNum = +amount;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result = await postBounty(
      data,
      deadline,
      amount,
      Bounties.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = +result.logs[0].args.bountyID;

    // Let hero1 submit a fulfillment with hero1 and hero2 as fulfillers
    await Bounties.fulfillBounty(hero1, bountyID, [hero1, hero2], "TestData1", { from: hero1 });

    // Accept bounty fulfillment, splitting the reward 80/20 between hero1 and hero2
    let hero1Reward = `${amountNum * 0.8}`;
    let hero2Reward = `${amountNum * 0.2}`;
    await acceptBountySubmission(bountyID, 0, [hero1Reward, hero2Reward], Bounties.address, version, [summoner], [1]);

    // Verify that the bounty was fulfilled
    let bountyInfo = await Bounties.getBounty(bountyID);
    assert.equal(bountyInfo.hasPaidOut, true, "hasPaidOut mismatch");

    // Verify that hero1 and hero2 got the correct rewards
    let initialBalance = 100 * PRECISION;
    let actualHero1Reward = +(await DAI.balanceOf(hero1)) - initialBalance;
    let actualHero2Reward = +(await DAI.balanceOf(hero2)) - initialBalance;
    assert.equal(hero1Reward, actualHero1Reward, "hero1 reward mismatch");
    assert.equal(hero2Reward, actualHero2Reward, "hero2 reward mismatch");
  });

  it("performBountyAction()", async function () {
    let version = 2;

    // Transfer DAI to squad
    let amount = `${10 * PRECISION}`;
    let amountNum = +amount;
    await DAI.transfer(squad0.address, amount);

    // Post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let result = await postBounty(
      data,
      deadline,
      amount,
      Bounties.address,
      version,
      [summoner],
      [0]
    );
    let bountyID = +result.logs[0].args.bountyID;

    // Perform action
    let actionData = "TestData1";
    result = await performBountyAction(bountyID, actionData, Bounties.address, version, [summoner], [1]);
  });

  it("fulfillBounty()", async function () {
    let version = 2;

    // Let hero1 post a bounty with reward
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let amount = `${10 * PRECISION}`;
    await DAI.approve(Bounties.address, amount, { from: hero1 });
    let result0 = await Bounties.issueAndContribute(
      hero1,
      [hero1],
      [hero1],
      data,
      deadline,
      DAI.address,
      20,
      amount,
      { from: hero1 }
    );
    let bountyID = +result0.logs[0].args._bountyId;

    // Submit bounty fulfillment
    let fulfillmentData = "TestData1";
    await fulfillBounty(bountyID, fulfillmentData, Bounties.address, version, [summoner], [0]);

    // Verify that the fulfillment has the correct info
    let fulfillmentID = 0;
    let bountyInfo = await Bounties.getBounty(bountyID);
    let fulfillmentInfo = bountyInfo.fulfillments[fulfillmentID];
    assert.equal(fulfillmentInfo.submitter, squad0.address, "Submitter mismatch");
    assert.equal(fulfillmentInfo.fulfillers[0], squad0.address, "Fulfillers mismatch");

    // Let hero1 accept the fulfillment
    await Bounties.acceptFulfillment(
      hero1,
      bountyID,
      fulfillmentID,
      0,
      [amount],
      { from: hero1 }
    );

    // Verify that the bounty was fulfilled
    bountyInfo = await Bounties.getBounty(bountyID);
    assert.equal(bountyInfo.hasPaidOut, true, "hasPaidOut mismatch");

    // Verify that the squad received the reward
    assert.equal(await DAI.balanceOf(squad0.address), amount, "Reward amount mismatch");
  });

  it("updateBountyFulfillment()", async function () {
    let version = 2;
    
    // Let hero1 post a bounty
    let data = "TestData0";
    let now = Math.floor(Date.now() / 1e3);
    let deadline = now + 1000;
    let amount = `${10 * PRECISION}`;
    await DAI.approve(Bounties.address, amount, { from: hero1 });
    let result0 = await Bounties.issueAndContribute(
      hero1,
      [hero1],
      [hero1],
      data,
      deadline,
      DAI.address,
      20,
      amount,
      { from: hero1 }
    );
    let bountyID = +result0.logs[0].args._bountyId;

    // Submit bounty fulfillment
    let fulfillmentData = "TestData1";
    await fulfillBounty(bountyID, fulfillmentData, Bounties.address, version, [summoner], [0]);

    // Update bounty fulfillment
    let newData = "TestData2";
    let fulfillmentID = 0;
    await updateBountyFulfillment(bountyID, fulfillmentID, newData, Bounties.address, version, [summoner], [1]);
  });
});