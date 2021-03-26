const Web3 = require('web3');
const chai = require('chai');
const BigNumber = require('bignumber.js')

const StonkNFTSource = require('../build/contracts/StonkNFT.json')
const StonkSource = require('../build/contracts/EthStonks.json');
const StonkLibSource = require('../build/contracts/EthStonksLibrary.json');
const MockPriceFeedSource = require('../build/contracts/MockPriceFeed.json')
const ReaderSource = require('../build/contracts/StonkReader.json');
const TetherSource = require('../lib/tether-token/build/contracts/TetherToken.json');
const SRSSource = require('../build/contracts/StonkRevenueService.json')

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
web3.transactionConfirmationBlocks = 1;

web3.eth.extend({
    methods: [{
        name: 'increaseTime',
        call: 'evm_increaseTime',
        params: 1,
    }]
})


function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let maxAmount = web3.utils.toHex(new BigNumber(2**255))

describe('Setup UI', function () {

  let StonkContractLib
  let StonkContract
  let StonkNFTContract
  let TetherContract
  let ReaderContract

  let accounts


  beforeEach(async() => {
    accounts = await web3.eth.getAccounts()

    // Deploy tether contract
    TetherContract = new web3.eth.Contract(TetherSource.abi)
    TetherContract = await TetherContract.deploy({data: TetherSource.bytecode, arguments: [maxAmount, 'JUST LUL', 'USDT', 6]}).send({from: accounts[0], gas: 8000000})

    for (i=1; i<50; i++) {
      await TetherContract.methods.transfer(accounts[i], web3.utils.toHex(new BigNumber(10001e6))).send({from: accounts[0], gas: 8000000})
      await timeout(5)
    }

    await timeout(1000)

    // Deploy mock price feed
    let MockPriceFeed = new web3.eth.Contract(MockPriceFeedSource.abi)
    MockPriceFeed = await MockPriceFeed.deploy({ data: MockPriceFeedSource.bytecode, arguments: [] }).send({ from: accounts[0], gas: 80000000 })

    StonkContractLib = new web3.eth.Contract(StonkLibSource.abi)
    StonkContractLib = await StonkContractLib.deploy({data: StonkLibSource.bytecode, arguments: []}).send({from: accounts[1], gas: 80000000})

    // Deploy NFT Contract
    StonkNFTContract = new web3.eth.Contract(StonkNFTSource.abi)
    StonkNFTContract = await StonkNFTContract.deploy({
      data: StonkNFTSource.bytecode,
      arguments: []
    }).send({ from: accounts[0], gas: 80000000 })

    SRSContract = new web3.eth.Contract(SRSSource.abi)
    SRSContract = await SRSContract.deploy({
      data: SRSSource.bytecode,
      arguments: [accounts[0], accounts[1], accounts[2]]
    }).send({ from: accounts[0], gas: 80000000 })

    let openTime = Math.floor(new Date().getTime() / 1000) + (4 * 60 * 60) - 5 // 4 hours from now, minus 5 seconds

    StonkContract = new web3.eth.Contract(StonkSource.abi)
    StonkContract = await StonkContract.deploy({data: StonkSource.bytecode, arguments: [TetherContract._address, SRSContract.options.address, openTime, StonkContractLib.options.address, MockPriceFeed.options.address, StonkNFTContract.options.address]}).send({from: accounts[1], gas: 80000000})

    // Set stonk contract on NFT
    await StonkNFTContract.methods.setStonk(StonkContract.options.address).send({ from: accounts[0], gas: 80000000 })

    ReaderContract = new web3.eth.Contract(ReaderSource.abi)
    ReaderContract = await ReaderContract.deploy({data: ReaderSource.bytecode, arguments: [StonkContract._address, 0]}).send({from: accounts[0], gas: 8000000})

    for (i=1; i<50; i++) {
      await TetherContract.methods.approve(StonkContract._address, maxAmount).send({from: accounts[i], gas: 8000000})
      await timeout(5)
    }

    await StonkContract.methods.grantBroker(accounts[2]).send({from: accounts[1], gas: 8000000})
    await web3.eth.sendTransaction({to: accounts[0], from: accounts[0]})
    await timeout(1000)
  })

  it('Advance to mid CB2-3 for the UI', async() => {

    let toDecrease = 0

    let amountToBuy = web3.utils.toHex(new BigNumber(10e6))

    for (i=1; i<50; i++) {
      console.log('Registering a name: user'+i)
      if (i>1) {
        await StonkContract.methods.registerName('user'+i).send({from: accounts[i], gas: 8000000})
      }
      await StonkContract.methods.preMarketBuy(amountToBuy, 'user2').send({from: accounts[i], gas: 8000000})
      await timeout(50)
    }
    await timeout(500)

    // open the regular market
    console.log('Moving forward by 4H')
    await web3.eth.increaseTime(4 * 60 * 60 + 1)
    toDecrease += (4 * 60 * 60 + 1)

    await web3.eth.sendTransaction({to: accounts[0], from: accounts[0]})

    let gameData = await StonkContract.methods.gameData().call()
    let accCounter = 1
    let accNum = 2

    let hrs = 32

    let toBuy = web3.utils.toHex(new BigNumber(50e6))

    while (true) {
      gameData = await StonkContract.methods.gameData().call()

      if (gameData.market > 1e26) {
        break // some amount of the way to cb3
      }

      hrs = 8
      console.log('Buying with acc ' + accounts[accNum])
      await timeout(1)
      await StonkContract.methods.buy(toBuy, 'user2').send({from: accounts[accNum], gas: 8000000})
      await web3.eth.increaseTime(hrs * 60 * 60)
      toDecrease += (hrs * 60 * 60)
      await web3.eth.sendTransaction({to: accounts[0], from: accounts[0]})
      await timeout(1)
      await web3.eth.sendTransaction({to: accounts[0], from: accounts[0]})
      gameData = await StonkContract.methods.gameData().call()
      if (Number(gameData.rnd) == 2) {
        break
      }
      console.log('Selling with acc ' + accounts[accNum])
      await StonkContract.methods.sell().send({from: accounts[accNum], gas: 8000000})
      await timeout(10)
      await web3.eth.sendTransaction({to: accounts[0], from: accounts[0]})
      accCounter += 1
      accNum += 1
      if (accNum == 12) {
        accNum = 2
      }
      await timeout(1000)
    }

    //10000000 hours
    gameData = await StonkContract.methods.gameData().call()
    console.log(gameData)

    await web3.eth.increaseTime(-toDecrease)
    await timeout(1)
  })
})