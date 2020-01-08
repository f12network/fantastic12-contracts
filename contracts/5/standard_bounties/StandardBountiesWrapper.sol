pragma solidity 0.5.16;

import "./v1/IStandardBountiesV1.sol";
import "./v2/StandardBounties.sol";

library StandardBountiesWrapper {
  function issueAndContribute(
    address _standardBounties,
    uint _standardBountiesVersion,
    address payable _sender,
    address payable[] memory _issuers,
    address[] memory _approvers,
    string memory _data,
    uint _deadline,
    address _token,
    uint _depositAmount)
    internal
    returns(uint)
  {
    if (_standardBountiesVersion == 1) {
      IStandardBountiesV1 BOUNTIES = IStandardBountiesV1(_standardBounties);
      return BOUNTIES.issueAndActivateBounty(
        _sender,
        _deadline,
        _data,
        _depositAmount,
        _sender,
        true,
        _token,
        _depositAmount
      );
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      return BOUNTIES.issueAndContribute(
        _sender,
        _issuers,
        _approvers,
        _data,
        _deadline,
        _token,
        20, // ERC20
        _depositAmount
      );
    }
  }

  function contribute(
    address _standardBounties,
    uint _standardBountiesVersion,
    address payable _sender,
    uint _bountyId,
    uint _amount)
    internal
  {
    if (_standardBountiesVersion == 1) {
      IStandardBountiesV1 BOUNTIES = IStandardBountiesV1(_standardBounties);
      (,,uint fulfillmentAmount,,,) = BOUNTIES.getBounty(_bountyId);
      BOUNTIES.increasePayout(
        _bountyId,
        add(fulfillmentAmount, _amount),
        _amount
      );
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      BOUNTIES.contribute(
        _sender,
        _bountyId,
        _amount
      );
    }
  }

  function refundMyContributions(
    address _standardBounties,
    uint _standardBountiesVersion,
    address _sender,
    uint _bountyId,
    uint[] memory _contributionIds)
    internal
  {
    if (_standardBountiesVersion == 1) {
      IStandardBountiesV1 BOUNTIES = IStandardBountiesV1(_standardBounties);
      BOUNTIES.killBounty(
        _bountyId
      );
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      BOUNTIES.refundMyContributions(
        _sender,
        _bountyId,
        _contributionIds
      );
    }
  }

  function changeData(
    address _standardBounties,
    uint _standardBountiesVersion,
    address _sender,
    uint _bountyId,
    string memory _data)
    internal
  {
    if (_standardBountiesVersion == 1) {
      revert("Can't change data of V1 bounty");
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      BOUNTIES.changeData(
        _sender,
        _bountyId,
        0,
        _data
      );
    }
  }

  function changeDeadline(
    address _standardBounties,
    uint _standardBountiesVersion,
    address _sender,
    uint _bountyId,
    uint _deadline)
    internal
  {
    if (_standardBountiesVersion == 1) {
      IStandardBountiesV1 BOUNTIES = IStandardBountiesV1(_standardBounties);
      BOUNTIES.extendDeadline(
        _bountyId,
        _deadline
      );
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      BOUNTIES.changeDeadline(
        _sender,
        _bountyId,
        0,
        _deadline
      );
    }
  }

  function acceptFulfillment(
    address _standardBounties,
    uint _standardBountiesVersion,
    address _sender,
    uint _bountyId,
    uint _fulfillmentId,
    uint[] memory _tokenAmounts)
    internal
  {
    if (_standardBountiesVersion == 1) {
      IStandardBountiesV1 BOUNTIES = IStandardBountiesV1(_standardBounties);
      BOUNTIES.acceptFulfillment(
        _bountyId,
        _fulfillmentId
      );
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      BOUNTIES.acceptFulfillment(
        _sender,
        _bountyId,
        _fulfillmentId,
        0,
        _tokenAmounts
      );
    }
  }

  function performAction(
    address _standardBounties,
    uint _standardBountiesVersion,
    address _sender,
    uint _bountyId,
    string memory _data)
    internal
  {
    if (_standardBountiesVersion == 1) {
      revert("Not supported by V1");
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      BOUNTIES.performAction(
        _sender,
        _bountyId,
        _data
      );
    }
  }

  function fulfillBounty(
    address _standardBounties,
    uint _standardBountiesVersion,
    address _sender,
    uint _bountyId,
    address payable[] memory  _fulfillers,
    string memory _data)
    internal
  {
    if (_standardBountiesVersion == 1) {
      IStandardBountiesV1 BOUNTIES = IStandardBountiesV1(_standardBounties);
      BOUNTIES.fulfillBounty(
        _bountyId,
        _data
      );
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      BOUNTIES.fulfillBounty(
        _sender,
        _bountyId,
        _fulfillers,
        _data
      );
    }
  }

  function updateFulfillment(
    address _standardBounties,
    uint _standardBountiesVersion,
    address _sender,
    uint _bountyId,
    uint _fulfillmentId,
    address payable[] memory _fulfillers,
    string memory _data)
    internal
  {
    if (_standardBountiesVersion == 1) {
      IStandardBountiesV1 BOUNTIES = IStandardBountiesV1(_standardBounties);
      BOUNTIES.updateFulfillment(
        _bountyId,
        _fulfillmentId,
        _data
      );
    } else if (_standardBountiesVersion == 2) {
      StandardBounties BOUNTIES = StandardBounties(_standardBounties);
      BOUNTIES.updateFulfillment(
        _sender,
        _bountyId,
        _fulfillmentId,
        _fulfillers,
        _data
      );
    }
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "SafeMath: addition overflow");

    return c;
  }
}