const Web3 = require('web3')
const chai = require('chai')
const assert = chai.assert
const BigNumber = require('bignumber.js')

const StonkNFTSource = require('../build/contracts/StonkNFT.json')
const StonkSource = require('../build/contracts/EthStonks.json')
const MockPriceFeedSource = require('../build/contracts/MockPriceFeed.json')
const StonkLibSource = require('../build/contracts/EthStonksLibrary.json')
const TetherSource = require('../lib/tether-token/build/contracts/TetherToken.json')
const SRSSource = require('../build/contracts/StonkRevenueService.json')

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
web3.transactionConfirmationBlocks = 1

web3.eth.extend({
  methods: [{
    name: 'increaseTime',
    call: 'evm_increaseTime',
    params: 1,
  },
    {
      name: 'mine',
      call: 'evm_mine',
      params: 0,
    },
    {
      name: 'snapshot',
      call: 'evm_snapshot',
      params: 0,
    },
    {
      name: 'revert',
      call: 'evm_revert',
      params: 0,
    }]
})

let maxAmount = web3.utils.toHex(new BigNumber(2 ** 255))

async function increaseTime (amount) {
  await web3.eth.increaseTime(amount)
  await web3.eth.mine()
}

async function currentTime () {
  return Number((await web3.eth.getBlock('latest')).timestamp)
}

describe('Normal Tests - NFTs', function () {

  let StonkContract
  let StonkNFTContract
  let TokenContract

  let accounts

  beforeEach(async () => {
    accounts = await web3.eth.getAccounts()

    // Deploy tether contract
    TokenContract = new web3.eth.Contract(TetherSource.abi)
    TokenContract = await TokenContract.deploy({ data: TetherSource.bytecode, arguments: [maxAmount, 'JUST LUL', 'USDT', 6] }).send({
      from: accounts[0],
      gas: 8000000
    })

    // Send 50 accounts 10001 USDT
    for (let i = 1; i < 51; i++) {
      await TokenContract.methods.transfer(accounts[i], web3.utils.toHex(new BigNumber(10001e6))).send({ from: accounts[0], gas: 8000000 })
    }

    // Deploy mock price feed
    let MockPriceFeed = new web3.eth.Contract(MockPriceFeedSource.abi)
    MockPriceFeed = await MockPriceFeed.deploy({ data: MockPriceFeedSource.bytecode, arguments: [] }).send({ from: accounts[0], gas: 80000000 })

    // Deploy StonkLib contract
    StonkContractLib = new web3.eth.Contract(StonkLibSource.abi)
    StonkContractLib = await StonkContractLib.deploy({ data: StonkLibSource.bytecode, arguments: [] }).send({ from: accounts[0], gas: 80000000 })

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

    // Deploy Stonk contract
    const openTime = (await currentTime()) + (4 * 60 * 60) - 5 // 4 hours from now, minus 5 seconds

    // Deploy Stonk Contract
    StonkContract = new web3.eth.Contract(StonkSource.abi)
    StonkContract = await StonkContract.deploy({
      data: StonkSource.bytecode,
      arguments: [TokenContract._address, SRSContract.options.address, openTime, StonkContractLib.options.address, MockPriceFeed.options.address, StonkNFTContract.options.address]
    }).send({ from: accounts[0], gas: 80000000 })

    // Set stonk contract on NFT
    await StonkNFTContract.methods.setStonk(StonkContract.options.address).send({ from: accounts[0], gas: 80000000 })

    // Approve Stonk contract to transfer unlimited USDT
    for (let i = 0; i < 51; i++) {
      await TokenContract.methods.approve(StonkContract._address, maxAmount).send({ from: accounts[i], gas: 8000000 })
    }
  })

  it('User can claim pre-market NFT once', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let amountToBuy = web3.utils.toHex(new BigNumber(100e6))

    for (let i = 1; i < 10; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(amountToBuy, '').send({ from: accounts[i], gas: 8000000 })

      let count = await StonkNFTContract.methods.balanceOf(accounts[i]).call()
      assert(count === '1', 'balanceOf NFT returned ' + count + ' instead of 1')

      const tokenId = await StonkNFTContract.methods.tokenOfOwnerByIndex(accounts[i], 0).call()
      const tokenURI = await StonkNFTContract.methods.tokenURI(tokenId).call()

      assert(tokenURI === 'https://ethstonks.finance/meta/live/premarket/' + i, 'Token URI was not correct: ' + tokenURI)

      // Second buy
      await StonkContract.methods.preMarketBuy(amountToBuy, '').send({ from: accounts[i], gas: 8000000 })

      // Still only one
      count = await StonkNFTContract.methods.balanceOf(accounts[i]).call()
      assert(count === '1', 'balanceOf NFT returned ' + count + ' instead of 1')
    }
  })

  it('User can claim regular NFT once', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    // Skip pre-market
    await increaseTime(60 * 60 * 4 + 1)

    let amountToBuy = web3.utils.toHex(new BigNumber(100e6))

    for (let i = 1; i < 10; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.buy(amountToBuy, '').send({ from: accounts[i], gas: 8000000 })

      let count = await StonkNFTContract.methods.balanceOf(accounts[i]).call()
      assert(count === '1', 'balanceOf NFT returned ' + count + ' instead of 1')

      const tokenId = await StonkNFTContract.methods.tokenOfOwnerByIndex(accounts[i], 0).call()
      const tokenURI = await StonkNFTContract.methods.tokenURI(tokenId).call()

      assert(tokenURI === 'https://ethstonks.finance/meta/live/main/' + i, 'Token URI was not correct: ' + tokenURI)

      // Second buy
      await StonkContract.methods.buy(amountToBuy, '').send({ from: accounts[i], gas: 8000000 })

      // Still only one
      count = await StonkNFTContract.methods.balanceOf(accounts[i]).call()
      assert(count === '1', 'balanceOf NFT returned ' + count + ' instead of 1')
    }
  })

  it('should allow owner to mint ropsten beta tokens', async () => {
    await StonkNFTContract.methods.mintRopstenBeta(accounts[1], 0).send({
      from: accounts[0],
      gas: 80000000
    })

    const tokenId = await StonkNFTContract.methods.tokenOfOwnerByIndex(accounts[1], 0).call()
    const tokenURI = await StonkNFTContract.methods.tokenURI(tokenId).call()

    assert(tokenURI === 'https://ethstonks.finance/meta/beta/ropsten/0', 'Token URI was not correct')
  })

  it('should allow owner to mint rinkeby beta tokens', async () => {
    await StonkNFTContract.methods.mintRinkebyBeta(accounts[1], 0).send({
      from: accounts[0],
      gas: 80000000
    })

    const tokenId = await StonkNFTContract.methods.tokenOfOwnerByIndex(accounts[1], 0).call()
    const tokenURI = await StonkNFTContract.methods.tokenURI(tokenId).call()

    assert(tokenURI === 'https://ethstonks.finance/meta/beta/rinkeby/0', 'Token URI was not correct')
  })
})