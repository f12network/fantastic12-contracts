pragma solidity 0.5.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";

contract Fantastic12 {
  using SafeMath for uint256;

  // Constants
  uint8 public constant MAX_MEMBERS = 12;
  uint8 public constant BLOCKING_THRESHOLD = 4; // More than 1 / `BLOCKING_THRESHOLD` of members need to not consent to block consensus

  // Instance variables
  mapping(address => bool) public isMember;
  uint8 public memberCount;
  uint256 public nonce; // How many function calls have happened. Used for signature security.

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

  // Constructor
  constructor() public {
    memberCount = 0;
    nonce = 0;
  }

  // Functions
  function shout(string memory _message) public onlyMember {
    emit Shout(_message);
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
    onlyMember
    withConsensus(
      this.addMember.selector,
      abi.encode(_newMember, _tribute),
      _members,
      _signatures
    )
  {

  }

  function rageQuit() public onlyMember {

  }

  /**
    Posting bounties
   */
  function postBounty(
    string memory _dataIPFSHash,
    uint256 _deadline,
    address[] memory _members,
    bytes[]   memory _signatures
  )
    public
    onlyMember
    withConsensus(
      this.postBounty.selector,
      abi.encode(_dataIPFSHash, _deadline),
      _members,
      _signatures
    )
  {

  }

  function updateBounty(
    uint256 _bountyID,
    string memory _dataIPFSHash,
    uint256 _deadline,
    address[] memory _members,
    bytes[]   memory _signatures
  )
    public
    onlyMember
    withConsensus(
      this.updateBounty.selector,
      abi.encode(_bountyID, _dataIPFSHash, _deadline),
      _members,
      _signatures
    )
  {

  }

  function acceptBountySubmission(
    uint256 _bountyID,
    uint256 _fulfillmentID,
    uint256[] memory _tokenAmounts,
    address[] memory _members,
    bytes[]   memory _signatures
  )
    public
    onlyMember
    withConsensus(
      this.acceptBountySubmission.selector,
      abi.encode(_bountyID, _fulfillmentID, _tokenAmounts),
      _members,
      _signatures
    )
  {

  }

  /**
    Working on bounties
   */
  function performBountyAction(
    uint256 _bountyID,
    string memory _dataIPFSHash,
    address[] memory _members,
    bytes[]   memory _signatures
  )
    public
    onlyMember
    withConsensus(
      this.performBountyAction.selector,
      abi.encode(_bountyID, _dataIPFSHash),
      _members,
      _signatures
    )
  {

  }

  function fulfillBounty(
    uint256 _bountyID,
    string memory _dataIPFSHash,
    address[] memory _members,
    bytes[]   memory _signatures
  )
    public
    onlyMember
    withConsensus(
      this.fulfillBounty.selector,
      abi.encode(_bountyID, _dataIPFSHash),
      _members,
      _signatures
    )
  {

  }

  function updateBountyFulfillment(
    uint256 _bountyID,
    uint256 _fulfillmentID,
    string memory _dataIPFSHash,
    address[] memory _members,
    bytes[]   memory _signatures
  )
    public
    onlyMember
    withConsensus(
      this.updateBountyFulfillment.selector,
      abi.encode(_bountyID, _fulfillmentID, _dataIPFSHash),
      _members,
      _signatures
    )
  {

  }

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
}