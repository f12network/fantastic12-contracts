pragma solidity 0.5.16;

import "./Fantastic12.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./EIP1167/CloneFactory.sol";

contract PaidFantastic12Factory is Ownable, CloneFactory {
  address public constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

  address public squadTemplate;
  address public shareTokenTemplate;
  address public feeModel;

  event CreateSquad(address indexed summoner, address squad);

  constructor(address _squadTemplate, address _shareTokenTemplate, address _feeModel) public {
    squadTemplate = _squadTemplate;
    shareTokenTemplate = _shareTokenTemplate;
    feeModel = _feeModel;
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
      feeModel,
      _summonerShareAmount
    );
    emit CreateSquad(_summoner, address(_squad));
  }

  function setFeeModel(address _addr) public onlyOwner {
    feeModel = _addr;
  }

  function _toPayableAddr(address _addr) internal pure returns (address payable) {
    return address(uint160(_addr));
  }
}