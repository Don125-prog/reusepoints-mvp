pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ReUsePointsToken is ERC20 {
    address public owner;

    event TokensRewarded(address indexed user, uint256 amount);
    event TokensBurned(address indexed user, uint256 amount);
    
    //только владелец контракта начисляет токены
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(uint256 initialSupply) ERC20("ReUsePoints", "RUP") {
        require(initialSupply > 0, "Initial supply must be greater than zero");

        owner = msg.sender;

        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    // начисление токенов
    function rewardUser(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than zero");

        uint256 tokenAmount = amount * 10 ** decimals();

        _mint(user, tokenAmount);

        emit TokensRewarded(user, tokenAmount);
    }
    

    // сжигание токенов
    function burnUserTokens(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than zero");

        uint256 tokenAmount = amount * 10 ** decimals();

        _burn(user, tokenAmount);

        emit TokensBurned(user, tokenAmount);
    }
}