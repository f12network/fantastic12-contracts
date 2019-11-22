pragma solidity 0.5.13;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./standard_bounties/StandardBountiesWrapper.sol";

contract Fantastic12 {
  using SafeMath for uint256;
  using StandardBountiesWrapper for address;

  // Constants
  uint8 public constant MAX_MEMBERS = 12;
  uint8 public constant BLOCKING_THRESHOLD = 4; // More than 1 / `BLOCKING_THRESHOLD` of members need to not consent to block consensus

  // Instance variables
  mapping(address => bool) public isMember;
  mapping(address => mapping(uint256 => bool)) public hasUsedSalt; // Stores whether a salt has been used for a member
  uint8 public memberCount;
  IERC20 public DAI;
  address payable[] public issuersOrFulfillers;
  address[] public approvers;
  bool initialized;

  // Modifiers
  modifier onlyMember {
    require(isMember[msg.sender], "Not member");
    _;
  }

  modifier withConsensus(
    bytes4           _funcSelector,
    bytes     memory _funcParams,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  ) {
    require(
      _consensusReached(
        _funcSelector,
        _funcParams,
        _members,
        _signatures,
        _salts
      ), "No consensus");
    _;
  }

  // Events
  event Shout(string message);
  event Declare(string message);
  event AddMember(address newMember, uint256 tribute);
  event RageQuit(address quitter, uint256 fundsWithdrawn);
  event PostBounty(uint256 bountyID, uint256 reward);
  event AddBountyReward(uint256 bountyID, uint256 reward);
  event RefundBountyReward(uint256 bountyID, uint256 refundAmount);
  event ChangeBountyData(uint256 bountyID);
  event ChangeBountyDeadline(uint256 bountyID);
  event AcceptBountySubmission(uint256 bountyID, uint256 fulfillmentID);
  event PerformBountyAction(uint256 bountyID);
  event FulfillBounty(uint256 bountyID);
  event UpdateBountyFulfillment(uint256 bountyID, uint256 fulfillmentID);

  // Initializer
  function init(
    address _summoner,
    address _DAI_ADDR
  ) public {
    require(! initialized, "Initialized");
    initialized = true;
    memberCount = 1;
    DAI = IERC20(_DAI_ADDR);
    issuersOrFulfillers = new address payable[](1);
    issuersOrFulfillers[0] = address(this);
    approvers = new address[](1);
    approvers[0] = address(this);

    // Add `_summoner` as the first member
    isMember[_summoner] = true;
  }

  // Functions

  /**
    Censorship-resistant messaging
   */
  function shout(string memory _message) public onlyMember {
    emit Shout(_message);
  }

  function declare(
    string memory _message,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.declare.selector,
      abi.encode(_message),
      _members,
      _signatures,
      _salts
    )
  {
    emit Declare(_message);
  }

  /**
    Member management
   */

  function addMembers(
    address[] memory _newMembers,
    uint256[] memory _tributes,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.addMembers.selector,
      abi.encode(_newMembers, _tributes),
      _members,
      _signatures,
      _salts
    )
  {
    require(_newMembers.length == _tributes.length, "_newMembers not same length as _tributes");
    for (uint256 i = 0; i < _newMembers.length; i = i.add(1)) {
      _addMember(_newMembers[i], _tributes[i]);
    }
  }

  function _addMember(
    address _newMember,
    uint256 _tribute
  )
    internal
  {
    require(_newMember != address(0), "Member cannot be zero address");
    require(!isMember[_newMember], "Member cannot be added twice");
    require(memberCount < MAX_MEMBERS, "Max member count reached");

    // Receive tribute from `_newMember`
    require(DAI.transferFrom(_newMember, address(this), _tribute), "Tribute transfer failed");

    // Add `_newMember` to squad
    isMember[_newMember] = true;
    memberCount += 1;

    emit AddMember(_newMember, _tribute);
  }

  function rageQuit() public onlyMember {
    // Give `msg.sender` their portion of the squad funds
    uint256 withdrawAmount = DAI.balanceOf(address(this)).div(memberCount);
    require(DAI.transfer(msg.sender, withdrawAmount), "Withdraw failed");

    // Remove `msg.sender` from squad
    isMember[msg.sender] = false;
    memberCount -= 1;
    emit RageQuit(msg.sender, withdrawAmount);
  }

  /**
    Fund management
   */

  function transferDAI(
    address[] memory _dests,
    uint256[] memory _amounts,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.transferDAI.selector,
      abi.encode(_dests, _amounts),
      _members,
      _signatures,
      _salts
    )
  {
    require(_dests.length == _amounts.length, "_dests not same length as _amounts");
    for (uint256 i = 0; i < _dests.length; i = i.add(1)) {
      require(DAI.transfer(_dests[i], _amounts[i]), "Failed DAI transfer");
    }
  }

  /**
    Posting bounties
   */

  function postBounty(
    string memory _dataIPFSHash,
    uint256 _deadline,
    uint256 _reward,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.postBounty.selector,
      abi.encode(_dataIPFSHash, _deadline, _reward, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
    returns (uint256 _bountyID)
  {
    return _postBounty(_dataIPFSHash, _deadline, _reward, _standardBounties, _standardBountiesVersion);
  }

  function _postBounty(
    string memory _dataIPFSHash,
    uint256 _deadline,
    uint256 _reward,
    address _standardBounties,
    uint256 _standardBountiesVersion
  )
    internal
    returns (uint256 _bountyID)
  {
    require(_reward > 0, "Reward can't be 0");

    // Approve DAI reward to bounties contract
    require(DAI.approve(_standardBounties, 0), "Failed to clear DAI approval");
    require(DAI.approve(_standardBounties, _reward), "Failed to approve bounty reward");

    _bountyID = _standardBounties.issueAndContribute(
      _standardBountiesVersion,
      address(this),
      issuersOrFulfillers,
      approvers,
      _dataIPFSHash,
      _deadline,
      address(DAI),
      _reward
    );

    emit PostBounty(_bountyID, _reward);
  }

  function addBountyReward(
    uint256 _bountyID,
    uint256 _reward,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.addBountyReward.selector,
      abi.encode(_bountyID, _reward, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
  {
    // Approve DAI reward to bounties contract
    require(DAI.approve(_standardBounties, 0), "Failed to clear DAI approval");
    require(DAI.approve(_standardBounties, _reward), "Failed to approve bounty reward");

    _standardBounties.contribute(
      _standardBountiesVersion,
      address(this),
      _bountyID,
      _reward
    );

    emit AddBountyReward(_bountyID, _reward);
  }

  function refundBountyReward(
    uint256 _bountyID,
    uint256[] memory _contributionIDs,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.refundBountyReward.selector,
      abi.encode(_bountyID, _contributionIDs, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
  {
    uint256 beforeBalance = DAI.balanceOf(address(this));
    _standardBounties.refundMyContributions(
      _standardBountiesVersion,
      address(this),
      _bountyID,
      _contributionIDs
    );

    emit RefundBountyReward(_bountyID, DAI.balanceOf(address(this)).sub(beforeBalance));
  }

  function changeBountyData(
    uint256 _bountyID,
    string memory _dataIPFSHash,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.changeBountyData.selector,
      abi.encode(_bountyID, _dataIPFSHash, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
  {
    _standardBounties.changeData(
      _standardBountiesVersion,
      address(this),
      _bountyID,
      _dataIPFSHash
    );
    emit ChangeBountyData(_bountyID);
  }

  function changeBountyDeadline(
    uint256 _bountyID,
    uint256 _deadline,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.changeBountyDeadline.selector,
      abi.encode(_bountyID, _deadline, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
  {
    _standardBounties.changeDeadline(
      _standardBountiesVersion,
      address(this),
      _bountyID,
      _deadline
    );
    emit ChangeBountyDeadline(_bountyID);
  }

  function acceptBountySubmission(
    uint256 _bountyID,
    uint256 _fulfillmentID,
    uint256[] memory _tokenAmounts,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.acceptBountySubmission.selector,
      abi.encode(_bountyID, _fulfillmentID, _tokenAmounts, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
  {
    _standardBounties.acceptFulfillment(
      _standardBountiesVersion,
      address(this),
      _bountyID,
      _fulfillmentID,
      _tokenAmounts
    );
    emit AcceptBountySubmission(_bountyID, _fulfillmentID);
  }

  /**
    Working on bounties
   */

  function performBountyAction(
    uint256 _bountyID,
    string memory _dataIPFSHash,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.performBountyAction.selector,
      abi.encode(_bountyID, _dataIPFSHash, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
  {
    _standardBounties.performAction(
      _standardBountiesVersion,
      address(this),
      _bountyID,
      _dataIPFSHash
    );
    emit PerformBountyAction(_bountyID);
  }

  function fulfillBounty(
    uint256 _bountyID,
    string memory _dataIPFSHash,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.fulfillBounty.selector,
      abi.encode(_bountyID, _dataIPFSHash, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
  {
    _standardBounties.fulfillBounty(
      _standardBountiesVersion,
      address(this),
      _bountyID,
      issuersOrFulfillers,
      _dataIPFSHash
    );
    emit FulfillBounty(_bountyID);
  }

  function updateBountyFulfillment(
    uint256 _bountyID,
    uint256 _fulfillmentID,
    string memory _dataIPFSHash,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.updateBountyFulfillment.selector,
      abi.encode(_bountyID, _fulfillmentID, _dataIPFSHash, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures,
      _salts
    )
  {
    _updateBountyFulfillment(_bountyID, _fulfillmentID, _dataIPFSHash, _standardBounties, _standardBountiesVersion);
  }

  function _updateBountyFulfillment(
    uint256 _bountyID,
    uint256 _fulfillmentID,
    string memory _dataIPFSHash,
    address _standardBounties,
    uint256 _standardBountiesVersion
  )
    internal
  {
    _standardBounties.updateFulfillment(
      _standardBountiesVersion,
      address(this),
      _bountyID,
      _fulfillmentID,
      issuersOrFulfillers,
      _dataIPFSHash
    );
    emit UpdateBountyFulfillment(_bountyID, _fulfillmentID);
  }

  /**
    Consensus
   */

  function naiveMessageHash(
    bytes4       _funcSelector,
    bytes memory _funcParams,
    uint256      _salt
  ) public view returns (bytes32) {
    // "|END|" is used to separate _funcParams from the rest, to prevent maliciously ambiguous signatures
    return keccak256(abi.encodeWithSelector(_funcSelector, _funcParams, "|END|", _salt, address(this)));
  }

  function consensusThreshold() public view returns (uint8) {
    uint8 blockingThresholdMemberCount = memberCount / BLOCKING_THRESHOLD;
    return memberCount - blockingThresholdMemberCount;
  }

  function _consensusReached(
    bytes4           _funcSelector,
    bytes     memory _funcParams,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  ) internal returns (bool) {
    // Check if the number of signatures exceed the consensus threshold
    if (_members.length != _signatures.length || _members.length < consensusThreshold()) {
      return false;
    }
    // Check if each signature is valid and signed by a member
    for (uint256 i = 0; i < _members.length; i = i.add(1)) {
      address member = _members[i];
      uint256 salt = _salts[i];
      if (!isMember[member] || hasUsedSalt[member][salt]) {
        // Invalid member or salt already used
        return false;
      }

      bytes32 msgHash = ECDSA.toEthSignedMessageHash(naiveMessageHash(_funcSelector, _funcParams, salt));
      address recoveredAddress = ECDSA.recover(msgHash, _signatures[i]);
      if (recoveredAddress != member) {
        // Invalid signature
        return false;
      }

      // Signature valid, record use of salt
      hasUsedSalt[member][salt] = true;
    }

    return true;
  }

  function() external payable {
    revert("Doesn't support receiving Ether");
  }
}