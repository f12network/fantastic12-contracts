pragma solidity 0.5.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract ShareToken is Ownable, ERC20 {
    bool public initialized;
    string public name;
    string public symbol;
    uint8 public decimals;

    function init(
        address ownerAddr,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    )
        public
    {
        require(! initialized, "Already initialized");
        initialized = true;

        _transferOwnership(ownerAddr);
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address account, uint256 amount) public onlyOwner returns (bool) {
        _mint(account, amount);
        return true;
    }

    function burn(address account, uint256 amount) public onlyOwner returns (bool) {
        _burn(account, amount);
        return true;
    }
}