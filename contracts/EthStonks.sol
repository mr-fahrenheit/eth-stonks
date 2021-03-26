//
//                 -/oyhhhhhdddddhys+/:`
//              -sddyo+//////++ossssyyhdho-
//            -yds/:-------:::/+oo++++++oydh/`
//          `sms/-----....---::/+++++++++/+ohd+`
//         -dh+--------...----://++++++//////+yd+`
//        /my:-..------..-----::/++++++/////:::+hh-
//       /my:...---:::..-----:::/+++++///:::::---sm:
//      `md+:-..--:::---::::::::/oo++//:::------..om:
//      /Nhhys/---:+syysso/::::/+oo++//:-..........sm-
//     -mysy++o:-:+o+o+//+o/-::/+oo++//:-..`````...-dh`
//     yd:+s+:/::::--:+ho::/-:/+ooo+++/::-...````...oN-
//    .Ny:::-::/:---..-::...-:+osooo++///:---.......+N-
//    -Ny/:--::/-----.....---+osoooo++++//::::::---.+N-
//    .Nh+/:::::--::---:::::/osssooo+++++//////:::--/N:
//    `Ndo+/::::-:::::::////+ossssooo+++++///////::-/N/
//     ymoo/:::-://////////+ossssssoooooo++++++++//:/N/
//     smsoosyyso+////////+oosssssssoooooo++++++++//+N:
//     sNs+//syyy+///////++ossssssssssssooooooooo+++yN-
//     +Nyo+/:+so+///////+oossssyyssssssssoooooooooomy
//     `mdossssossss+///+oossssyyyysssssssssssssooodm-
//      /Ns::+syso+///++oossssyyyyyyyyyyssssssssssym+
//      `dd/-.-::::/+++ossssyyyyyyyyyyyyyssssssssyms
//       smo----::/++ossssyyyyyhhhhyyyyyyssssssssmh`
//       :Ny:/::/+oossyyyyyyhhhhhhyyhyyysssooossdh.
//       `smso++ossyyyhhhdddddhhyyyyyyysssoooosdm.
//         /dddhhhhhddmmmmmdhhyyyyyyyssoooooooym:
//          `-//+yNdmddhhhhyyyyssyyyssooo+++o++d.
//               :Nmdhhyyyysssssssssooo+++++/:-oh+.
//            `-ohNmhhyyyssssssssssoo+++///:----hmmy-
//         ./ymNNNs+oyyysssssooossoo++//::-....ommmmms.
//     `:ohmNNNNN+:/++sssssooooooo+//:--......-ydddmmmms.
//  ./ymNmmmmmmNo---:/+ooooo++++/:--..........oddddmdddmmdyo:.
// dmmmmmmmmmmNh-....-/oso:--....````........oddddddddddmddhddd
// mddddmmmmmmN:..-/yhhhyyys+-```````````...odddddddddddmmddhhh
//            __  __            __              __       
//      ___  / /_/ /_     _____/ /_____  ____  / /_______
//     / _ \/ __/ __ \   / ___/ __/ __ \/ __ \/ //_/ ___/
//    /  __/ /_/ / / /  (__  ) /_/ /_/ / / / / ,< (__  ) 
//    \___/\__/_/ /_/  /____/\__/\____/_/ /_/_/|_/____/ 
//
//                   created by Mr F
//            HTML/CSS and Graphics by Karl
//             Advanced Solidity by ToCsIcK
//
//             https://ethstonks.finance/
//            https://discord.gg/mDMyTksceR
//               https://t.me/ethstonks
//

pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

import "./StonkNFT.sol";
import "./TokenInterface.sol";
import "./EthStonksLibrary.sol";

interface StonkRevenueServiceInterface {
    function withdraw(address tokenAddress) external;
}

