const Fantastic12 = artifacts.require("Fantastic12");
const StandardBounties = artifacts.require("StandardBounties");
const MockERC20 = artifacts.require("MockERC20");

const PRECISION = 1e18;

contract("Fantastic12", accounts => {
  const summoner = accounts[0];
  const hero1 = accounts[1];
  const hero2 = accounts[2];

  let DAI;
  let Bounties;
  let squad0;

  let addMember = async function(newMember, tribute, approvers) {
    // Approve tribute for newMember
    await DAI.approve(squad0.address, tribute, {from: newMember});

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
  }

  let postBounty = async function(data, deadline, reward, approvers) {
    let paramTypes = ['string', 'uint256', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`postBounty(${paramTypes},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [data, deadline, reward]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.postBounty(
      data,
      deadline,
      reward,
      approvers,
      sigs
    );
  }

  let addBountyReward = async function(bountyID, reward, approvers) {
    let paramTypes = ['uint256', 'uint256'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`addBountyReward(${paramTypes},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, reward]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.addBountyReward(
      bountyID,
      reward,
      approvers,
      sigs
    );
  }

  let refundBountyReward = async function(bountyID, contributionIDs, approvers) {
    let paramTypes = ['uint256', 'uint256[]'];
    let funcSig = web3.eth.abi.encodeFunctionSignature(`refundBountyReward(${paramTypes},address[],bytes[])`);
    let funcParams = web3.eth.abi.encodeParameters(paramTypes, [bountyID, contributionIDs]);
    let msgHash = await squad0.naiveMessageHash(funcSig, funcParams);
    let sigs = await Promise.all(approvers.map(async (approver) => {
      return await web3.eth.sign(msgHash, approver);
    }));

    return await squad0.refundBountyReward(
      bountyID,
      contributionIDs,
      approvers,
      sigs
    );
  }

  beforeEach(async function() {
    // Init contracts
    DAI = await MockERC20.new();
    Bounties = await StandardBounties.new();
    squad0 = await Fantastic12.new(summoner, DAI.address, Bounties.address);

    // Mint DAI for accounts
    const mintAmount = `${100 * PRECISION}`;
    await DAI.mint(summoner, mintAmount);
    await DAI.mint(hero1, mintAmount);
    await DAI.mint(hero2, mintAmount);
  });

  it("addMember()", async function() {
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

  it("rageQuit()", async function() {
    // Add hero1 to squad0
    let tribute1 = 10 * PRECISION;
    let tribute1Str = `${tribute1}`;
    await addMember(hero1, tribute1Str, [summoner]);

    // hero1 ragequits
    await squad0.rageQuit({from: hero1});

    // Verify hero1 has been removed
    assert.equal(await squad0.isMember(hero1), false, "Didn't remove hero1 from isMember");
    assert.equal(await squad0.memberCount(), 1, "Didn't remove hero1 from memberCount");

    // Verify hero1 received half of squad funds
    assert.equal(await DAI.balanceOf(squad0.address), tribute1 / 2, "Didn't withdraw funds to hero1");
  });

  it("postBounty()", async function() {
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

  it("addBountyReward()", async function() {
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
      [summoner]
    );
    let bountyID = result0.logs[0].args.bountyID;

    // Add reward to bounty
    await addBountyReward(+bountyID, amount, [summoner]);

    // Verify that reward has been added
    let bountyInfo = await Bounties.getBounty(bountyID);
    assert.equal(bountyInfo.balance, `${+amount * 2}`, "Reward mismatch");
  });

  it("refundBountyReward()", async function() {
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
      [summoner]
    );
    let bountyID = result.logs[0].args.bountyID;

    // Refund reward
    await refundBountyReward(+bountyID, [0], [summoner]);

    // Verify the reward has been refunded
    let bountyInfo = await Bounties.getBounty(bountyID);
    assert.equal(bountyInfo.balance, 0, "Refund mismatch");
  });

  it("changeBountyData()", async function() {
    // Post a bounty
    // Change bounty's data
    // Verify that the data was changed
  });

  it("changeBountyDeadline()", async function() {
    // Post a bounty
    // Change bounty's deadline
    // Verify that the deadline wad changed
  });

  it("acceptBountySubmission()", async function() {
    // Transfer DAI to squad
    // Post a bounty with reward
    // Let hero1 submit a fulfillment with hero1 and hero2 as fulfillers
    // Accept bounty fulfillment, splitting the reward 80/20 between hero1 and hero2
    // Verify that the bounty was fulfilled
    // Verify that hero1 and hero2 got the correct rewards
  });

  it("performBountyAction()", async function() {
    // Perform action
    // Verify that an event was emitted by StandardBounties
  });

  it("fulfillBounty()", async function() {
    // Let hero1 post a bounty with reward
    // Submit bounty fulfillment
    // Verify that the fulfillment has the correct info
    // Let hero1 accept the fulfillment
    // Verify that the bounty was fulfilled
    // Verify that the squad received the reward
  });

  it("updateBountyFulfillment()", async function() {
    // Let hero1 post a bounty
    // Submit bounty fulfillment
    // Update bounty fulfillment
    // Verify that the fulfillment info was changed
  });
});