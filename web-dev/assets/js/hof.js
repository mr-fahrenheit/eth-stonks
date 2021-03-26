// appending to hall of fame
let emptyHallPlayer = `
<div class="gold-table">
<h2 style="margin-top: 20px"><b>{{name}}</b></h2>
<h2 style="color: #4b2b00!important;font-weight: 400">{{total}}</h2>
<table class="table fame3" style="width:100%;">
<tr>
    <th style="padding: 10px 0 12px 0">type</th>
    <th style="padding: 10px 0 12px 0">breaker</th>
    <th style="padding: 10px 0 12px 0">amount</th>
</tr>
{{rows}}
</table>
<table class="table fame3" style="width:100%;">
<tr>
    <th>spent</th>
    <th>earned</th>
    <th>profit</th>
</tr>
<tr>
    <td>{{spent}}</td>
    <td>{{earned}}</td>
    <td class="{{color}}">{{profit}}</td>
</tr>
</table>
</div>`
let emptyRow = '<tr><td>{{type}}</td><td>{{cb}}</td><td>{{won}}</td></tr>'

function getHallPlayer(obj) {
    let newBase = emptyHallPlayer.slice(0)
    newBase = newBase.replace('{{name}}', obj.name)
    newBase = newBase.replace('{{total}}', obj.total)
    newBase = newBase.replace('{{spent}}', obj.spent)
    newBase = newBase.replace('{{earned}}', obj.earned)
    newBase = newBase.replace('{{profit}}', obj.profit)
    if (obj.profit.includes('-')) {
        newBase = newBase.replace('{{color}}', 'redtext')
    } else {
        newBase = newBase.replace('{{color}}', 'greentext')
    }
    let newRows = ''
    for (i=0; i<obj.rows.length; i++) {
        let newRow = emptyRow.slice(0)
        newRow = newRow.replace('{{type}}', obj.rows[i][0])
        newRow = newRow.replace('{{cb}}', obj.rows[i][1])
        newRow = newRow.replace('{{won}}', formatDollas(obj.rows[i][2]))
        newRows += newRow
    }
    newBase = newBase.replace('{{rows}}', newRows)
    return newBase
}

let playerDict = {}

