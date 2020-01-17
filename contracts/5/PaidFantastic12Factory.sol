pragma solidity 0.5.16;

import "./Fantastic12.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./EIP1167/CloneFactory.sol";

contract PaidFantastic12Factory is Ownable, CloneFactory {
  address public constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

  uint256 public priceInDAI = 0;
  address public beneficiary = 0x332D87209f7c8296389C307eAe170c2440830A47;
  address public squadTemplate;
  address public shareTokenTemplate;

  event CreateSquad(address indexed summoner, address squad);

  constructor(address _squadTemplate, address _shareTokenTemplate) public {
    squadTemplate = _squadTemplate;
    shareTokenTemplate = _shareTokenTemplate;
  }

  function createSquad(
    address _summoner,
    string memory _shareTokenName,
    string memory _shareTokenSymbol,
    uint8 _shareTokenDecimals,
    uint256 _summonerShareAmount
  )
    public
    returns (Fantastic12 _squad)
  {
    // Transfer fee from msg.sender
    if (priceInDAI > 0) {
      IERC20 dai = IERC20(DAI_ADDR);
      require(dai.transferFrom(msg.sender, address(this), priceInDAI), "DAI transferFrom failed");
      require(dai.transfer(beneficiary, priceInDAI), "DAI transfer failed");
    }

    // Create squad
    ShareToken shareToken = ShareToken(createClone(shareTokenTemplate));
    _squad = Fantastic12(_toPayableAddr(createClone(squadTemplate)));
    shareToken.init(
      address(_squad),
      _shareTokenName,
      _shareTokenSymbol,
      _shareTokenDecimals
    );
    _squad.init(
      _summoner,
      DAI_ADDR,
      address(shareToken),
      _summonerShareAmount
    );
    emit CreateSquad(_summoner, address(_squad));
  }

  function setPrice(uint256 _newPrice) public onlyOwner {
    priceInDAI = _newPrice;
  }

  function setBeneficiary(address _newBeneficiary) public onlyOwner {
    require(_newBeneficiary != address(0), "0 address");
    beneficiary = _newBeneficiary;
  }

  function _toPayableAddr(address _addr) internal pure returns (address payable) {
    return address(uint160(_addr));
  }
}