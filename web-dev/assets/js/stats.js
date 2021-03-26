function drawStats(round) {

  /*
  '0': 0, // user spent in round
  '1': 0, // premarket divs
  '2': 0, // stonk divs
  '3': 0, // cashback divs
  '4': 0, // broker divs
  '5': 0, // brokered trades
  '6': 0, // bailout divs
  '7': 0, // chadbroker divs
  '8': 0  // gas spent
  */

  if (round > currentRound) {
    round = 0
  }

  $('#totalSpent').text(formatDollas(userStats[round][0]))
  $('#pmDivs').text(formatDollas(userStats[round][1]))
  $('#stonkDivs').text(formatDollas(userStats[round][2]))
  $('#cashbackDivs').text(formatDollas(userStats[round][3]))
  $('#brokerDivs').text(formatDollas(userStats[round][4]))
  $('#brokeredTrades').text(userStats[round][5])
  $('#bailoutDivs').text(formatDollas(userStats[round][6]))
  $('#chadDivs').text(formatDollas(userStats[round][7]))

  let totalEarned = 0

  totalEarned += userStats[round][1]
  totalEarned += userStats[round][2]
  totalEarned += userStats[round][3]
  totalEarned += userStats[round][4]
  totalEarned += userStats[round][6]
  totalEarned += userStats[round][7]
  $('#totalDivs').text(formatDollas(totalEarned))

  let gasSpent = userStats[round][8]
  $('#totalGas').text(formatDollas(gasSpent))
  $('#totalEarned').text(formatDollas(totalEarned))

  let totalProfit = totalEarned - userStats[round][0] - gasSpent
  $('#totalProfit').text(formatDollas(totalProfit))

  if (totalProfit < 0) {
    $('#totalProfit').css('color', '#ff3912')
  } else {
    $('#totalProfit').css('color', 'white')
  }

  if (round == 0) {
    $('#statsRnd').text('total')
  } else {
    $('#statsRnd').text(round)
  }

  // set buttons
  if (currentRound > 1) { // both buttons disabled in round 1
    if (selectedStats == 1) {
      $('#statsB').removeClass()
      $('#statsB').addClass('btn stat-btn-inactive')
      $('#statsF').removeClass()
      $('#statsF').addClass('btn stat-btn-active')
    } else if (selectedStats == currentRound + 1) {
      $('#statsB').removeClass()
      $('#statsB').addClass('btn stat-btn-active')
      $('#statsF').removeClass()
      $('#statsF').addClass('btn stat-btn-inactive')
    } else {
      $('#statsB').removeClass()
      $('#statsB').addClass('btn stat-btn-active')
      $('#statsF').removeClass()
      $('#statsF').addClass('btn stat-btn-active')
    }
  }
}

function statsForward() {
  if ($('#statsF').hasClass('stat-btn-inactive')) {
    return
  }
  if (selectedStats == currentRound + 1) {
    return
  }
  selectedStats += 1
  drawStats(selectedStats)
}

function statsBack() {
  if ($('#statsB').hasClass('stat-btn-inactive')) {
    return
  }
  if (selectedStats == 1) {
    return
  }
  selectedStats -= 1
  drawStats(selectedStats)
}

let selectedStats = 1
let userStats = {}

async function refreshStats() {
  userStats = { // empty round 0 for totals
    '0': {
      '0': 0, // user spent in round
      '1': 0, // pre-market divs
      '2': 0, // stonk divs
      '3': 0, // cashback divs
      '4': 0, // broker divs
      '5': 0, // brokered trades
      '6': 0, // bailout divs
      '7': 0, // chadbroker divs
      '8': 0  // gas spent
    }
  }
  // get user stats for each round
  for (let i=1; i<=currentRound; i++) {
    let stats = await stonk.methods.userRoundStats(userAddr, i).call()
    userStats[i] = {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0
    }
    for (let j=0; j<9; j++) { // sum for total
      userStats['0'][j] += Number(stats[j])
      userStats[i][j] += Number(stats[j])
    }
  }
  drawStats(selectedStats)
}