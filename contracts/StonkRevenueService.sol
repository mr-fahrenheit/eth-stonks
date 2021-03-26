pragma solidity 0.7.6;

import "./TokenInterface.sol";

contract StonkRevenueService {
    address private owner1;
    address private owner2;
    address private owner3;

    constructor (address _owner1, address _owner2, address _owner3)
    {
        owner1 = _owner1;
        owner2 = _owner2;
        owner3 = _owner3;
    }

    function withdraw(address tokenAddress)
    external
    {
        TokenInterface token = TokenInterface(tokenAddress);
        uint256 amount = token.allowance(msg.sender, address(this));

        // 41.66% to owner1 and owner2
        uint256 amount1 = amount * 100 / 240;
        uint256 amount2 = amount1;

        // Remaining 16.68% to owner3
        uint256 amount3 = amount - amount1 - amount2;

        token.transferFrom(msg.sender, owner1, amount1);
        token.transferFrom(msg.sender, owner2, amount2);
        token.transferFrom(msg.sender, owner3, amount3);
    }
}
