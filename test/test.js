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

  beforeEach(async function () {
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

  it("Add member", async function() {
    // Approve tribute for hero1
    let tribute1 = `${10 * PRECISION}`;
    await DAI.approve(squad0.address, tribute1, {from: hero1});

    // Add hero1 to squad0
    let addMemberFuncSig = web3.eth.abi.encodeFunctionSignature("addMember(address,uint256,address[],bytes[])");
    let addMemberFuncParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [hero1, tribute1]);
    let addMemberMsgHash = await squad0.naiveMessageHash(addMemberFuncSig, addMemberFuncParams);
    let sig0 = await web3.eth.sign(addMemberMsgHash, summoner);
    await squad0.addMember(
      hero1,
      tribute1,
      [summoner],
      [sig0]
    );

    // Verify hero1 has been added
    assert(await squad0.isMember(hero1), "Didn't add hero1 to isMember");
    assert.equal(await squad0.memberCount(), 2, "Didn't add hero1 to memberCount");

    // Verify tribute has been transferred
    assert.equal(await DAI.balanceOf(squad0.address), tribute1, "Didn't transfer hero1's tribute");

    // Add hero2 to squad0
    addMemberFuncSig = web3.eth.abi.encodeFunctionSignature("addMember(address,uint256,address[],bytes[])");
    addMemberFuncParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [hero2, 0]);
    addMemberMsgHash = await squad0.naiveMessageHash(addMemberFuncSig, addMemberFuncParams);
    sig0 = await web3.eth.sign(addMemberMsgHash, summoner);
    const sig1 = await web3.eth.sign(addMemberMsgHash, hero1);
    await squad0.addMember(
      hero2,
      0,
      [summoner, hero1],
      [sig0, sig1]
    );

    // Verify hero2 has been added
    assert(await squad0.isMember(hero2), "Didn't add hero2 to isMember");
    assert.equal(await squad0.memberCount(), 3, "Didn't add hero2 to memberCount");
  });

  it("Rage quit", async function() {
    // Approve tribute for hero1
    let tribute1 = 10 * PRECISION;
    let tribute1Str = `${tribute1}`;
    await DAI.approve(squad0.address, tribute1Str, {from: hero1});

    // Add hero1 to squad0
    let addMemberFuncSig = web3.eth.abi.encodeFunctionSignature("addMember(address,uint256,address[],bytes[])");
    let addMemberFuncParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [hero1, tribute1Str]);
    let addMemberMsgHash = await squad0.naiveMessageHash(addMemberFuncSig, addMemberFuncParams);
    let sig0 = await web3.eth.sign(addMemberMsgHash, summoner);
    await squad0.addMember(
      hero1,
      tribute1Str,
      [summoner],
      [sig0]
    );

    // Verify hero1 has been added
    assert(await squad0.isMember(hero1), "Didn't add hero1 to isMember");
    assert.equal(await squad0.memberCount(), 2, "Didn't add hero1 to memberCount");

    // Verify tribute has been transferred
    assert.equal(await DAI.balanceOf(squad0.address), tribute1, "Didn't transfer hero1's tribute");

    // hero1 ragequits
    await squad0.rageQuit({from: hero1});

    // Verify hero1 has been removed
    assert.equal(await squad0.isMember(hero1), false, "Didn't remove hero1 from isMember");
    assert.equal(await squad0.memberCount(), 1, "Didn't remove hero1 from memberCount");

    // Verify hero1 received half of squad funds
    assert.equal(await DAI.balanceOf(squad0.address), tribute1 / 2, "Didn't withdraw funds to hero1");
  });
});