contract EthStonks {
    using SafeMath for uint;

    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    modifier preMarketOpen() {
        require(block.timestamp < PREMARKET_LENGTH + round[r].seedTime, "premarket closed");
        _;
    }

    modifier preMarketClosed() {
        require(block.timestamp > PREMARKET_LENGTH + round[r].seedTime, "premarket open");
        _;
    }

    modifier checkDeposit(uint amount) {
        require(amount >= MIN_BUY, "min buy");
        require(token.allowance(msg.sender, address(this)) >= amount, "no allowance");
        require(token.balanceOf(msg.sender) >= amount, "no funds");
        _;
    }

    modifier hasName() {
        require(bytes(addressToName[msg.sender]).length > 0, "no name");
        _;
    }

    modifier validName(string memory name) {
        uint length = nameLength(name);
        require(length <= 12);
        require(length >= 3);
        require(checkCharacters(bytes(name)));
        _;
    }

    modifier updatePlayerIndex() {
        Round storage _round = round[r];
        if (_round.addrToId[msg.sender] == 0) {
            _round.addrToId[msg.sender] = _round.playerIndex;
            _round.idToAddr[_round.playerIndex++] = msg.sender;
        }
        _;
    }

    modifier recordGas() {
        uint gas;

        if (enableGas) {
            gas = gasleft();
        }

        _;

        if (enableGas) {
            _recordGas(gas);
        }
    }

    address private admin;
    address private stonkRevenueService;

    uint constant private PSN = 10000;
    uint constant private PSNH = 5000;
    uint constant private INVEST_RATIO = 86400;
    uint constant private MARKET_RESET = 864000000000;
    uint constant private CB_ONE = 1e16;
    uint constant private CB_TWO = 1e25;
    uint constant private CB_THREE = 1e37;
    uint32 constant private RND_MAX = 72 hours;
    uint32 constant private PREMARKET_LENGTH = 24 hours;
    uint8 constant private FEE = 20;

    uint constant public MIN_BUY = 1e6;
    uint constant public BROKER_REQ = 1000e6;

    uint constant public MIN_NFT_BUY = 100e6;

    struct Round {
        mapping(uint => address) idToAddr;
        mapping(address => uint) addrToId;
        uint seedBalance;
        uint preMarketSpent;
        uint preMarketDivs;
        uint stonkMarket;
        address spender;
        address prod;
        address chadBroker;
        mapping(int8 => address) lastBuys;
        uint bailoutFund;
        uint nextCb;
        uint32 playerIndex;
        uint32 seedTime;
        uint32 end;
        uint16 index;
        int8 lastBuyIndex;
    }

    struct PlayerRound {
        // management
        uint preMarketSpent;
        uint lastAction;
        uint companies;
        uint oldRateStonks;
        // record keeping
        uint spent;
        uint stonkDivs;
        uint cashbackDivs;
        uint brokerDivs;
        uint brokeredTrades;
        uint bailoutDivs;
        uint chadBrokerDivs;
        uint gasSpent;
    }

    struct Player {
        bool isBroker;
        string lastBroker;
        uint preMarketDivsWithdrawn;
        uint availableDivs;
        mapping(uint => PlayerRound) playerRound;
    }

    struct BailoutEvent {
        string prod;
        string spender;
        string b1;
        string b2;
        string b3;
        string b4;
        string b5;
        uint round;
        uint cb;
        uint amount;
    }

    mapping(address => string) public addressToName;
    mapping(string => address) public nameToAddress;

    mapping(address => Player) internal player;
    mapping(uint => Round) internal round;
    uint public r = 1;

    uint public pmDivBal;       // needs to be separate because it is dynamic for users
    uint public divBal;         // includes bailouts, cashback, broker divs and stonk sales
    uint public devBal;         // dev fee balance 😊

    string private featuredBroker = 'MrF';

    TokenInterface private token;

    EthStonksLibrary private lib;

    AggregatorV3Interface internal priceFeed;

    StonkNFT internal nft;

    bool public enableGas = true;

    event LogPreMarketBuy(string name, string broker, uint value, bool isBroker, bool validBroker);
    event LogBuy(string name, string broker, uint value, bool isBroker, bool validBroker);
    event LogInvest(string name, uint value);
    event LogSell(string name, uint value);
    event LogWithdraw(string name, uint value);
    event LogHistory(uint index, uint fund, uint market, uint timestamp);
    event LogBailouts(BailoutEvent e);

    event NewPlayer(address addr, string name);
    event NewBroker(string name);
    event NewChad(string name, uint divs, uint trades);

    event NewRound(uint endBlock);

    // CONSTRUCTOR / ADMIN

    constructor(address _tokenAddress, address _stonkRevenueService, uint32 _open, EthStonksLibrary _lib, address _priceFeed, StonkNFT _nft)
    updatePlayerIndex
    {
        nft = _nft;
        lib = _lib;
        token = TokenInterface(_tokenAddress);
        stonkRevenueService = _stonkRevenueService;
        admin = msg.sender;

        addressToName[admin] = 'MrF';
        nameToAddress['MrF'] = admin;
        round[r].chadBroker = admin;

        round[r].seedTime = _open - PREMARKET_LENGTH;
        round[r].stonkMarket = MARKET_RESET;
        round[r].end = _open + RND_MAX;
        round[r].nextCb = CB_ONE;

        // Main net ETH / USDT address = 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function setStonkRevenueService(address addr)
    external
    onlyAdmin
    {
        stonkRevenueService = addr;
    }

    function setGasFlag(bool val)
    external
    onlyAdmin
    {
        enableGas = val;
    }

    function seedMarket(uint amount)
    external
    checkDeposit(amount)
    onlyAdmin
    preMarketOpen
    {
        address(lib).delegatecall(abi.encodeWithSignature('seedMarket(uint256)', amount));
    }

    function grantBroker(address addr)
    external
    onlyAdmin
    {
        player[addr].isBroker = true;
        emit NewBroker(addressToName[addr]);
    }

    function claimBroker(uint8 _v, bytes32 _r, bytes32 _s)
    public
    {
        // Prevent multiple calls
        require(!player[msg.sender].isBroker);

        // Confirm the hash was signed by admin
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";

        // Confirm the hash contains the correct data
        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        string memory checkMessage = string(abi.encodePacked("Grant stonkbroker to ", toString(msg.sender), " on chain ", toString(chainId)));
        bytes32 checkHash = keccak256(abi.encodePacked(checkMessage));
        bytes memory message = abi.encodePacked(prefix, checkHash);
        bytes32 prefixedHash = keccak256(message);

        address recoveredAddress = ecrecover(prefixedHash, _v, _r, _s);
        require(recoveredAddress == admin, string(abi.encodePacked("Recovered address was ", recoveredAddress)));

        // This is a legit request
        player[msg.sender].isBroker = true;
        emit NewBroker(addressToName[msg.sender]);
    }

    function featureBroker(string calldata _featuredBroker)
    external
    onlyAdmin
    {
        featuredBroker = _featuredBroker;
    }

    function devWithdraw()
    external
    onlyAdmin
    {
        require(devBal > 0);

        token.approve(stonkRevenueService, devBal);
        devBal = 0;
        StonkRevenueServiceInterface(stonkRevenueService).withdraw(address(token));
    }

    // USER FUNCTIONS

    function preMarketBuy(uint _amount, string calldata _broker)
    external
    checkDeposit(_amount)
    preMarketOpen
    hasName
    recordGas
    {
        address(lib).delegatecall(abi.encodeWithSignature('preMarketBuy(uint256,string)', _amount, _broker));

        if (r == 1) {
            if (_amount >= MIN_NFT_BUY) {
                nft.mintPreMarket(msg.sender, round[1].addrToId[msg.sender]);
            }
        }
    }

    function buy(uint _amount, string calldata _broker)
    external
    checkDeposit(_amount)
    preMarketClosed
    hasName
    recordGas
    {
        address(lib).delegatecall(abi.encodeWithSignature('buy(uint256,string)', _amount, _broker));

        if (r == 1) {
            if (_amount >= MIN_NFT_BUY) {
                nft.mint(msg.sender, round[1].addrToId[msg.sender]);
            }
        }
    }

    function invest()
    external
    preMarketClosed
    hasName
    recordGas
    {
        address(lib).delegatecall(abi.encodeWithSignature('invest()'));
    }

    function sell()
    external
    preMarketClosed
    hasName
    recordGas
    {
        address(lib).delegatecall(abi.encodeWithSignature('sell()'));
    }

    function withdrawBonus()
    external
    recordGas
    {
        address(lib).delegatecall(abi.encodeWithSignature('withdrawBonus()'));
    }

    // CURRENT ROUND VIEW FUNCTIONS

    function stonkNames(address addr)
    public view
    returns (string memory _name, string memory _broker, string memory _featuredBroker, string memory _spender, string memory _producer, string memory _chad)
    {
        address spender = round[r].spender;
        address prod = round[r].prod;
        address chad = round[r].chadBroker;
        string memory broker;

        if (player[addr].isBroker) {
            broker = addressToName[addr];
        } else {
            broker = player[addr].lastBroker;
        }

        return (
        addressToName[addr],
        broker,
        featuredBroker,
        addressToName[spender],
        addressToName[prod],
        addressToName[chad]
        );
    }

    function stonkNumbers(address addr, uint buyAmount)
    public
    returns (uint companies, uint stonks, uint receiveBuy, uint receiveSell, uint dividends)
    {
        (, bytes memory result) = address(lib).delegatecall(abi.encodeWithSignature('stonkNumbers(address,uint256)', addr, buyAmount));
        return abi.decode(result, (uint, uint, uint, uint, uint));
    }

    function gameData()
    external
    returns (uint rnd, uint index, uint open, uint end, uint fund, uint market, uint bailout)
    {
        (, bytes memory result) = address(lib).delegatecall(abi.encodeWithSignature('gameData()'));
        return abi.decode(result, (uint, uint, uint, uint, uint, uint, uint));
    }

    function lastBuy(uint rnd, int8 index)
    external view
    returns (address)
    {
        return round[rnd].lastBuys[index];
    }

    // HISTORICAL VIEW FUNCTIONS

    function userRoundStats(address addr, uint rnd)
    public view
    returns (uint, uint, uint, uint, uint, uint, uint, uint, uint)
    {
        PlayerRound memory _playerRound = player[addr].playerRound[rnd];
        return
        (
        _playerRound.spent,
        calculatePreMarketDivs(addr, rnd),
        _playerRound.stonkDivs,
        _playerRound.cashbackDivs,
        _playerRound.brokerDivs,
        _playerRound.brokeredTrades,
        _playerRound.bailoutDivs,
        _playerRound.chadBrokerDivs,
        _playerRound.gasSpent
        );
    }

    function calculatePreMarketDivs(address addr, uint rnd)
    public view
    returns (uint)
    {
        if (player[addr].playerRound[rnd].preMarketSpent == 0) {
            return 0;
        }

        uint totalDivs = round[rnd].preMarketDivs;
        uint totalSpent = round[rnd].preMarketSpent;
        uint playerSpent = player[addr].playerRound[rnd].preMarketSpent;
        uint playerDivs = (((playerSpent * 2 ** 64) / totalSpent) * totalDivs) / 2 ** 64;

        return playerDivs;
    }

    function getAddrById(uint rnd, uint ind)
    public view
    returns (address)
    {
        return round[rnd].idToAddr[ind];
    }

    function getIdByAddr(uint rnd, address addr)
    public view
    returns (uint)
    {
        return round[rnd].addrToId[addr];
    }

    function getRoundIndex(uint rnd)
    public view
    returns (uint)
    {
        return round[rnd].index;
    }

    function getPlayerMetric(address addr, uint rnd, uint key)
    public view
    returns (uint)
    {
        if (key == 0) {
            return player[addr].playerRound[rnd].preMarketSpent;
        } else if (key == 1) {
            return player[addr].playerRound[rnd].lastAction;
        } else if (key == 2) {
            return player[addr].playerRound[rnd].companies;
        } else if (key == 3) {
            return player[addr].playerRound[rnd].oldRateStonks;
        } else if (key == 4) {
            return player[addr].playerRound[rnd].spent;
        } else if (key == 5) {
            return player[addr].playerRound[rnd].stonkDivs;
        } else if (key == 6) {
            return player[addr].playerRound[rnd].cashbackDivs;
        } else if (key == 7) {
            return player[addr].playerRound[rnd].brokerDivs;
        } else if (key == 8) {
            return player[addr].playerRound[rnd].brokeredTrades;
        } else if (key == 9) {
            return player[addr].playerRound[rnd].bailoutDivs;
        } else if (key == 10) {
            return player[addr].playerRound[rnd].chadBrokerDivs;
        } else if (key == 11) {
            return player[addr].preMarketDivsWithdrawn;
        } else if (key == 12) {
            return player[addr].availableDivs;
        } else if (key == 13) {
            return player[addr].playerRound[rnd].gasSpent;
        } else if (key == 14) {
            return player[addr].isBroker ? 1 : 0;
        } else {
            return 0;
        }
    }

    function leaderNumbers()
    public
    returns (uint, uint, uint, uint, uint, uint, uint)
    {
        (, bytes memory result) = address(lib).delegatecall(abi.encodeWithSignature('leaderNumbers()'));
        return abi.decode(result, (uint, uint, uint, uint, uint, uint, uint));
    }

    function getRoundMetric(uint rnd, uint key)
    public view
    returns (uint)
    {
        if (key == 0) {
            return round[rnd].playerIndex;
        } else if (key == 1) {
            return round[rnd].index;
        } else if (key == 2) {
            return round[rnd].seedTime;
        } else if (key == 3) {
            return round[rnd].seedBalance;
        } else if (key == 4) {
            return round[rnd].preMarketSpent;
        } else if (key == 5) {
            return round[rnd].preMarketDivs;
        } else if (key == 6) {
            return round[rnd].end;
        } else if (key == 7) {
            return round[rnd].stonkMarket;
        } else if (key == 8) {
            return round[rnd].bailoutFund;
        } else if (key == 9) {
            return round[rnd].nextCb;
        } else {
            return 0;
        }
    }

    function getRoundLastBuyIndex(uint rnd)
    external view
    returns (int8)
    {
        return round[rnd].lastBuyIndex;
    }

    // INTERNAL FUNCTIONS (THAT MODIFY STATE)

    function _recordGas(uint gas)
    internal
    {
        (,int price,,,) = priceFeed.latestRoundData();

        // There is some computation before and after the first and last call to gasleft(), 58000 is an approximation of this amount
        // Ether = 1e18, price feed = 1e8, gasSpent = 1e6   (18 + 8 - 6) = 20
        player[msg.sender].playerRound[r].gasSpent += ((gas - gasleft() + 58000) * tx.gasprice) * uint(price) / 1e20;
    }

    // INTERNAL FUNCTIONS (STATE NOT MODIFIED)

    function calculatePreMarketOwned(address addr)
    internal view
    returns (uint)
    {
        if (player[addr].playerRound[r].preMarketSpent == 0) {
            return 0;
        }
        uint stonks = calculateTrade(round[r].preMarketSpent, round[r].seedBalance, MARKET_RESET);
        uint stonkFee = (stonks * FEE) / 100;
        stonks -= stonkFee;
        uint totalSpentBig = round[r].preMarketSpent * 100;
        // inflate for precision
        uint userPercent = stonks / (totalSpentBig / player[addr].playerRound[r].preMarketSpent);
        return (userPercent * 100) / INVEST_RATIO;
    }

    function userRoundEarned(address addr, uint rnd)
    internal view
    returns (uint earned)
    {
        PlayerRound memory _playerRound = player[addr].playerRound[rnd];
        earned += calculatePreMarketDivs(addr, rnd);
        earned += _playerRound.stonkDivs;
        earned += _playerRound.cashbackDivs;
        earned += _playerRound.brokerDivs;
        earned += _playerRound.bailoutDivs;
        earned += _playerRound.chadBrokerDivs;
    }

    function marketFund()
    internal view
    returns (uint)
    {
        return token.balanceOf(address(this)) - (round[r].bailoutFund + divBal + pmDivBal + devBal);
    }

    function calculateTrade(uint rt, uint rs, uint bs)
    internal pure
    returns (uint)
    {
        return PSN.mul(bs) / PSNH.add(PSN.mul(rs).add(PSNH.mul(rt)) / rt);
    }

    function calculateSell(uint stonks)
    internal view
    returns (uint)
    {
        uint received = calculateTrade(stonks, round[r].stonkMarket, marketFund());
        uint fee = (received * FEE) / 100;
        return (received - fee);
    }

    function calculateBuy(uint spent)
    internal view
    returns (uint)
    {
        uint stonks = calculateTrade(spent, marketFund(), round[r].stonkMarket);
        uint stonkFee = (stonks * FEE) / 100;
        return (stonks - stonkFee);
    }

    // USERNAME FUNCTIONS

    function checkName(string calldata name)
    external view
    returns (bool)
    {
        uint length = nameLength(name);
        if (length < 3 || length > 12) {
            return false;
        }
        if (checkCharacters(bytes(name))) {
            return (nameToAddress[name] == address(0));
        }
        return false;
    }

    function registerName(string calldata name)
    public
    updatePlayerIndex
    validName(name)
    {
        // Name is not yet registered
        require(nameToAddress[name] == address(0));
        // No name changes allowed
        require(bytes(addressToName[msg.sender]).length == 0);

        addressToName[msg.sender] = name;
        nameToAddress[name] = msg.sender;
    }

    function registerNameAndClaim(string calldata name, uint8 _v, bytes32 _r, bytes32 _s)
    external {
        registerName(name);
        claimBroker(_v, _r, _s);
    }

    function checkCharacters(bytes memory name)
    internal pure
    returns (bool)
    {
        // Check for only letters and numbers
        for (uint i; i < name.length; i++) {
            bytes1 char = name[i];
            if (
                !(char >= 0x30 && char <= 0x39) && //9-0
            !(char >= 0x41 && char <= 0x5A) && //A-Z
            !(char >= 0x61 && char <= 0x7A)    //a-z
            )
                return false;
        }
        return true;
    }

    function nameLength(string memory _str)
    public pure
    returns (uint length)
    {
        uint i = 0;
        bytes memory string_rep = bytes(_str);

        while (i < string_rep.length)
        {
            if (uint8(string_rep[i] >> 7) == 0)
                i += 1;
            else if (uint8(string_rep[i] >> 5) == 0x6)
                i += 2;
            else if (uint8(string_rep[i] >> 4) == 0xE)
                i += 3;
            else if (uint8(string_rep[i] >> 3) == 0x1E)
                i += 4;
            else
            //For safety
                i += 1;

            length++;
        }
    }

    function toString(address account)
    public pure
    returns (string memory)
    {
        return toString(abi.encodePacked(account));
    }

    function toString(uint256 value)
    public pure
    returns (string memory)
    {
        return toString(abi.encodePacked(value));
    }

    function toString(bytes memory data)
    public pure
    returns (string memory)
    {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint(uint8(data[i] >> 4))];
            str[3 + i * 2] = alphabet[uint(uint8(data[i] & 0x0f))];
        }
        return string(str);
    }
}