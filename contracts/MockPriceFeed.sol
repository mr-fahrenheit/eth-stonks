pragma solidity >=0.6.0;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

contract MockPriceFeed is AggregatorV3Interface {

    function decimals()
    external view
    override
    returns (uint8)
    {
        return 18;
    }

    function description()
    external view
    override
    returns (string memory)
    {
        return "";
    }

    function version()
    external view
    override
    returns (uint256)
    {
        return 0;
    }

    function getRoundData(uint80 _roundId)
    external
    view
    override
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    )
    {
        // Return $1000
        return (1, 100000000000, 1614556483, 1614556574, 1);
    }

    function latestRoundData()
    external
    view
    override
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    )
    {
        // Return $1000
        return (1, 100000000000, 1614556483, 1614556574, 1);
    }
}
