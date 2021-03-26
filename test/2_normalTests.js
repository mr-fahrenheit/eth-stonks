const Web3 = require('web3')
const chai = require('chai')
const assert = chai.assert
const BigNumber = require('bignumber.js')

const StonkNFTSource = require('../build/contracts/StonkNFT.json')
const StonkSource = require('../build/contracts/EthStonks.json')
const MockPriceFeedSource = require('../build/contracts/MockPriceFeed.json')
const StonkLibSource = require('../build/contracts/EthStonksLibrary.json')
const TetherSource = require('../lib/tether-token/build/contracts/TetherToken.json')
const ReaderSource = require('../build/contracts/StonkReader.json')
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
  ]
})

async function increaseTime (amount) {
  await web3.eth.increaseTime(amount)
  await web3.eth.mine()
}

function timeout (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function currentTime () {
  return Number((await web3.eth.getBlock('latest')).timestamp)
}

let increasedBy = 0
let maxAmount = web3.utils.toHex(new BigNumber(2 ** 255))

describe('Normal Tests - Div withdrawals are tested for all applicable', function () {

  let StonkContract
  let TokenContract
  let ReaderContract
  let StonkNFTContract

  let accounts

  beforeEach(async () => {
    accounts = await web3.eth.getAccounts()

    // Deploy tether contract
    TokenContract = new web3.eth.Contract(TetherSource.abi)
    TokenContract = await TokenContract.deploy({ data: TetherSource.bytecode, arguments: [maxAmount, 'Tether', 'USDT', 6] }).send({
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
    let StonkContractLib = new web3.eth.Contract(StonkLibSource.abi)
    StonkContractLib = await StonkContractLib.deploy({ data: StonkLibSource.bytecode, arguments: [] }).send({ from: accounts[0], gas: 80000000 })

    // Deploy NFT contract
    StonkNFTContract = new web3.eth.Contract(StonkNFTSource.abi)
    StonkNFTContract = await StonkNFTContract.deploy({
      data: StonkNFTSource.bytecode,
      arguments: []
    }).send({ from: accounts[0], gas: 80000000 })

    // Deploy SRS contract
    SRSContract = new web3.eth.Contract(SRSSource.abi)
    SRSContract = await SRSContract.deploy({
      data: SRSSource.bytecode,
      arguments: [accounts[0], accounts[1], accounts[2]]
    }).send({ from: accounts[0], gas: 80000000 })

    const openTime = (await currentTime()) + (24 * 60 * 60) - 5 // 4 hours from now, minus 5 seconds

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

    ReaderContract = new web3.eth.Contract(ReaderSource.abi)
    ReaderContract = await ReaderContract.deploy({
      data: ReaderSource.bytecode,
      arguments: [StonkContract._address, 1]
    }).send({ from: accounts[0], gas: 80000000 })
  })

  async function testDivs () {
    let totalDivs = new BigNumber(0)
    let userBals = {}
    let userDivs = {}
    for (let i = 0; i < 51; i++) {
      let userData = await StonkContract.methods.stonkNumbers(accounts[i], 0).call()
      if (Number(userData.dividends) > 0) {
        userBals[accounts[i]] = new BigNumber(await TokenContract.methods.balanceOf(accounts[i]).call())
        userDivs[accounts[i]] = new BigNumber(userData.dividends)
        totalDivs = totalDivs.plus(userData.dividends)
      }
      let pmDivBal = new BigNumber(await StonkContract.methods.pmDivBal().call())
      let divBal = new BigNumber(await StonkContract.methods.divBal().call())
      assert((divBal.plus(pmDivBal)).isGreaterThanOrEqualTo(totalDivs), 'Not enough div bal')
    }
    for (let i = 0; i < 51; i++) {
      if (typeof (userBals[accounts[i]]) != 'undefined') {
        await StonkContract.methods.withdrawBonus().send({ from: accounts[i], gas: 8000000 })
        let userData = await StonkContract.methods.stonkNumbers(accounts[i], 0).call()
        assert(Number(userData.dividends) === 0, 'User has divs after withdrawing')
        let userNewBal = new BigNumber(await TokenContract.methods.balanceOf(accounts[i]).call())
        let expected = userBals[accounts[i]].plus(userDivs[accounts[i]])
        assert(userNewBal.isEqualTo(expected), 'User ' + i + ' did not receive all divs')
      }
    }
  }

  it('User cannot preMarketBuy without registering a name', async () => {
    try {
      await StonkContract.methods.preMarketBuy(web3.utils.toHex(new BigNumber(10e6)), 'user2').send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }
  })

  it('User cannot preMarketBuy with less than $1', async () => {
    await StonkContract.methods.registerName('someguy92').send({ from: accounts[1], gas: 8000000 })
    try {
      await StonkContract.methods.preMarketBuy(web3.utils.toHex(new BigNumber(0.5e6)), 'user2').send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }
  })

  it('User cannot do regular buy', async () => {
    await StonkContract.methods.registerName('someguy92').send({ from: accounts[1], gas: 8000000 })
    try {
      await StonkContract.methods.buy(web3.utils.toHex(new BigNumber(10e6)), 'user2').send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }
  })

  it('User cannot regular buy, invest or sell after preMarketBuy', async () => {
    await StonkContract.methods.registerName('someguy92').send({ from: accounts[1], gas: 8000000 })
    await StonkContract.methods.preMarketBuy(web3.utils.toHex(new BigNumber(10e6)), 'user2').send({ from: accounts[1], gas: 8000000 })
    try {
      await StonkContract.methods.buy(web3.utils.toHex(new BigNumber(10e6)), 'user2').send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }
    try {
      await StonkContract.methods.invest().send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }
    try {
      await web3.eth.increaseTime(1440)
      increasedBy += 1440
      await StonkContract.methods.sell().send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }

  })

  it('User cannot trigger admin functions', async () => {
    await StonkContract.methods.registerName('someguy92').send({ from: accounts[1], gas: 8000000 })
    try {
      await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }
    try {
      await StonkContract.methods.grantBroker(accounts[2]).send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }
    try {
      await StonkContract.methods.featureBroker('ass').send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }
  })

  it('Should allow user to claim broker only with correct signature', async () => {
    const message = 'Grant stonkbroker to ' + accounts[1].toLowerCase() + ' on chain 0x0000000000000000000000000000000000000000000000000000000000000001'
    const hash = web3.utils.keccak256(message)
    const sign = (await web3.eth.sign(hash, accounts[0])).slice(2)

    const r = '0x' + sign.slice(0, 64)
    const s = '0x' + sign.slice(64, 128)
    const v = web3.utils.toDecimal('0x' + sign.slice(128, 130)) + 27

    // Bad hash should fail
    try {
      await StonkContract.methods.claimBroker('0x0', r, s).send({ from: accounts[1], gas: 8000000 })
      assert(false)
    } catch (e) {
      // Should fail
    }

    let isBroker = Number(await StonkContract.methods.getPlayerMetric(accounts[1], 1, 14).call()) === 1
    assert(!isBroker)

    // Good hash should succeed
    await StonkContract.methods.claimBroker(v, r, s).send({ from: accounts[1], gas: 8000000 })
    isBroker = Number(await StonkContract.methods.getPlayerMetric(accounts[1], 1, 14).call()) === 1
    assert(isBroker)
  })

  it('Should calculate last buyers correctly', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let amountToBuy = web3.utils.toHex(new BigNumber(200e6))

    // Register and premarket buy
    for (let i = 1; i < 10; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(amountToBuy, '').send({ from: accounts[i], gas: 8000000 })
    }

    const lastBuyers = await ReaderContract.methods.buyerNames().call()
    assert(lastBuyers[0] === 'user9')
    assert(lastBuyers[1] === 'user8')
    assert(lastBuyers[2] === 'user7')
    assert(lastBuyers[3] === 'user6')
    assert(lastBuyers[4] === 'user5')
  })

  it('Should calculate gas spent correctly', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let amountToBuy = web3.utils.toHex(new BigNumber(200e6))

    // Register and premarket buy
    await StonkContract.methods.registerName('user' + 1).send({ from: accounts[1], gas: 8000000 })

    const tx = StonkContract.methods.preMarketBuy(amountToBuy, '')
    const receipt = await tx.send({ from: accounts[1], gas: 8000000, gasPrice: '1000000' })

    const gas = receipt.gasUsed
    const gasSpent = await StonkContract.methods.getPlayerMetric(accounts[1], 1, 13).call()
    assert.approximately(Number(gasSpent) * 1000, Number(gas), 1500)
  })

  it('Should emit correct LogBailouts', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let amountToBuy = web3.utils.toHex(new BigNumber(200e6))

    // Register and premarket buy
    for (let i = 1; i < 10; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })

      if (i > 2) {
        await StonkContract.methods.preMarketBuy(amountToBuy, 'user2').send({ from: accounts[i], gas: 8000000 })
      }
    }

    // Skip pre-market
    await increaseTime(60 * 60 * 24 + 1)

    while (true) {
      let gameData = await StonkContract.methods.gameData().call()
      let nextCb = await StonkContract.methods.getRoundMetric(1, 9).call()

      if (gameData.market > 1.5e25) {
        break // some amount of the way to cb2
      }

      for (let i = 1; i < 10; i++) {
        await StonkContract.methods.buy(amountToBuy, 'user2').send({ from: accounts[i], gas: 8000000 })
        await increaseTime(8 * 60 * 60)

        gameData = await StonkContract.methods.gameData().call()
        if (Number(gameData.rnd) === 2) {
          break
        }

        await StonkContract.methods.sell().send({ from: accounts[i], gas: 8000000 })

        gameData = await StonkContract.methods.gameData().call()
        if (Number(gameData.rnd) === 2) {
          break
        }
      }

      if (Number(gameData.rnd) === 2) {
        break
      }
    }

    let nextCb = await StonkContract.methods.getRoundMetric(1, 9).call()

    let gameData = await StonkContract.methods.gameData().call()

    let bailoutEvents = await StonkContract.getPastEvents('LogBailouts', { fromBlock: 0, toBlock: 'latest' })

    assert(bailoutEvents.length === 2)
    assert(bailoutEvents[0].returnValues.e.cb === '1')
    assert(bailoutEvents[1].returnValues.e.cb === '2')
  })

  it('50 users buy with $10 - Chadbroker does not get 1% premarket', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let totalVolume = 0
    let amountToBuy = web3.utils.toHex(new BigNumber(10e6))

    for (let i = 1; i < 51; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(amountToBuy, 'user2').send({ from: accounts[i], gas: 8000000, gasPrice: web3.utils.toWei('100', 'gwei') })
      totalVolume += 10e6
      await timeout(5)
    }

    let defaultChadData = await StonkContract.methods.stonkNumbers(accounts[2], 0).call()
    assert(Number(defaultChadData.dividends) === 0, 'Chad got some dividends during premarket')

    await testDivs()
  })

  it('Same as above, but grant broker to admin (default chad) and use for all buys', async () => {
    await StonkContract.methods.grantBroker(accounts[0]).send({ from: accounts[0], gas: 8000000 })
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let totalVolume = 0
    let refDivs = 0
    let amountToBuy = web3.utils.toHex(new BigNumber(10e6))

    for (let i = 1; i < 5; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(amountToBuy, 'MrF').send({ from: accounts[i], gas: 8000000 })
      totalVolume += 10e6
      refDivs += (10e6 * 0.05)
      await timeout(5)
    }

    let defaultChadData = await StonkContract.methods.stonkNumbers(accounts[0], 0).call()
    let expectedDivs = refDivs

    assert(Number(defaultChadData.dividends) === expectedDivs, 'Chad got 5% of each')

    await testDivs()
  })

  it('50 users buy with $200 - each receives cashback and default Chadbroker does not receive 1%', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let totalVolume = 0
    let amountToBuy = web3.utils.toHex(new BigNumber(200e6))

    for (let i = 1; i < 51; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(amountToBuy, 'assface1').send({ from: accounts[i], gas: 8000000 })
      totalVolume += 200e6
      await timeout(5)
    }

    let defaultChadData = await StonkContract.methods.userRoundStats(accounts[0], 1).call()
    assert(Number(defaultChadData[7]) === 0, 'Chad got some dividends during premarket')

    await testDivs()
  })

  it('Same as above, but grant broker to admin and use for all buys - chad does not receive 1%', async () => {
    await StonkContract.methods.grantBroker(accounts[0]).send({ from: accounts[0], gas: 8000000 })
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let totalVolume = 0
    let amountToBuy = web3.utils.toHex(new BigNumber(200e6))

    for (let i = 1; i < 51; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(amountToBuy, 'MrF').send({ from: accounts[i], gas: 8000000 })
      totalVolume += 200e6
      await timeout(5)
    }

    let defaultChadData = await StonkContract.methods.userRoundStats(accounts[0], 1).call()
    assert(Number(defaultChadData[7]) === 0, 'Chad got some dividends during premarket')

    await testDivs()
  })

  it('50 users buy with $10, $20, $30 etc. - default Chadbroker does not receive 1%', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let totalVolume = new BigNumber(0)
    let tenCounter = 1

    for (let i = 1; i < 51; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(web3.utils.toHex(new BigNumber(tenCounter * 10e6)), 'user2').send({ from: accounts[i], gas: 8000000 })
      totalVolume = totalVolume.plus(tenCounter * 10e6)
      tenCounter += 1
      await timeout(5)
    }

    let defaultChadData = await StonkContract.methods.stonkNumbers(accounts[0], 0).call()
    assert(Number(defaultChadData.dividends) === 0, 'Chad got some dividends during premarket')

    await testDivs()
  })

  it('50 users buy with $10 and premarket ends, all received same + amount matches estimate', async () => {
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let totalVolume = 0
    let amountToBuy = web3.utils.toHex(new BigNumber(10e6))

    for (let i = 1; i < 51; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(amountToBuy, 'user2').send({ from: accounts[i], gas: 8000000 })
      totalVolume += 10e6
      await timeout(5)
    }

    let expectedCompanies = 0

    for (let i = 1; i < 51; i++) {
      let userData = await StonkContract.methods.stonkNumbers(accounts[i], 0).call()
      if (expectedCompanies === 0) {
        expectedCompanies = userData.companies
      } else {
        assert(expectedCompanies === userData.companies, 'Expected companies do not match')
      }
      await timeout(5)
    }

    await web3.eth.increaseTime(86401)
    increasedBy += 86401
    await web3.eth.sendTransaction({ to: accounts[0], from: accounts[0] }) // required to apply the increaseTime

    try {
      await StonkContract.methods.preMarketBuy(amountToBuy, 'user2').send({ from: accounts[1], gas: 8000000 })
      throw('cannot reach this')
    } catch (e) {
      assert(e.message.includes('revert'))
    }

    for (let i = 1; i < 51; i++) {
      let userData = await StonkContract.methods.stonkNumbers(accounts[i], 0).call()
      assert(expectedCompanies === userData.companies, 'Expected companies do not match')
      await timeout(5)
    }

    await testDivs()
  })

  it('should pay the developers correctly', async () => {
    await StonkContract.methods.grantBroker(accounts[0]).send({ from: accounts[0], gas: 8000000 })
    await StonkContract.methods.seedMarket(web3.utils.toHex(new BigNumber(500e6))).send({ from: accounts[0], gas: 8000000 })

    let totalVolume = 0
    let refDivs = 0
    let amountToBuy = web3.utils.toHex(new BigNumber(10e6))

    for (let i = 1; i < 5; i++) {
      await StonkContract.methods.registerName('user' + i).send({ from: accounts[i], gas: 8000000 })
      await StonkContract.methods.preMarketBuy(amountToBuy, 'MrF').send({ from: accounts[i], gas: 8000000 })
      totalVolume += 10e6
      refDivs += (10e6 * 0.05)
      await timeout(5)
    }

    const devPreBal = await StonkContract.methods.devBal().call()
    const owner1PreBal = await TokenContract.methods.balanceOf(accounts[0]).call()
    const owner2PreBal = await TokenContract.methods.balanceOf(accounts[1]).call()
    const owner3PreBal = await TokenContract.methods.balanceOf(accounts[2]).call()

    await StonkContract.methods.devWithdraw().send({ from: accounts[0], gas: 8000000 })

    const devPostBal = await StonkContract.methods.devBal().call()
    const owner1PostBal = await TokenContract.methods.balanceOf(accounts[0]).call()
    const owner2PostBal = await TokenContract.methods.balanceOf(accounts[1]).call()
    const owner3PostBal = await TokenContract.methods.balanceOf(accounts[2]).call()

    const owner1and2 = new BigNumber(devPreBal).times('0.4166').toNumber()
    const owner3  = new BigNumber(devPreBal).times('0.1668').toNumber()

    assert.notStrictEqual(devPreBal, '0')
    assert.strictEqual(devPostBal, '0')
    assert.approximately(owner1and2, new BigNumber(owner1PostBal).minus(owner1PreBal).toNumber(), 500)
    assert.approximately(owner1and2, new BigNumber(owner2PostBal).minus(owner2PreBal).toNumber(), 500)
    assert.approximately(owner3, new BigNumber(owner3PostBal).minus(owner3PreBal).toNumber(), 500)
  })
})