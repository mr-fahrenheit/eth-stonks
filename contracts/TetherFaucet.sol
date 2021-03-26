pragma solidity 0.7.6;

import "./TokenInterface.sol";
import "./SafeMath.sol";

contract TetherFaucet {
    using SafeMath for uint256;

    TokenInterface token;

    uint256 constant AMOUNT = 100000;

    constructor(TokenInterface _token)
    {
        token = _token;
    }

    fallback()
    external payable
    {
        if (msg.value > 0) {
            return;
        }

        // Send the sender AMOUNT tokens
        uint256 decimals = token.decimals();
        uint256 amount = AMOUNT * (10 ** uint256(decimals));
        token.transfer(msg.sender, amount);

        // Send some ETH for testing
        if (address(this).balance > 0.1 ether && address(msg.sender).balance < 0.05 ether) {
            msg.sender.transfer(0.1 ether);
        }
    }
}
