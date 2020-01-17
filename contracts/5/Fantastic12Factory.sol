pragma solidity 0.5.16;

import "./Fantastic12.sol";

contract Fantastic12Factory {
  address public constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

  event CreateSquad(address indexed summoner, address squad);

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
    ShareToken shareToken = new ShareToken();
    _squad = new Fantastic12();

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
}