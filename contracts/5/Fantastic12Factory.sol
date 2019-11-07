pragma solidity 0.5.12;

import "./Fantastic12.sol";

contract Fantastic12Factory {
  address public constant DAI_ADDR = 0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359;

  event CreateSquad(address squad);

  function createSquad(address _summoner)
    public
    returns (Fantastic12 _squad)
  {
    _squad = new Fantastic12(
      _summoner,
      DAI_ADDR
    );
    emit CreateSquad(address(_squad));
  }
}