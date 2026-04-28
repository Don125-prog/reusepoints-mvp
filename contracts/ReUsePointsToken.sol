// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ReUsePointsToken is ERC20 {
    address public owner;

    constructor(uint256 initialSupply) ERC20("ReUsePoints", "RUP") {
        require(initialSupply > 0, "Initial supply must be greater than zero");
        owner = msg.sender;
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}