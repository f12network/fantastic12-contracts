pragma solidity 0.5.16;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract FeeModel is Ownable {
  using SafeMath for uint256;

  uint256 internal constant PRECISION = 10 ** 18;

  address payable public beneficiary = 0x332D87209f7c8296389C307eAe170c2440830A47;

  function getFee(uint256 _memberCount, uint256 _txAmount) public pure returns (uint256) {
    uint256 feePercentage;

    if (_memberCount <= 4) {
      feePercentage = _percent(0); // 1% for 1-4 members
    } else if (_memberCount <= 12) {
      feePercentage = _percent(3); // 3% for 5-12 members
    } else {
      feePercentage = _percent(5); // 5% for >12 members
    }

    return _txAmount.mul(feePercentage).div(PRECISION);
  }

  function setBeneficiary(address payable _addr) public onlyOwner {
    require(_addr != address(0), "0 address");
    beneficiary = _addr;
  }

  function _percent(uint256 _percentage) internal pure returns (uint256) {
    return PRECISION.mul(_percentage).div(100);
  }
}