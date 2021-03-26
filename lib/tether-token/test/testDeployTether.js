const Web3 = require('web3');
const chai = require('chai');
const assert = chai.assert
const BigNumber = require('bignumber.js')

const TetherSource = require('../build/contracts/TetherToken.json');
const TimeSource = require('../build/contracts/CheckTheTime.json')

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
web3.transactionConfirmationBlocks = 1;

const zeroAddress = '0x0000000000000000000000000000000000000000'

const toBN = web3.utils.toBN 

web3.eth.extend({
    methods: [{
        name: 'increaseTime',
        call: 'evm_increaseTime',
        params: 1,
    }]
})

function getEpochSeconds() {
  return Math.floor(new Date().getTime() / 1000)
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('USDT Farm Tests', function () {
  
  let TetherContract
  let Cube
  let ComChest
  let Poly
  
  let accounts
  
  let playerBal
  let playerInfo
  let roundInfo
  let incrementPrice
  
  let receipt

  let extend
  
  
  beforeEach(async() => {
    accounts = await web3.eth.getAccounts()

    // Deploy tether contract
    TetherContract = new web3.eth.Contract(TetherSource.abi)
    TetherContract = await TetherContract.deploy({data: TetherSource.bytecode, arguments: [1e10, 'Tether USD', 'USDT', 6]}).send({from: accounts[0], gas: 8000000})
  })
  
  
  // afterEach(async() => {
    // await web3.eth.increaseTime(extend*-1)
  // })
  
  // it('User should get vaulted buying before the timer', async() => {
    // await Poly.methods.buyXaddr(zeroAddress).send({from: accounts[0], value: 1e18, gas: 1e6})
    // playerInfo = await Poly.methods.getPlayerInfoByAddress(accounts[0]).call()
    // assert(playerInfo[2] == 0, 'Player should not yet have POLY')
    // assert(playerInfo[4] == 1e18, 'Player buy should have been vaulted')
  // })
  
  
  it('Test 1: hmm', async() => {
    
    console.log('Tether:')
    console.log(TetherContract._address)
    let ownerBal = await TetherContract.methods.balanceOf(accounts[0]).call()
    console.log('Owner balance: ' + ownerBal)

    await TetherContract.methods.transfer(accounts[1], ownerBal/2).send({from: accounts[0], gas: 8000000})
    await TetherContract.methods.transfer(accounts[3], ownerBal/2).send({from: accounts[0], gas: 8000000})

    // transfer half to accounts 1

    await TetherContract.methods.approve('0xeAB9218b8B172Ba6e41BAa935B8De385d16F6dD1', ownerBal/2).send({from: accounts[1], gas: 8000000})
    await TetherContract.methods.approve('0xeAB9218b8B172Ba6e41BAa935B8De385d16F6dD1', ownerBal/2).send({from: accounts[3], gas: 8000000})

    let approved = await TetherContract.methods.allowance(accounts[1], '0xeAB9218b8B172Ba6e41BAa935B8De385d16F6dD1').call()
    console.log('Approved: ' + approved)

  })
  
  /*
  it('Test 1: hmm', async() => {
    accounts = await web3.eth.getAccounts()
    let TimeContract = new web3.eth.Contract(TimeSource.abi)
    TimeContract = await TimeContract.deploy({data: TimeSource.bytecode}).send({from: accounts[0], gas: 8000000})
    let currentTime = await TimeContract.methods.getTheTime().call()
    console.log('Time: ' + currentTime)

    await web3.eth.increaseTime(1000000000)
    await timeout(2000)
    currentTime = await TimeContract.methods.getTheTime().call()
    console.log('New Time: ' + currentTime)
    await timeout(2000)
    currentTime = await TimeContract.methods.getTheTime().call()
    console.log('New Time: ' + currentTime)
  })
  */
})