async function getHallHtml(events, round) {

    playerDict = {}

    // playerDict needs to look like this
    /*{
        "Diddler": {
            "spent": 9.3001606e+21,
            "earned": 9.324794268922721e+21,
            "rows": [
            [
                "SPENDER",
                "1",
                2.0136962288712105e+21
            ]
            ],
            "total": 2.0136962288712105e+21,
            "bailouts": 1
        }
    }*/
    
    // we have a list of objects like
    /*
        obj.returnValues[0] {
            prod,
            spender
            b1,
            b2,
            b3
            b4,
            b5
            round,
            cb,
            pool
        }
    */
    let userKeys = ['b1','b2','b3','b4','b5','prod','spender']
    let players = 0

    // get unique names
    for (i=0; i<events.length; i++) {
        let data = events[i].returnValues[0]
        for (j=0; j<userKeys.length; j++) {
            if (typeof(playerDict[data[userKeys[j]]]) == 'undefined') {
                playerDict[data[userKeys[j]]] = {
                    'spent': 0,
                    'earned': 0,
                    'rows': [],
                    'bailouts': 0,
                    'total': 0
                }
                players += 1
            }
        }
    }
    // could probably do these in the same loop but slightly less readable

    // add data
    for (i=0; i<events.length; i++) {
        let data = events[i].returnValues[0]
        playerDict[data['b1']]['bailouts'] += 1
        playerDict[data['b2']]['bailouts'] += 1
        playerDict[data['b3']]['bailouts'] += 1
        playerDict[data['b4']]['bailouts'] += 1
        playerDict[data['b5']]['bailouts'] += 1
        playerDict[data['prod']]['bailouts'] += 1
        playerDict[data['spender']]['bailouts'] += 1

        playerDict[data['b1']]['rows'].push(['trade #1', data.cb, data.amount * bailoutPercentages['t']])
        playerDict[data['b2']]['rows'].push(['trade #2', data.cb, data.amount * bailoutPercentages['t']])
        playerDict[data['b3']]['rows'].push(['trade #3', data.cb, data.amount * bailoutPercentages['t']])
        playerDict[data['b4']]['rows'].push(['trade #4', data.cb, data.amount * bailoutPercentages['t']])
        playerDict[data['b5']]['rows'].push(['trade #5', data.cb, data.amount * bailoutPercentages['t']])
        playerDict[data['prod']]['rows'].push(['producer', data.cb, data.amount * bailoutPercentages['prod']])
        playerDict[data['spender']]['rows'].push(['spender', data.cb, data.amount * bailoutPercentages['spent']])

        playerDict[data['b1']]['total'] += data.amount * bailoutPercentages['t']
        playerDict[data['b2']]['total'] += data.amount * bailoutPercentages['t']
        playerDict[data['b3']]['total'] += data.amount * bailoutPercentages['t']
        playerDict[data['b4']]['total'] += data.amount * bailoutPercentages['t']
        playerDict[data['b5']]['total'] += data.amount * bailoutPercentages['t']
        playerDict[data['prod']]['total'] += data.amount * bailoutPercentages['prod']
        playerDict[data['spender']]['total'] += data.amount * bailoutPercentages['spent']
    }

    // so now we have the dict of players and data...
    let keys = Object.keys(playerDict)

    /*
        return
        (
        _playerRound.spent,                     0
        calculatePreMarketDivs(addr, rnd),      1
        _playerRound.stonkDivs,                 2
        _playerRound.cashbackDivs,              3
        _playerRound.brokerDivs,                4
        _playerRound.brokeredTrades,            5
        _playerRound.bailoutDivs,               6
        _playerRound.chadBrokerDivs,            7
        _playerRound.gasSpent                   8
        );
    */

    // fill in the spent/earned
    for (let i=0; i<keys.length; i++) {
        let addr = await stonk.methods.nameToAddress(keys[i]).call()
        let stats = await stonk.methods.userRoundStats(addr, round).call()
        playerDict[keys[i]].spent += Number(stats[0])
        //playerDict[keys[i]].spent += Number(stats[8]) // gas
        playerDict[keys[i]].earned += Number(stats[1])
        playerDict[keys[i]].earned += Number(stats[2])
        playerDict[keys[i]].earned += Number(stats[3])
        playerDict[keys[i]].earned += Number(stats[4])
        playerDict[keys[i]].earned += Number(stats[5])
        playerDict[keys[i]].earned += Number(stats[6])
        playerDict[keys[i]].earned += Number(stats[7])
    }

    // determine the order based on bailout total
    let orderDict = {}
    for (i=0; i<keys.length; i++) {
        orderDict[keys[i]] = playerDict[keys[i]]['total']
    }
    let entries = Object.entries(orderDict)
    let sorted = entries.sort((a, b) => b[1] - a[1])
    // now we have the order...
    let finalObjects = []
    for (i=0; i<sorted.length; i++) {
        let newObj = {}
        let useToFill = playerDict[sorted[i][0]]
        newObj['name'] = sorted[i][0]
        newObj['bailouts'] = useToFill['bailouts']
        newObj['rows'] = (useToFill['rows']).sort(function(a,b){return a[2] < b[2]})
        newObj['spent'] = formatDollas(useToFill['spent'])
        newObj['earned'] = formatDollas(useToFill['earned'])
        newObj['total'] = formatDollas(useToFill['total'])
        newObj['profit'] = formatDollas(useToFill['earned'] - useToFill['spent'])
        finalObjects.push(newObj)
    }
    let finalHtml = ''
    for (j=0; j<finalObjects.length; j++) {
        finalHtml += getHallPlayer(finalObjects[j])
    }
    return finalHtml
}

let bailoutHTML = {}

async function loadHallOfFame() {
  let bailoutEvents = await stonk.getPastEvents('LogBailouts',{fromBlock:0,toBlock:'latest'})

  if (bailoutEvents.length == 0) {
    return
  }

  let tempBailouts = {}

  for (i=0; i<bailoutEvents.length; i++) {
    let cur = bailoutEvents[i]
    if (typeof(tempBailouts[cur.returnValues[0].round]) == 'undefined') {
      tempBailouts[cur.returnValues[0].round] = []
    }
    tempBailouts[cur.returnValues[0].round].push(bailoutEvents[i])
  }

  let latest = Number(bailoutEvents[bailoutEvents.length-1].returnValues[0].round)

  for (let i=1; i<=latest; i++) {
    bailoutHTML[i] = await getHallHtml(tempBailouts[i], i)
  }

  drawHallOfFame('1')
}

function drawHallOfFame(round) {
  $('#hofRound').text(round)
  $('#style-2').empty()
  $('#style-2').append(bailoutHTML[round])
  // if current round is 1 both are disabled...
  if (currentRound == 1) {
    $('#hofF').attr('disabled', true)
    $('#hofB').attr('disabled', true)
  }
}

function hofForward() {
  if ($('#hofF').attr('disabled')) {
    return
  }
  let cur = Number($('#hofRound').text())
  drawHallOfFame(String(cur+1))
  if (cur+1 == currentRound) {
    $('#hofF').attr('disabled', true)
  }
  $('#hofB').attr('disabled', false)
}

function hofBack() {
  if ($('#hofB').attr('disabled')) {
    return
  }
  let cur = Number($('#hofRound').text())
  drawHallOfFame(String(cur-1))
  if (cur-1 == 1) {
    $('#hofB').attr('disabled', true)
  }
  $('#hofF').attr('disabled', false)
}