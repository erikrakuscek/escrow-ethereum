pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20Token is ERC20 {
    constructor() ERC20("TestERC20Token", "20") {
    }

    function mint(address owner, uint amount) external {
        _mint(owner, amount);
    }
}