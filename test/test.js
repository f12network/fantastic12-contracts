const Fantastic12 = artifacts.require("Fantastic12");
const StandardBounties = artifacts.require("StandardBounties");
const StandardBountiesV1 = artifacts.require("StandardBountiesV1");
const MockERC20 = artifacts.require("MockERC20");

const PRECISION = 1e18;

contract("Fantastic12", accounts => {
  const summoner = accounts[0];
  const hero1 = accounts[1];
  const hero2 = accounts[2];

  let DAI;
  let Bounties;
  let BountiesV1;
  let squad0;

  let addMember = async function (newMember, tribute, approvers) {
    // Approve tribute for newMember
    await DAI.approve(squad0.address, tribute, { from: newMember });

    // Add newMember to squad0
    let addMemberFuncSig = web3.eth.abi.encodeFunctionSignature("addMember(address,uint256,address[],bytes[])");
    let addMemberFuncParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [newMember, tribute]);
    let addMemberMsgHash = await squad0.naiveMessageHash(addMemberFuncSig, addMemberFuncParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(addMemberMsgHash, approver);
    }));

    return await squad0.addMember(
      newMember,
      tribute,
      approvers,
      sigs
    );
  };

  let postBounty = async function (data, deadline, reward, bounties, version, approvers) {
    let paramTypes = ['string', 'uint256', 'uint256', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`postBounty(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [data, deadline, reward, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.postBounty(
      data,
      deadline,
      reward,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let addBountyReward = async function (bountyID, reward, bounties, version, approvers) {
    let paramTypes = ['uint256', 'uint256', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`addBountyReward(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, reward, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.addBountyReward(
      bountyID,
      reward,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let refundBountyReward = async function (bountyID, contributionIDs, bounties, version, approvers) {
    let paramTypes = ['uint256', 'uint256[]', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`refundBountyReward(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, contributionIDs, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.refundBountyReward(
      bountyID,
      contributionIDs,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let changeBountyData = async function (bountyID, data, bounties, version, approvers) {
    let paramTypes = ['uint256', 'string', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`changeBountyData(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, data, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.changeBountyData(
      bountyID,
      data,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let changeBountyDeadline = async function (bountyID, deadline, bounties, version, approvers) {
    let paramTypes = ['uint256', 'uint256', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`changeBountyDeadline(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, deadline, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.changeBountyDeadline(
      bountyID,
      deadline,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let acceptBountySubmission = async function (bountyID, fulfillmentID, tokenAmounts, bounties, version, approvers) {
    let paramTypes = ['uint256', 'uint256', 'uint256[]', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`acceptBountySubmission(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, fulfillmentID, tokenAmounts, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.acceptBountySubmission(
      bountyID,
      fulfillmentID,
      tokenAmounts,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let performBountyAction = async function (bountyID, data, bounties, version, approvers) {
    let paramTypes = ['uint256', 'string', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`performBountyAction(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, data, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.performBountyAction(
      bountyID,
      data,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let fulfillBounty = async function (bountyID, data, bounties, version, approvers) {
    let paramTypes = ['uint256', 'string', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`fulfillBounty(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, data, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.fulfillBounty(
      bountyID,
      data,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let updateBountyFulfillment = async function (bountyID, fulfullmentID, data, bounties, version, approvers) {
    let paramTypes = ['uint256', 'uint256', 'string', 'address', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`updateBountyFulfillment(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, fulfullmentID, data, bounties, version]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.updateBountyFulfillment(
      bountyID,
      fulfullmentID,
      data,
      bounties,
      version,
      approvers,
      sigs
    );
  };

  let declare = async function (message, approvers) {
    let paramTypes = ['string'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`declare(${paramTypes.join()},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [message]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.declare(
      message,
      approvers,
      sigs
    );
  };

  beforeEach(async function () {
    // Init contracts
    DAI = await MockERC20.new();
    Bounties = await StandardBounties.new();
    BountiesV1 = await StandardBountiesV1.new();
    squad0 = await Fantastic12.new(summoner, DAI.address);

    // Mint DAI for accounts
    const mintAmount = `${100 * PRECISION}`;
    await DAI.mint(summoner, mintAmount);
    await DAI.mint(hero1, mintAmount);
    await DAI.mint(hero2, mintAmount);
  });

  it("addMember()", async function () {
    // Add hero1
    let tribute1 = `${10 * PRECISION}`;
    await addMember(hero1, tribute1, [summoner]);

    // Verify hero1 has been added
    assert(await squad0.isMember(hero1), "Didn't add hero1 to isMember");
    assert.equal(await squad0.memberCount(), 2, "Didn't add hero1 to memberCount");

    // Verify tribute has been transferred
    assert.equal(await DAI.balanceOf(squad0.address), tribute1, "Didn't transfer hero1's tribute");

    // Add hero2 to squad0
    await addMember(hero2, 0, [summoner, hero1]);

    // Verify hero2 has been added
    assert(await squad0.isMember(hero2), "Didn't add hero2 to isMember");
    assert.equal(await squad0.memberCount(), 3, "Didn't add hero2 to memberCount");
  });

  it("rageQuit()", async function () {
    // Add hero1 to squad0
    let tribute1 = 10 * PRECISION;
    let tribute1Str = `${tribute1}`;
    await addMember(hero1, tribute1Str, [summoner]);

    // hero1 ragequits
    await squad0.rageQuit({ from: hero1 });

    // Verify hero1 has been removed
    assert.equal(await squad0.isMember(hero1), false, "Didn't remove hero1 from isMember");
    assert.equal(await squad0.memberCount(), 1, "Didn't remove hero1 from memberCount");

    // Verify hero1 received half of squad funds
    assert.equal(await DAI.balanceOf(squad0.address), tribute1 / 2, "Didn't withdraw funds to hero1");
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
      [summoner]
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
      [summoner]
    );
    let bountyID = result0.logs[0].args.bountyID;

    // Add reward to bounty
    await addBountyReward(+bountyID, amount, BountiesV1.address, version, [summoner]);

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
      [summoner]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Refund reward
    await refundBountyReward(+bountyID, [0], BountiesV1.address, version, [summoner]);

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
      [summoner]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Change bounty's deadline
    let newDeadline = now + 2000;
    await changeBountyDeadline(+bountyID, newDeadline, BountiesV1.address, version, [summoner]);

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
      [summoner]
    );
    let bountyID = +result.logs[0].args.bountyID;

    // Let hero1 submit a fulfillment
    await BountiesV1.fulfillBounty(bountyID, "TestData1", { from: hero1 });

    // Accept bounty fulfillment
    await acceptBountySubmission(bountyID, 0, [], BountiesV1.address, version, [summoner]);

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
    await fulfillBounty(bountyID, fulfillmentData, BountiesV1.address, version, [summoner]);

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
    await fulfillBounty(bountyID, fulfillmentData, BountiesV1.address, version, [summoner]);

    // Update bounty fulfillment
    let newData = "TestData2";
    let fulfillmentID = 0;
    await updateBountyFulfillment(bountyID, fulfillmentID, newData, BountiesV1.address, version, [summoner]);
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
      [summoner]
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
      [summoner]
    );
    let bountyID = result0.logs[0].args.bountyID;

    // Add reward to bounty
    await addBountyReward(+bountyID, amount, Bounties.address, version, [summoner]);

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
      [summoner]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Refund reward
    await refundBountyReward(+bountyID, [0], Bounties.address, version, [summoner]);

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
      [summoner]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Change bounty's data
    let newData = "TestData1";
    await changeBountyData(+bountyID, newData, Bounties.address, version, [summoner]);
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
      [summoner]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Change bounty's deadline
    let newDeadline = now + 2000;
    await changeBountyDeadline(+bountyID, newDeadline, Bounties.address, version, [summoner]);

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
      [summoner]
    );
    let bountyID = +result.logs[0].args.bountyID;

    // Let hero1 submit a fulfillment with hero1 and hero2 as fulfillers
    await Bounties.fulfillBounty(hero1, bountyID, [hero1, hero2], "TestData1", { from: hero1 });

    // Accept bounty fulfillment, splitting the reward 80/20 between hero1 and hero2
    let hero1Reward = `${amountNum * 0.8}`;
    let hero2Reward = `${amountNum * 0.2}`;
    await acceptBountySubmission(bountyID, 0, [hero1Reward, hero2Reward], Bounties.address, version, [summoner]);

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
      [summoner]
    );
    let bountyID = +result.logs[0].args.bountyID;

    // Perform action
    let actionData = "TestData1";
    result = await performBountyAction(bountyID, actionData, Bounties.address, version, [summoner]);
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
    await fulfillBounty(bountyID, fulfillmentData, Bounties.address, version, [summoner]);

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
    await fulfillBounty(bountyID, fulfillmentData, Bounties.address, version, [summoner]);

    // Update bounty fulfillment
    let newData = "TestData2";
    let fulfillmentID = 0;
    await updateBountyFulfillment(bountyID, fulfillmentID, newData, Bounties.address, version, [summoner]);
  });

  it("shout()", async function() {
    let msg = "Hello world!";
    let result = await squad0.shout(msg);
    let shoutMsg = result.logs[0].args.message;
    assert.equal(shoutMsg, msg, "Message mismatch");
  });

  it("declare()", async function() {
    let msg = "Hello world!";
    let result = await declare(msg, [summoner]);
    let declareMsg = result.logs[0].args.message;
    assert.equal(declareMsg, msg, "Message mismatch");
  });
});