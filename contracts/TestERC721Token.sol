pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestERC721Token is ERC721 {
    uint tokenId = 1;

    constructor() ERC721("TestERC721Token", "721") {
    }

    function mint(address owner) external {
        _safeMint(owner, tokenId++);
    }
}