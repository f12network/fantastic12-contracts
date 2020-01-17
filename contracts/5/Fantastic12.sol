pragma solidity 0.5.16;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./standard_bounties/StandardBountiesWrapper.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./ShareToken.sol";

contract Fantastic12 {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;
  using StandardBountiesWrapper for address;

  // Constants
  string  public constant VERSION = "0.1.5";
  uint256 internal constant PRECISION = 10 ** 18;

  // Instance variables
  mapping(address => bool) public isMember;
  mapping(address => mapping(uint256 => bool)) public hasUsedSalt; // Stores whether a salt has been used for a member
  uint256 public MAX_MEMBERS;
  uint256 public memberCount;
  IERC20 public DAI;
  ShareToken public SHARE;
  uint256 public withdrawLimit;
  uint256 public withdrawnToday;
  uint256 public lastWithdrawTimestamp;
  uint256 public consensusThresholdPercentage; // at least (consensusThresholdPercentage * memberCount / PRECISION) approvers are needed to execute an action
  bool public initialized;

  address payable[] internal issuersOrFulfillers;
  address[] internal approvers;

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
        consensusThreshold(),
        _funcSelector,
        _funcParams,
        _members,
        _signatures,
        _salts
      ), "No consensus");
    _;
  }

  modifier withUnanimity(
    bytes4           _funcSelector,
    bytes     memory _funcParams,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  ) {
    require(
      _consensusReached(
        memberCount,
        _funcSelector,
        _funcParams,
        _members,
        _signatures,
        _salts
      ), "No unanimity");
    _;
  }

  // Events
  event Shout(string message);
  event Declare(string message);
  event AddMember(address newMember, uint256 tribute);
  event RageQuit(address quitter);
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
    address _DAI_ADDR,
    address _SHARE_ADDR,
    uint256 _summonerShareAmount
  ) public {
    require(! initialized, "Initialized");
    initialized = true;
    MAX_MEMBERS = 12;
    memberCount = 1;
    DAI = IERC20(_DAI_ADDR);
    SHARE = ShareToken(_SHARE_ADDR);
    issuersOrFulfillers = new address payable[](1);
    issuersOrFulfillers[0] = address(this);
    approvers = new address[](1);
    approvers[0] = address(this);
    withdrawLimit = PRECISION.mul(1000); // default: 1000 DAI
    consensusThresholdPercentage = PRECISION.mul(75).div(100); // default: 75%

    // Add `_summoner` as the first member
    isMember[_summoner] = true;
    // Mint share tokens for summoner
    SHARE.mint(_summoner, _summonerShareAmount);
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
    uint256[] memory _shares,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.addMembers.selector,
      abi.encode(_newMembers, _tributes, _shares),
      _members,
      _signatures,
      _salts
    )
  {
    require(_newMembers.length == _tributes.length && _tributes.length == _shares.length, "_newMembers, _tributes, _shares not of the same length");
    for (uint256 i = 0; i < _newMembers.length; i = i.add(1)) {
      _addMember(_newMembers[i], _tributes[i], _shares[i]);
    }
  }

  function _addMember(
    address _newMember,
    uint256 _tribute,
    uint256 _share
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
    memberCount = memberCount.add(1);

    // Mint shares for `_newMember`
    _mintShares(_newMember, _share);

    emit AddMember(_newMember, _tribute);
  }

  function rageQuit() public {
    uint256 shareBalance = SHARE.balanceOf(msg.sender);
    uint256 withdrawAmount = DAI.balanceOf(address(this)).mul(shareBalance).div(SHARE.totalSupply());

    // Burn `msg.sender`'s share tokens
    SHARE.burn(msg.sender, shareBalance);

    // Give `msg.sender` their portion of the squad funds
    DAI.safeTransfer(msg.sender, withdrawAmount);

    // Remove `msg.sender` from squad
    if (isMember[msg.sender]) {
      isMember[msg.sender] = false;
      memberCount = memberCount.sub(1);
    }
    emit RageQuit(msg.sender);
  }

  function rageQuitWithTokens(address[] memory _tokens) public {
    uint256 shareBalance = SHARE.balanceOf(msg.sender);
    uint256 shareTotalSupply = SHARE.totalSupply();

    // Burn `msg.sender`'s share tokens
    SHARE.burn(msg.sender, shareBalance);

    // Give `msg.sender` their portion of the squad funds
    uint256 withdrawAmount;
    for (uint256 i = 0; i < _tokens.length; i = i.add(1)) {
      if (_tokens[i] == address(0)) {
        withdrawAmount = address(this).balance.mul(shareBalance).div(shareTotalSupply);
        msg.sender.transfer(withdrawAmount);
      } else {
        IERC20 token = IERC20(_tokens[i]);
        withdrawAmount = token.balanceOf(address(this)).mul(shareBalance).div(shareTotalSupply);
        token.safeTransfer(msg.sender, withdrawAmount);
      }
    }

    // Remove `msg.sender` from squad
    if (isMember[msg.sender]) {
      isMember[msg.sender] = false;
      memberCount = memberCount.sub(1);
    }
    emit RageQuit(msg.sender);
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
      _transferDAI(_dests[i], _amounts[i]);
    }
  }

  function transferTokens(
    address payable[] memory _dests,
    uint256[] memory _amounts,
    address[] memory _tokens,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.transferTokens.selector,
      abi.encode(_dests, _amounts, _tokens),
      _members,
      _signatures,
      _salts
    )
  {
    require(_dests.length == _amounts.length && _dests.length == _tokens.length, "_dests, _amounts, _tokens not of same length");
    for (uint256 i = 0; i < _dests.length; i = i.add(1)) {
      if (_tokens[i] == address(0)) {
        _dests[i].transfer(_amounts[i]);
      } else if (_tokens[i] == address(DAI)) {
        _transferDAI(_dests[i], _amounts[i]);
      } else {
        IERC20 token = IERC20(_tokens[i]);
        token.safeTransfer(_dests[i], _amounts[i]);
      }
    }
  }

  function mintShares(
    address[] memory _dests,
    uint256[] memory _amounts,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withConsensus(
      this.mintShares.selector,
      abi.encode(_dests, _amounts),
      _members,
      _signatures,
      _salts
    )
  {
    require(_dests.length == _amounts.length, "_dests and _amounts not of same length");
    for (uint256 i = 0; i < _dests.length; i = i.add(1)) {
      _mintShares(_dests[i], _amounts[i]);
    }
  }

  /**
    Parameter setters
   */

  function setWithdrawLimit(
    uint256 _newLimit,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withUnanimity(
      this.setWithdrawLimit.selector,
      abi.encode(_newLimit),
      _members,
      _signatures,
      _salts
    )
  {
    withdrawLimit = _newLimit;
  }

  function setConsensusThreshold(
    uint256 _newThresholdPercentage,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withUnanimity(
      this.setConsensusThreshold.selector,
      abi.encode(_newThresholdPercentage),
      _members,
      _signatures,
      _salts
    )
  {
    require(_newThresholdPercentage <= PRECISION, "Consensus threshold > 1");
    consensusThresholdPercentage = _newThresholdPercentage;
  }

  function setMaxMembers(
    uint256 _newMaxMembers,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  )
    public
    withUnanimity(
      this.setMaxMembers.selector,
      abi.encode(_newMaxMembers),
      _members,
      _signatures,
      _salts
    )
  {
    require(_newMaxMembers >= memberCount, "_newMaxMembers < memberCount");
    MAX_MEMBERS = _newMaxMembers;
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
    _approveDAI(_standardBounties, _reward);

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
    _approveDAI(_standardBounties, _reward);

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

  function consensusThreshold() public view returns (uint256) {
    uint256 blockingThresholdMemberCount = PRECISION.sub(consensusThresholdPercentage).mul(memberCount).div(PRECISION);
    return memberCount.sub(blockingThresholdMemberCount);
  }

  function _consensusReached(
    uint256          _threshold,
    bytes4           _funcSelector,
    bytes     memory _funcParams,
    address[] memory _members,
    bytes[]   memory _signatures,
    uint256[] memory _salts
  ) internal returns (bool) {
    // Check if the number of signatures exceed the consensus threshold
    if (_members.length != _signatures.length || _members.length < _threshold) {
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

  function _timestampToDayID(uint256 _timestamp) internal pure returns (uint256) {
    return _timestamp.sub(_timestamp % 86400).div(86400);
  }

  // limits how much could be withdrawn each day, should be called before transfer() or approve()
  function _applyWithdrawLimit(uint256 _amount) internal {
    // check if the limit will be exceeded
    if (_timestampToDayID(now).sub(_timestampToDayID(lastWithdrawTimestamp)) >= 1) {
      // new day, don't care about existing limit
      withdrawnToday = 0;
    }
    uint256 newWithdrawnToday = withdrawnToday.add(_amount);
    require(newWithdrawnToday <= withdrawLimit, "Withdraw limit exceeded");
    withdrawnToday = newWithdrawnToday;
    lastWithdrawTimestamp = now;
  }

  function _transferDAI(address _to, uint256 _amount) internal {
    _applyWithdrawLimit(_amount);
    require(DAI.transfer(_to, _amount), "Failed DAI transfer");
  }

  function _approveDAI(address _to, uint256 _amount) internal {
    _applyWithdrawLimit(_amount);
    require(DAI.approve(_to, 0), "Failed to clear DAI approval");
    require(DAI.approve(_to, _amount), "Failed to approve DAI");
  }

  function _mintShares(address _to, uint256 _amount) internal {
    // calculate how much the shares will be worth and apply the withdraw limit
    uint256 sharesValue = _amount.mul(DAI.balanceOf(address(this))).div(_amount.add(SHARE.totalSupply()));
    _applyWithdrawLimit(sharesValue);
    require(SHARE.mint(_to, _amount), "Failed to mint shares");
  }

  function() external payable {}
}