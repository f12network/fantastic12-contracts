pragma solidity 0.5.16;

import "./Fantastic12.sol";

contract Fantastic12Factory {
  address public constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

  event CreateSquad(address indexed summoner, address squad);

  function createSquad(address _summoner, uint256 _withdrawLimit, uint256 _consensusThreshold)
    public
    returns (Fantastic12 _squad)
  {
    _squad = new Fantastic12();
    _squad.init(
      _summoner,
      DAI_ADDR,
      _withdrawLimit,
      _consensusThreshold
    );
    emit CreateSquad(_summoner, address(_squad));
  }
}