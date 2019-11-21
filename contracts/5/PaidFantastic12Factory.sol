pragma solidity 0.5.12;

import "./Fantastic12.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract PaidFantastic12Factory is Ownable {
  address public constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

  uint256 public priceInDAI = 0;
  address public beneficiary = 0x332D87209f7c8296389C307eAe170c2440830A47;

  event CreateSquad(address indexed summoner, address squad);

  function createSquad(address _summoner)
    public
    returns (Fantastic12 _squad)
  {
    // Transfer fee from msg.sender
    if (priceInDAI > 0) {
      IERC20 dai = IERC20(DAI_ADDR);
      require(dai.transferFrom(msg.sender, beneficiary, priceInDAI), "Fee transfer failed");
    }

    // Create squad
    _squad = new Fantastic12(
      _summoner,
      DAI_ADDR
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
}