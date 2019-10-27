const Fantastic12 = artifacts.require("Fantastic12");

contract("Fantastic12", accounts => {
  const summoner = accounts[0];
  const hero1 = accounts[1];
  const hero2 = accounts[2];

  it("Add member", async function() {
    const squad0 = await Fantastic12.new(summoner);

    // Add hero1 to squad0
    let addMemberFuncSig = web3.eth.abi.encodeFunctionSignature("addMember(address,uint256,address[],bytes[])");
    let addMemberFuncParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [hero1, 0]);
    let addMemberMsgHash = await squad0.naiveMessageHash(addMemberFuncSig, addMemberFuncParams);
    let sig0 = await web3.eth.sign(addMemberMsgHash, summoner);
    await squad0.addMember(
      hero1,
      0,
      [summoner],
      [sig0]
    );

    // Verify hero1 has been added
    assert(await squad0.isMember(hero1), "Didn't add hero1 to isMember");
    assert.equal(await squad0.memberCount(), 2, "Didn't add hero1 to memberCount");

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
    const squad0 = await Fantastic12.new(summoner);

    // Add hero1 to squad0
    let addMemberFuncSig = web3.eth.abi.encodeFunctionSignature("addMember(address,uint256,address[],bytes[])");
    let addMemberFuncParams = web3.eth.abi.encodeParameters(['address', 'uint256'], [hero1, 0]);
    let addMemberMsgHash = await squad0.naiveMessageHash(addMemberFuncSig, addMemberFuncParams);
    let sig0 = await web3.eth.sign(addMemberMsgHash, summoner);
    await squad0.addMember(
      hero1,
      0,
      [summoner],
      [sig0]
    );

    // Verify hero1 has been added
    assert(await squad0.isMember(hero1), "Didn't add hero1 to isMember");
    assert.equal(await squad0.memberCount(), 2, "Didn't add hero1 to memberCount");

    // hero1 ragequits
    await squad0.rageQuit({from: hero1});

    // Verify hero1 has been removed
    assert.equal(await squad0.isMember(hero1), false, "Didn't remove hero1 from isMember");
    assert.equal(await squad0.memberCount(), 1, "Didn't remove hero1 from memberCount");
  });
});