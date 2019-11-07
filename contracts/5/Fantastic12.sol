pragma solidity 0.5.12;
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
  uint8 public memberCount;
  uint256 public nonce; // How many function calls have happened. Used for signature security.
  IERC20 public DAI;
  address payable[] public issuersOrFulfillers;
  address[] public approvers;

  // Modifiers
  modifier onlyMember {
    require(isMember[msg.sender], "Not member");
    _;
  }

  modifier withConsensus(
    bytes4           _funcSelector,
    bytes     memory _funcParams,
    address[] memory _members,
    bytes[]   memory _signatures
  ) {
    require(
      _consensusReached(
        _funcSelector,
        _funcParams,
        _members,
        _signatures
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

  // Constructor
  constructor(
    address _summoner,
    address _DAI_ADDR
  ) public {
    memberCount = 1;
    nonce = 0;
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.declare.selector,
      abi.encode(_message),
      _members,
      _signatures
    )
  {
    emit Declare(_message);
  }

  /**
    Member management
   */

  function addMember(
    address _newMember,
    uint256 _tribute,
    address[] memory _members,
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.addMember.selector,
      abi.encode(_newMember, _tribute),
      _members,
      _signatures
    )
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
    Posting bounties
   */

  function postBounty(
    string memory _dataIPFSHash,
    uint256 _deadline,
    uint256 _reward,
    address _standardBounties,
    uint256 _standardBountiesVersion,
    address[] memory _members,
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.postBounty.selector,
      abi.encode(_dataIPFSHash, _deadline, _reward, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.addBountyReward.selector,
      abi.encode(_bountyID, _reward, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.refundBountyReward.selector,
      abi.encode(_bountyID, _contributionIDs, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.changeBountyData.selector,
      abi.encode(_bountyID, _dataIPFSHash, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.changeBountyDeadline.selector,
      abi.encode(_bountyID, _deadline, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.acceptBountySubmission.selector,
      abi.encode(_bountyID, _fulfillmentID, _tokenAmounts, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.performBountyAction.selector,
      abi.encode(_bountyID, _dataIPFSHash, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.fulfillBounty.selector,
      abi.encode(_bountyID, _dataIPFSHash, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
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
    bytes[]   memory _signatures
  )
    public
    withConsensus(
      this.updateBountyFulfillment.selector,
      abi.encode(_bountyID, _fulfillmentID, _dataIPFSHash, _standardBounties, _standardBountiesVersion),
      _members,
      _signatures
    )
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
    bytes memory _funcParams
  ) public view returns (bytes32) {
    return keccak256(abi.encodeWithSelector(_funcSelector, _funcParams, nonce, address(this)));
  }

  function consensusThreshold() public view returns (uint8) {
    uint8 blockingThresholdMemberCount = memberCount / BLOCKING_THRESHOLD;
    return memberCount - blockingThresholdMemberCount;
  }

  function _consensusReached(
    bytes4           _funcSelector,
    bytes     memory _funcParams,
    address[] memory _members,
    bytes[]   memory _signatures
  ) internal returns (bool) {
    // Hash of _funcSelector + _funcParams + nonce + address(this)
    bytes32 msgHash = ECDSA.toEthSignedMessageHash(naiveMessageHash(_funcSelector, _funcParams));

    // Check if the number of signatures exceed the consensus threshold
    if (_members.length != _signatures.length || _members.length < consensusThreshold()) {
      return false;
    }
    // Check if each signature is valid and signed by a member
    for (uint256 i = 0; i < _members.length; i = i.add(1)) {
      address recoveredAddress = ECDSA.recover(msgHash, _signatures[i]);
      if (recoveredAddress != _members[i] || !isMember[recoveredAddress]) {
        // Invalid signature
        return false;
      }
    }

    // Increment the nonce
    nonce = nonce.add(1);

    return true;
  }

  function() external payable {
    revert("Doesn't support receiving Ether");
  }
}