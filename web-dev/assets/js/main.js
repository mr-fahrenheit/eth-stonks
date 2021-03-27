let tokenAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7'
let stonkAddr = '0xdE3F362A8F2e89c72eEce8DC7b1D7a0cF8cbDB0b'
let readerAddr = '0xAaF8324363cb77c5b96507474299B31C90d11c9a'
let faucetAddr = ''

let zeroAddr = '0x0000000000000000000000000000000000000000'
let userAddr = ''

let stonk
let reader
let token
let tokenFaucet // testnet only

let currentRound = 1
let namesLoaded = false
let refSetup = false

let userStatsLoaded = false

let animInterval

let cbAmounts = {
  '1': 1e16,
  '2': 1e25,
  '3': 1e37
}

let latestMarket = 0

let lastUpdate = new Date().getTime()
let lastNumCompanies
let lastNumStonks
let bigProdLastCompanies
let bigProdLastStonks

let lastGameData
let lastUserData

let graphMode = 'fund'

let newEventFlag = false
let chartHistory = {}
let fundHistory = []
let marketHistory = []
let timeHistory = []
let latestIndex = 1
let latestScanBlock = 0     // The latest block that we are sure we have LogHistory events up til
let scanning = false        // Whether scanning for LogHistory events is currently in progress

window.addEventListener('load', async function() {
  await myComputerHasMemories()
  if (window.ethereum) {
    window.web3 = new Web3(ethereum);
    try {
      await ethereum.enable() // Request access
      setTimeout(setup, 2000)
    } catch (error) {
        // User denied account access...
        console.error(error)
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    window.web3 = new Web3(web3.currentProvider);
    setTimeout(setup, 2000)
  } else {
    $('.walletStatus').text('no ethereum wallet detected')
    $('.alert').show()
  }
})

async function setup () {

  let accounts = await web3.eth.getAccounts()
  userAddr = accounts[0]

  let chain = Number(web3.currentProvider.chainId)
  if (chain != 1) {
    $('.walletStatus').text('please switch to mainnet')
    $('.alert').show()
  }

  loadBroker()

  $('.graphOverlay').show()

  animate()

  stonk = await new web3.eth.Contract(stonkAbi, stonkAddr)
  reader = await new web3.eth.Contract(readerAbi, readerAddr)
  token = await new web3.eth.Contract(tetherAbi, tokenAddr)

  let rounds = await stonk.getPastEvents('NewRound',{fromBlock:0,toBlock:'latest'})
  currentRound = rounds.length + 1
  if (currentRound > 1) {
    startBlock = Number(rounds[rounds.length-1].returnValues.endBlock)
  }
  selectedStats = currentRound

  let urlParams = new URLSearchParams(window.location.search)
  let view = urlParams.get('view')

  if (view) {
    let viewAddr = await stonk.methods.nameToAddress(view).call()
    if (viewAddr != zeroAddr) {
      customView = true
      userAddr = viewAddr
      $('.walletStatus').text('viewing as ' + view)
      $('.alert').show()
    } else {
      $('.walletStatus').text('user ' + view + ' not found')
      $('.alert').show()
    }
  }

  await refreshStats()

  await interfaceLoop()
  fastLoop()
  fasterLoop()

  await loadLocalHistory()
  await listen()
  await scanEvents()

  loadHallOfFame()
}

async function loadLocalHistory() {
  if (localStorage.getItem('history') == null) { // init localStorage if empty
    let store = {
      'currentRound': currentRound,
      'latestIndex': latestIndex,
      'timeHistory': timeHistory,
      'fundHistory': fundHistory,
      'marketHistory': marketHistory,
      'latestScanBlock': latestScanBlock,
      'recentBuys': recentBuys,
      'recentActivity': recentActivity
    }
    window.localStorage.setItem('history', JSON.stringify(store))
    return false
  } else { // or load from storage if present
    let load = JSON.parse(window.localStorage.getItem('history'))
    if (currentRound === load.currentRound) {
      currentRound = load.currentRound
      latestIndex = load.latestIndex
      timeHistory = load.timeHistory
      fundHistory = load.fundHistory
      marketHistory = load.marketHistory
      latestScanBlock = load.latestScanBlock
      recentBuys = load.recentBuys
      recentActivity = load.recentActivity
    }
    return true
  }
}

async function storeLocalHistory() {
  let chartHistory = {
    'currentRound': currentRound,
    'latestIndex': latestIndex,
    'latestScanBlock': latestScanBlock,
    'timeHistory': timeHistory,
    'fundHistory': fundHistory,
    'marketHistory': marketHistory,
    'recentBuys': recentBuys,
    'recentActivity': recentActivity
  }
  window.localStorage.setItem('history', JSON.stringify(chartHistory))
}

async function getHistory() {
  let historyEvents = await stonk.getPastEvents('LogHistory',{fromBlock:startBlock,toBlock:'latest'})

  for (let i=0; i<historyEvents.length; i++) {
    let data = historyEvents[i].returnValues
    let index = Number(data.index)
    fundHistory[index] = Number((data['fund'] / 1e6).toFixed(3))
    marketHistory[index] = Number(data['market'])
    timeHistory[index] = Number(data['timestamp'])
    latestIndex = Math.max(index, latestIndex)
  }

  $('.graphOverlay').hide()
  drawTime()
}

let candleLength = 3
let candleNumber = 20

let firstEvent
let lastEvent

let currentBroker = ''

async function loadBroker () {
  let path = window.location.href
  let match = path.match(/\/#\/(.+)\??/)

  if (match) {
    currentBroker = match[1].split('?')[0]
    window.localStorage.setItem('broker', JSON.stringify(currentBroker))
  } else {
    if (localStorage.getItem('broker') != null) {
      currentBroker = JSON.parse(window.localStorage.getItem('broker'))
    }
  }
}

function useFeatured() {
  window.localStorage.setItem('broker', JSON.stringify(g.featured))
  $('#pmBrokerWarning').hide()
  $('#brokerWarning').hide()
}

let g = {
  'spender': {},
  'prod': {},
  'chad': {}
}

async function loadHighPrio(data) {
  //console.log(data)
  let n = data

  for (i=0; i<n.length; i++) {
    n[i] = Number(n[i])
  }

  g['round'] = n[0]
  g['index'] = n[1]
  g['open'] = n[2]
  g['end'] = n[3]
  g['fund'] = n[4]
  g['market'] = n[5]
  g['bailout'] = n[6]

  g['companies'] = n[7]
  g['stonks'] = n[8]
  g['buy'] = n[9]
  g['sell'] = n[10]
  g['divs'] = n[11]

  g['update'] = new Date().getTime()
}

async function loadLowPrio(data) {
  let s = data.s
  let n = data.n

  for (i=0; i<n.length; i++) {
    n[i] = Number(n[i])
  }

  g['name'] = s[0]
  g['broker'] = s[1]
  g['featured'] = s[2]
  g['spender']['name'] = s[3]
  g['prod']['name'] = s[4]
  g['chad']['name'] = s[5]

  g['spender']['spent'] = n[0]
  g['spender']['earned'] = n[1]
  g['prod']['companies'] = n[2]
  g['prod']['stonks'] = n[3]
  g['chad']['trades'] = n[4]
  g['chad']['brokerdivs'] = n[5]
  g['chad']['chaddivs'] = n[6]

  g['update2'] = new Date().getTime()
}

let lowPrio = true
let lowPrioCounter = 0
let lastCall = ''

let gameApproved = false

function fastLoop () {
  let passed = (new Date().getTime() - g['update']) / 1000
  if (g.open > 0) {
    let pmHms = getHHMMSS(g.open - passed)
    $('#pmCountdown').text(pmHms.join(':'))
    $('#investAmount').text(formatProduct(g.stonks / 86400))
  }

  let hms = getHHMMSS(g.end - getEpochSeconds())
  if (hms[0] < 72) {
    $('#hours').text(hms[0])
    $('#minutes').text(hms[1])
    $('#seconds').text(hms[2])
  }
  updateLiveEvents()
  setTimeout(fastLoop, 1000)
}

function fasterLoop () {
  let passed = (new Date().getTime() - g['update']) / 1000
  let passed2 = (new Date().getTime() - g['update2']) / 1000
  if (g.open > 0) {
    $('#userStonks').text(formatProduct(g.stonks))
  } else {
    let stonks = Math.floor(passed * g.companies) + g.stonks
    $('#investAmount').text(formatProduct(stonks / 86400))
    $('#userStonks').text(formatProduct(stonks))
    let bigStonks = Math.floor(passed2 * g.prod.companies) + g.prod.stonks
    $('#biggestProdStonks').text(formatProduct(bigStonks))
  }
  setTimeout(fasterLoop, 50)
}

async function interfaceLoop() {
  try {
    let toBuy

    if ($('#buyInput').val() == '' || isNaN($('#buyInput').val())) {
      toBuy = 10e6
    } else {
      toBuy = $('#buyInput').val() * 1e6
    }

    let timeNow = new Date().getTime() / 1000
    lastCall = 'highPrio'
    let data = await reader.methods.highPriority(userAddr, toBuy).call()
    await loadHighPrio(data)
    console.log('High prio took: ' + (new Date().getTime() / 1000 - timeNow).toFixed(4) + 's')
    if (lowPrio) {
      timeNow = new Date().getTime() / 1000
      lastCall = 'lowPrio'
      data = await reader.methods.lowPriority(userAddr).call()
      await loadLowPrio(data)
      console.log('Low prio took: ' + (new Date().getTime() / 1000 - timeNow).toFixed(4) + 's')
      lowPrio = false
    } else {
      lowPrioCounter += 1
      if (lowPrioCounter == 5) {
        lowPrio = true
        lowPrioCounter = 0
      }
    }

    //(uint rnd, uint index, uint open, uint end, uint fund, uint market, uint bailout, uint cb, string featured)
    $('#featuredLink').attr('href', ('https://ethstonks.finance/#/' + g.featured))
    $('#featuredLink').text('https://ethstonks.finance/#/' + g.featured)
    $('#stonkFund').text(formatDollas(g.fund))
    $('#stonkMarket').text(translateQuantity(g.market, 2))
    $('#bailoutFund').text(formatDollas(g.bailout))
    updateBailouts()

    if (g.market > latestMarket || g.round > currentRound) {
      latestMarket = g.market
      updateMarketThings()
    }
    currentRound = g.round
    $('.currentRound').text(currentRound)


    $('#biggestSpendName').text(g.spender.name)
    $('#biggestSpendAmount').text(formatDollas(g.spender.spent))
    let profit = g.spender.earned - g.spender.spent
    $('#biggestSpendProfit').text(formatDollas(profit))
    if (profit < 0) {
      $('#biggestSpendProfit').css('color', '#ff3912')
    } else {
      $('#biggestSpendProfit').css('color', 'white')
    }

    $('#biggestProdName').text(g.prod.name)
    $('#biggestProdComp').text(translateQuantity(g.prod.companies,2))

    $('#chadBrokerName').text(g.chad.name)
    $('#chadTrades').text(g.chad.trades)
    $('#chadBrokerDivs').text(formatDollas(g.chad.brokerdivs))
    $('#chadChadDivs').text(formatDollas(g.chad.chaddivs))

    if (!gameApproved) {
      let stonkAllowance = await token.methods.allowance(userAddr, stonkAddr).call()
      if (Number(stonkAllowance) > 0) {
        gameApproved = true
      }
    }

    if (g.open > 0) { // premarket open
      lastCall = 'pmTotal'
      let pmTotal = await stonk.methods.getRoundMetric(g.round, 4).call()
      $('#pmSpentTotal').text(formatDollas(pmTotal))
      $('#premarket-container').css('display', '')
      $('.premarketOverlay').show()
      if (g.name == '') {
        $('.pmNameOverlay').show()
      } else {
        $('.pmNameOverlay').hide()
      }
      if (g.name != '' && !gameApproved) {
        $('.pmApprovalOverlay').show()
      } else {
        $('.pmApprovalOverlay').hide()
      }
    } else {                         // premarket closed
      $('.premarketOverlay').hide()
      if (g.name == '') {
        $('.nameOverlay').show()
      } else {
        $('.nameOverlay').hide()
      }
      if (g.name != '' && !gameApproved) {
        $('.gameApprovalOverlay').show()
      } else {
        $('.gameApprovalOverlay').hide()
      }
    }

    g.spent = userStats[currentRound][0]

    if (g.name != '') { // user has name
      $('#currentName').text(g.name)
      $('#brokerLinkName').text(g.name)
      $('#refSignup').hide()
      if (g.name == g.broker) { // user is a broker
        $('#cBrokerTitle').text('you are a permanent')
        $('#currentBroker').text('stonkbroker')
        $('.brokerOverlay').hide()
        $('.featuredBanner').hide()
        $('#copyHolder').attr('value',('https://ethstonks.finance/#/' + g.name))
      } else {                                // not a broker
        $('#brokerProg').text(formatDollas(1000e6 - g.spent))
        if (currentBroker == '') { // none in URL/storage
          currentBroker = g.broker
        }
        if (currentBroker == '') { // still none
          $('#currentBroker').text('none')
          $('#currentBroker').css('color', '#ff3912')
        } else {
          $('#currentBroker').text(currentBroker)
          $('#currentBroker').css('color', 'white')
          $('.featuredBanner').hide()
        }
      }
    } else { // no name means no broker in contract
      if (currentBroker != '') { // if there is one in URL or storage
        $('#currentBroker').text(currentBroker)
        $('#currentBroker').css('color', 'white')
        $('.featuredBanner').hide()
      }
    }

    $('#userCompanies').text(translateQuantity(g.companies, 2))
    $('#buyAmount').text(formatProduct(g.buy))
    $('#sellAmount').text(formatDollas(g.sell))
    $('#refBalance').text(formatDollas(g.divs))

    setTimeout(interfaceLoop, 5000)
  } catch(error) {
    console.log(lastCall + ' failed:')
    console.log(error)
    setTimeout(interfaceLoop, 5000)
  }
}

let recentBuys = []
let recentActivity = []

async function scanEvents() {
  newEventFlag = true

  // Prevent multiple simultaneous calls to scanEvents
  if (scanning) {
    return
  }

  scanning = true

  while (newEventFlag) {
    newEventFlag = false
    await scanEventsBetween(latestScanBlock + 1, 'latest')
    // If another event came in that set newEventFlag, then this loop will run again
  }

  scanning = false
  drawTime()
}

async function scanEventsBetween(from, to) {
  console.log('Scanning from', from, 'to', to)

  let historyEvents = await stonk.getPastEvents('allEvents',{fromBlock:from,toBlock:to})

  console.log('Got', historyEvents.length, 'events')

  for (let i=0; i<historyEvents.length; i++) {
    handleEvent(historyEvents[i])
    latestScanBlock = Number(historyEvents[i].blockNumber)
  }

  await storeLocalHistory()
}

function handleEvent(e) {
  let result = e.returnValues
  if (typeof(e.event) == 'undefined') {
    return
  }

  let eventKey = Number(e.blockNumber.toString().padStart(9, '0') + e.transactionIndex.toString().padStart(3, '0') + e.logIndex.toString().padStart(4, '0'))

  let recentActivityExists = recentActivity.find(activity => activity.key === eventKey)
  let recentBuyExists = recentBuys.find(buy => buy.key === eventKey)

  let activityType, activityValue

  if(e.event === 'LogHistory') {
    if (Number(result.market) > latestMarket) {
      latestMarket = Number(result.market)
      updateMarketThings()
    }

    let index = Number(result.index)

    if (fundHistory.hasOwnProperty(index)) {
      // Already processed
      return
    }

    fundHistory[index] = Number((result['fund'] / 1e6).toFixed(3))
    marketHistory[index] = Number(result['market'])
    timeHistory[index] = Number(result['timestamp'])
    latestIndex = Math.max(index, latestIndex)
  } else if (e.event.includes('Buy')) {
    console.log(result)
    if (typeof(result.broker) == 'undefined') {
      result = e.result
    }
    if (result.isBroker) {
      result.broker = result.name
    }
    if (!result.isBroker && !result.validBroker) {
      result.broker = '-'
    }
    if (!recentBuyExists) {
      recentBuys.unshift({
        'name': result.name,
        'broker': result.broker,
        'value': formatDollas(result.value),
        'key': eventKey
      })
    }
    activityType = 'buy'
    activityValue = formatDollas(result.value)
  } else if (e.event === 'NewBroker') {
    recentActivity.unshift({
      'name': result.name,
      'col2': 'new',
      'col3': 'broker',
      'key': eventKey
    })
    activityType = 'new'
    activityValue = 'broker'
  } else if (e.event === 'NewChad') {
    activityType = 'new'
    activityValue = 'chad'
  } else if (e.event === 'LogWithdraw') {
    activityType = 'withdraw'
    activityValue = formatDollas(result.value)
  } else if (e.event === 'LogInvest') {
    activityType = 'reinvest'
    activityValue = formatDollas(result.value)
  } else if (e.event === 'LogSell') {
    activityType = 'sell'
    activityValue = formatDollas(result.value)
  }

  if (!recentActivityExists) {
    recentActivity.unshift({
      'name': result.name,
      'col2': activityType,
      'col3': activityValue,
      'key': eventKey
    })
  }

  // Sort the activity by time and trim the arrays to 5 items
  recentActivity.sort((a,b) => b.key - a.key)
  recentBuys.sort((a,b) => b.key - a.key)

  recentActivity = recentActivity.slice(0, 5)
  recentBuys = recentBuys.slice(0, 5)
}


async function listen() {
  let b = await web3.eth.getBlockNumber() - 2000 // about 8 hours
  let allEvents = await stonk.getPastEvents('allEvents',{fromBlock:b,toBlock:'latest'})

  for (let i=0; i<allEvents.length; i++) {
    handleEvent(allEvents[i])
  }

  $('.graphOverlay').hide()
  drawTime()

  stonk.events.allEvents(async function(e, result) {
    return scanEvents()
  })

  console.log('listening')
}

function updateLiveEvents() {
  // buys first
  let len = recentBuys.length
  if (len > 5) {
    len = 5
  }
  for (i=0; i<len; i++) {
    $('#buyer'+(i+1)).text(recentBuys[i].name)
    $('#broker'+(i+1)).text(recentBuys[i].broker)
    $('#value'+(i+1)).text(recentBuys[i].value)
    $('#broker'+(i+1)).removeClass()
    if (recentBuys[i].broker == recentBuys[i].name) {
      $('#broker'+(i+1)).addClass('greentext')
    } else if (recentBuys[i].broker == '-') {
      $('#broker'+(i+1)).addClass('redtext')
    } else {
      $('#broker'+(i+1)).addClass('yellowtext')
    }
  }
  // invest/sell/register
  len = recentActivity.length
  if (len > 5) {
    len = 5
  }
  for (i=0; i<len; i++) {
    $('#user'+(i+1)).text(recentActivity[i].name)
    $('#col2-'+(i+1)).text(recentActivity[i].col2)
    $('#col3-'+(i+1)).text(recentActivity[i].col3)
    $('#col2-'+(i+1)).removeClass()
    $('#col3-'+(i+1)).removeClass()
    switch(recentActivity[i].col2) {
      case 'new':
        $('#col2-'+(i+1)).addClass('bluetext')
        $('#col3-'+(i+1)).addClass('bluetext')
        break
      case 'reg':
        $('#col2-'+(i+1)).addClass('bluetext')
        $('#col3-'+(i+1)).addClass('bluetext')
        break
      case 'reinvest':
        $('#col2-'+(i+1)).addClass('yellowtext')
        $('#col3-'+(i+1)).addClass('yellowtext')
        break
      case 'sell':
        $('#col2-'+(i+1)).addClass('redtext')
        $('#col3-'+(i+1)).addClass('redtext')
        break
      case 'buy':
        $('#col2-'+(i+1)).addClass('greentext')
        $('#col3-'+(i+1)).addClass('greentext')
        break
    }
  }
}

function setSpenderWojak(perc, cb) {
  let add = 0
  let img = 1
  if (cb == 2 || (cb == 1 && Number(perc) > 100)) {
    add = 3
  } else if (cb == 3 || (cb == 2 && Number(perc) > 100)) {
    add = 6
  }
  if (Number(perc) > 33) {
    img = 2
  }
  if (Number(perc) > 66) {
    img = 3
  }
  let newGif = 'assets/img/spender-wojaks/' + (img+add) + '.gif'
  if ($('#spenderWojak').attr('src') != newGif) {
    $('#spenderWojak').attr('src', newGif)
  }
}

function updateMarketThings() {
  $('#stonkMarket').text(translateQuantity(latestMarket, 2))
  let cb = 1
  if (latestMarket > cbAmounts['1']) {
    cb = 2
  }
  if (latestMarket > cbAmounts['2']) {
    cb = 3
  }
  if (latestMarket > cbAmounts['3']) {
    cb = 1
    latestMarket = 864000000000
  }
  $('#cbAmount').text(translateQuantity(cbAmounts[String(cb)], 2))
  $('#cbNum').text(cb)
    let perc
    if (cb == 1) {
      perc = checkGamePercent(latestMarket, 864000000000, 1e16)
      speed = percentToMillis(perc, 200, 5)
      if ($('#frame1').attr('src') != 'assets/img/anim/frame1.jpg') {
        $('#timerIncr').text('30 ')
        $('#frame1').attr('src','assets/img/anim/frame1.jpg')
        $('#frame2').attr('src','assets/img/anim/frame2.jpg')
        $('#frame3').attr('src','assets/img/anim/frame3.jpg')
        $('#frame4').attr('src','assets/img/anim/frame4.jpg')
        $('#frame5').attr('src','assets/img/anim/frame5.jpg')
      }
    }
    if (cb == 2) {
      perc = checkGamePercent(latestMarket, 1e16, 1e25)
      speed = percentToMillis(perc, 70, 10)
      if ($('#frame1').attr('src') != 'assets/img/anim/frame6.jpg') {
        $('#timerIncr').text('10 ')
        $('#frame1').attr('src','assets/img/anim/frame6.jpg')
        $('#frame2').attr('src','assets/img/anim/frame7.jpg')
        $('#frame3').attr('src','assets/img/anim/frame8.jpg')
        $('#frame4').attr('src','assets/img/anim/frame9.jpg')
        $('#frame5').attr('src','assets/img/anim/frame10.jpg')
      }
    } else if (cb == 3) {
      perc = checkGamePercent(latestMarket, 1e25, 1e37)
      speed = percentToMillis(perc, 70, 10)
      if ($('#frame1').attr('src') != 'assets/img/anim/frame11.jpg') {
        $('#timerIncr').text('1 ')
        $('#frame1').attr('src','assets/img/anim/frame11.jpg')
        $('#frame2').attr('src','assets/img/anim/frame12.jpg')
        $('#frame3').attr('src','assets/img/anim/frame13.jpg')
        $('#frame4').attr('src','assets/img/anim/frame14.jpg')
        $('#frame5').attr('src','assets/img/anim/frame15.jpg')
      }
    }
    $('.percent-bar').css('width', perc + '%')
    $('#cbPerc').text(perc)
    setSpenderWojak(perc, cb)
}

let bailoutPercentages = {
  'spent': 0.7,
  'prod': 0.1,
  't': 0.04
}

function updateBailouts () {
  let pool = g.bailout
  let cb = 1
  if (latestMarket > cbAmounts['1']) {
    cb = 2
  }
  if (latestMarket > cbAmounts['2']) {
    cb = 3
  }
  if (latestMarket > cbAmounts['3']) {
    cb = 1
  }
  if (cb != 3) {
    pool = pool / 3
  }

  $('#biggestSpendBailout').text(formatDollas(bailoutPercentages['spent'] * pool))
  $('#biggestProdBailout').text(formatDollas(bailoutPercentages['prod'] * pool))
  $('#last5').text(formatDollas(bailoutPercentages['t'] * pool))
}


function copyBroker () {
  let copyHolder = document.getElementById('copyHolder')
  copyHolder.style.display = 'block'
  copyHolder.select()
  document.execCommand('Copy')
  copyHolder.style.display = 'none'
  if ($('.brokerOverlay').attr('style') == 'display: none;') {
    $('#brokerLinkTitle').text('copied!')
    setTimeout(function() {
      $('#brokerLinkTitle').text('stonkbroker link')
    }, 500)
  }
}

function iDontCare() {
  care = false
  $('#brokerWarning').hide()
  $('#pmBrokerWarning').hide()
}

let care = true

function resetCheck() {
  let currentVal = $('#inputName').val()
  $('#inputName').val(currentVal.replace(/[^a-z\|0-9\|A-Z]/, ''))
  $('#checkNameBtn').text('CHECKING')
  $('#checkNameBtn').css('background-color', '#0f1647')
  $('#checkNameBtn').css('border', '3px solid #0f1647')
  document.getElementById('checkNameBtn').style.setProperty('color', '#fff', 'important')
  $('#registerNameBtn').attr('disabled', true)
  checkName()
}

let registerDisabled = true

async function checkName() {
  // if name available
  let available = await stonk.methods.checkName($('#inputName').val()).call()
  if (available) {
    registerDisabled = false
    $('#checkNameBtn').text('AVAILABLE')
    $('#checkNameBtn').css('background-color', '#27ea83')
    $('#checkNameBtn').css('border', '3px solid #27ea83')
    document.getElementById('checkNameBtn').style.setProperty('color', '#1a2154', 'important')
    $('#registerNameBtn').attr('disabled', false)
  } else {
    registerDisabled = true
    $('#checkNameBtn').text('NOT AVAILABLE')
    $('#checkNameBtn').css('background-color', '#ff3912')
    $('#checkNameBtn').css('border', '3px solid #ff3912')
    document.getElementById('checkNameBtn').style.setProperty('color', '#fff', 'important')
    $('#registerNameBtn').attr('disabled', true)
  }
}

let customView = false

let startBlock = 0

let tutorialsRead = []
let checkAdded = []

async function myComputerHasMemories() {
  if (localStorage.getItem('settings') == null) { // init localStorage if empty
    let settings = {
      'tutorialsRead': []
    }
    readTutorial(0)
    window.localStorage.setItem('settings', JSON.stringify(settings))
  } else { // or load from storage if present
    let settings = JSON.parse(window.localStorage.getItem('settings'))
    tutorialsRead = settings.tutorialsRead || []
    readTutorial(0)
  }
}

async function readTutorial(num) {
  if (num > 0 && !tutorialsRead.includes(num)) {
    tutorialsRead.push(num)
    $('#closeTutorial').removeClass('btn-sell')
  }
  if (tutorialsRead.length > 0 && tutorialsRead.length < 5) {
    $('#closeTutorial').addClass('btn-warn')
    $('#closeTutorial').text(tutorialsRead.length + ' / 5 is good enough')
  }
  if (tutorialsRead.length == 5) {
    $('#closeTutorial').removeClass('btn-warn')
    $('#closeTutorial').addClass('btn-buy')
    $('#closeTutorial').text('wow you did it')
  }
  for (i=1; i<6; i++) {
    if (tutorialsRead.includes(i) && !checkAdded.includes(i)) {
      let btnText = $('#tutBtn'+i).text().trim()
      $('#tutBtn'+i).html(btnText+'<i class="fas fa-check greencheck"></i>')
      checkAdded.push(i)
    }
  }
  saveSettings()
}

function saveSettings() {
  let settings = {
    'tutorialsRead': tutorialsRead
  }
  window.localStorage.setItem('settings', JSON.stringify(settings))
}

function setLiveMetric(mode) {
  $('#livePriceBtn').removeClass()
  $('#liveFundBtn').removeClass()
  $('#liveMarketBtn').removeClass()
  if (mode == 'price') {
    $('#livePriceBtn').addClass('btn btn-active')
    $('#liveFundBtn').addClass('btn btn-inactive')
    $('#liveMarketBtn').addClass('btn btn-inactive')
  } else if (mode == 'fund') {
    $('#livePriceBtn').addClass('btn btn-inactive')
    $('#liveFundBtn').addClass('btn btn-active')
    $('#liveMarketBtn').addClass('btn btn-inactive')
  } else {
    $('#livePriceBtn').addClass('btn btn-inactive')
    $('#liveFundBtn').addClass('btn btn-inactive')
    $('#liveMarketBtn').addClass('btn btn-active')
  }
  graphMode = mode
  drawTime()
}



let frame = 1
let speed = 200

function animate() {
  if (g.open > 0) {
    setTimeout(function() {
      animate()
    }, 1000)
    return
  }
  for (i=1; i<6; i++) {
      if (i != frame) {
          document.getElementById('frame'+i).style.opacity = 0
      }
  }
  document.getElementById('frame'+frame).style.opacity = 1
  frame += 1
  if (frame == 6) {
      frame = 1
  }
  setTimeout(function() {
      animate()
  }, speed)
}


function getParams() {
	let params = {}
	let parser = document.createElement('a')
	parser.href = document.location.href
	let query = parser.search.substring(1)
	let vars = query.split('&')
	for (let i = 0; i < vars.length; i++) {
		let pair = vars[i].split('=')
		params[pair[0]] = decodeURIComponent(pair[1])
	}
	return params
}