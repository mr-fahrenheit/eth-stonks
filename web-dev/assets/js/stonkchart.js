let layout = {
  hoverlabel: {
    font: {
      color: '#0f1647',
      family: 'Open Sans',
      size: 14
    }
  },
  height: 340,
  margin: {
    l: 30,
    r: 30,
    b: 40,
    t: 30,
    pad: 0
  },
  xaxis: {
    showgrid: false,
    zeroline: true,
    showline: true,
    mirror: 'ticks',
    gridcolor: '#9fa9f5',
    gridwidth: 2,
    zerolinecolor: '#9fa9f5',
    zerolinewidth: 2,
    linecolor: '#9fa9f5',
    linewidth: 2,
    rangeslider: {
      visible: false
    },
    range: ['0', '21'],
    title: '',
    fixedrange: true
  },
  yaxis: {
    showgrid: true,
    zeroline: false,
    showline: true,
    mirror: 'ticks',
    gridcolor: '#9fa9f5',
    gridwidth: 2,
    zerolinecolor: '#9fa9f5',
    zerolinewidth: 2,
    linecolor: '#9fa9f5',
    linewidth: 2,
    tickformat: '.2s',
    automargin: true,
    fixedrange: true,
    showticklabels: true,
    nticks: 7
  },
  font: {
    size: 15,
    color: '#9fa9f5'
  },
  autosize: true,
  plot_bgcolor: 'rgba(0, 0, 0, 0)',
  paper_bgcolor: 'rgba(0,0,0,0)',
  annotations: [{
    xref: 'paper',
    yref: 'paper',
    x: 0.99,
    xanchor: 'right',
    y: 1,
    yanchor: 'center',
    text: '',
    showarrow: false
  }],
  dragmode: false
}

// no Y axis: 
/*
yaxis: {
        autorange: true,
        showgrid: false,
        zeroline: false,
        showline: false,
        autotick: true,
        ticks: '',
        showticklabels: false
      },
      */

let trace1 = {

  x: ['1'],

  close: [],

  decreasing: { line: { color: '#ff3912' } },

  high: [],

  increasing: { line: { color: '#27ea83' } },

  line: { color: 'rgba(31,119,180,1)' },

  low: [],

  open: [],

  type: 'candlestick',
  xaxis: 'x',
  yaxis: 'y',

  hoverinfo: 'text'
}

function checkGamePercent (market, minVal, maxVal) {
  let minLog = Math.log10(minVal),
    maxLog = Math.log10(maxVal),
    range = maxLog - minLog,
    linearToLog = function (n) {
      return (Math.log10(n) - minLog) / range
    }
  return (linearToLog(market) * 100).toFixed(2)
}

function calculatePrice (fund, market) {
  let psn = 10000
  let psnh = 5000
  let fee = 25

  let res = (psn * market) / ((psnh + (psn * fund) + (psnh * 1e18)) / 1e18)

  return res - ((res * fee) / 100)
}

// going to allow:
// 1m, 30m, 1h, 4h, 8h, 1d, 2d, 1w - 8 options for now
let options = {   // number in seconds
  '1': 60 * 5,      // 1m
  '2': 60 * 30,     // 30m
  '3': 60 * 60,     // 1h
  '4': 60 * 60 * 4,   // 4h
  '5': 60 * 60 * 8,   // 8h
  '6': 60 * 60 * 24,  // 1d
  '7': 60 * 60 * 48,  // 2d
  '8': 60 * 60 * 24 * 7 // 1w
}

let optionLabels = {
  '1': '5m',
  '2': '30m',
  '3': '1h',
  '4': '4h',
  '5': '8h',
  '6': '1d',
  '7': '2d',
  '8': '1w'
}

function formatTime(date) {
  return date.getFullYear() + "-" +
    date.getMonth().toString().padStart(2, '0') + "-" +
    date.getDay().toString().padStart(2, '0') + " " +
    date.getHours().toString().padStart(2, '0') + ":" +
    date.getMinutes().toString().padStart(2, '0')
}

function drawTime () {
  let latestIndex = fundHistory.length - 1

  let currentVal

  if (graphMode === 'fund') {
    currentVal = fundHistory[latestIndex]
  } else if (graphMode === 'market') {
    currentVal = marketHistory[latestIndex]
  } else if (graphMode === 'price') {
    currentVal = (calculatePrice(fundHistory[latestIndex] * 1e6, marketHistory[latestIndex]) / 86400)
  }

  let highs = [currentVal]
  let lows = [currentVal]
  let opens = [currentVal]
  let closes = [currentVal]

  let candles
  let time
  let logEnabled

  if (graphMode === 'price') {
    $('#livePriceSettings').css('display', '')
    $('#liveFundSettings').css('display', 'none')
    $('#liveMarketSettings').css('display', 'none')
    candles = Number($('#livePriceCandles').val())
    time = Number($('#livePriceDensity').val())
    logEnabled = $('#livePriceLog').prop('checked')
    $('#livePriceCandleSpan').text(candles)
    $('#livePriceDensitySpan').text(optionLabels[time])
  } else if (graphMode === 'fund') {
    $('#livePriceSettings').css('display', 'none')
    $('#liveFundSettings').css('display', '')
    $('#liveMarketSettings').css('display', 'none')
    candles = Number($('#liveFundCandles').val())
    time = Number($('#liveFundDensity').val())
    $('#liveFundCandleSpan').text(candles)
    $('#liveFundDensitySpan').text(optionLabels[time])
  } else {
    $('#livePriceSettings').css('display', 'none')
    $('#liveFundSettings').css('display', 'none')
    $('#liveMarketSettings').css('display', '')
    drawLine()
    return
  }

  let latestTime = Math.max(Math.floor(new Date().getTime() / 1000), timeHistory[latestIndex])
  let period = options[time]  // in seconds
  let currentTime = Math.floor(latestTime / period) * period
  let latestCandleTime = Math.floor(timeHistory[latestIndex] / period) * period

  let eventLabels = [formatTime(new Date(currentTime * 1000))]

  // start from latest, move back until no more candles to display or no more data
  let xTimeAxis = [new Date(currentTime * 1000)]

  // fill recent candles if there's no recent activity
  while(currentTime > latestCandleTime){
    opens.unshift(currentVal)
    closes.unshift(currentVal)
    highs.unshift(currentVal)
    lows.unshift(currentVal)

    currentTime -= period
    xTimeAxis.unshift(new Date(currentTime * 1000))
    eventLabels.unshift(formatTime(xTimeAxis[0]))
  }

  for (let i = latestIndex - 1; i > 0; i--) {
    // array will be sparse so make sure this entry exists
    if (!timeHistory[i]){
      break
    }

    if (graphMode === 'fund') {
      currentVal = fundHistory[i]
    } else if (graphMode === 'market') {
      currentVal = marketHistory[i]
    } else if (graphMode === 'price') {
      //currentVal = fundHistory[i] / 86400
      currentVal = (calculatePrice(fundHistory[i] * 1e6, marketHistory[i]) / 86400)
    }

    let timestamp = Math.floor(timeHistory[i] / period) * period

    if (timestamp < currentTime - period) {
      if (xTimeAxis.length === candles) {
        // hit max candles to show
        break
      }

      // this loop is to fill in a bunch of candles if nothing happened
      let first = true
      while (timestamp < currentTime - period) {
        if (first) {
          // The previous candle's close is the current candles open
          opens[0] = currentVal
          if(opens[0] > highs[0]){
            highs[0] = opens[0]
          }
          if(opens[0] < lows[0]){
            lows[0] = opens[0]
          }
          closes.unshift(opens[0])
          first = false
        } else {
          // The remaining filler candles just have the next events close
          closes.unshift(currentVal)
        }

        opens.unshift(currentVal)
        highs.unshift(currentVal)
        lows.unshift(currentVal)

        currentTime -= period
        xTimeAxis.unshift(new Date(currentTime * 1000))
        eventLabels.unshift(formatTime(xTimeAxis[0]))

        if (xTimeAxis.length === candles) {
          // hit max candles to show
          break
        }
      }
    } else {
      // update current candle
      opens[0] = currentVal
      if (currentVal > highs[0]) {
        highs[0] = currentVal
      }
      if (currentVal < lows[0]) {
        lows[0] = currentVal
      }
    }
  }

  trace1.open = JSON.parse(JSON.stringify(opens))//opens
  trace1.close = JSON.parse(JSON.stringify(closes))//closes
  trace1.high = JSON.parse(JSON.stringify(highs))//highs
  trace1.low = JSON.parse(JSON.stringify(lows))//lows

  layout.xaxis.range = [
    xTimeAxis[0] * 1000,
    xTimeAxis[xTimeAxis.length] * 1000
  ]

  trace1.x = xTimeAxis

  if (logEnabled) {
    layout.yaxis.type = 'log'
  } else {
    layout.yaxis.type = ''
  }

  trace1.text = []

  if (graphMode === 'price') {
    for (let i = 0; i < trace1.open.length; i++) {
      let newText = eventLabels[i] + '<br>---------------------------------<br>'
      newText += '<b>open:</b> ' + translateQuantity(trace1.open[i], 2) + '<br>'
      newText += '<b>high:</b> ' + translateQuantity(trace1.high[i], 2) + '<br>'
      newText += '<b>low:</b> ' + translateQuantity(trace1.low[i], 2) + '<br>'
      newText += '<b>close:</b> ' + translateQuantity(trace1.close[i], 2) + '<br>'
      trace1.text.push(newText)
    }
  } else if (graphMode === 'fund') {
    for (let i = 0; i < trace1.open.length; i++) {
      let newText = eventLabels[i] + '<br>---------------------------------<br>'
      newText += '<b>open:</b> ' + formatDollas(trace1.open[i] * 1e6) + '<br>'
      newText += '<b>high:</b> ' + formatDollas(trace1.high[i] * 1e6) + '<br>'
      newText += '<b>low:</b> ' + formatDollas(trace1.low[i] * 1e6) + '<br>'
      newText += '<b>close:</b> ' + formatDollas(trace1.close[i] * 1e6) + '<br>'
      trace1.text.push(newText)
    }
  }

  Plotly.newPlot('stonkChart', [trace1], layout, { 'displayModeBar': false, 'staticPlot': false, 'responsive': true })
}

async function draw () {

  lastEvent = latestIndex

  let candles
  let density
  let logEnabled = false

  if (graphMode == 'price') {
    $('#livePriceSettings').css('display', '')
    $('#liveFundSettings').css('display', 'none')
    $('#liveMarketSettings').css('display', 'none')
    candles = Number($('#livePriceCandles').val())
    density = Number($('#livePriceDensity').val())
    logEnabled = $('#livePriceLog').prop('checked')
    $('#livePriceCandleSpan').text(candles)
    $('#livePriceDensitySpan').text(density)
  } else if (graphMode == 'fund') {
    $('#livePriceSettings').css('display', 'none')
    $('#liveFundSettings').css('display', '')
    $('#liveMarketSettings').css('display', 'none')
    candles = Number($('#liveFundCandles').val())
    density = Number($('#liveFundDensity').val())
    $('#liveFundCandleSpan').text(candles)
    $('#liveFundDensitySpan').text(density)
  } else {
    $('#livePriceSettings').css('display', 'none')
    $('#liveFundSettings').css('display', 'none')
    //$('#liveMarketSettings').css('display', '')
    drawLine()
    return
  }

  //$('#hideForMarket').css('display', '')
  //$('#showForMarket').css('display', 'none')

  candleNumber = candles
  candleLength = density

  let highs = []
  let lows = []
  let opens = []
  let closes = []
  let eventLabels = []

  // draw the graph for the first time
  let currentVal
  let lastUsedVal = -1
  let candleCounter = 0
  let candleSubCounter = 0

  let eventLabelStr = ''

  let highestInd = -1
  let lowestInd = -1
  let highest
  let lowest

  let start = 1
  let maxData = candles * density
  if (lastEvent > maxData) {  // not all data can be displayed
    start = lastEvent - maxData + 1 // we don't want to loop through all trades every redraw
  }

  for (let i = start; i <= lastEvent; i++) {
    if (graphMode == 'fund') {
      currentVal = fundHistory[i] / 1e18
    } else if (graphMode == 'market') {
      currentVal = marketHistory[i]
    } else if (graphMode == 'price') {
      //currentVal = fundHistory[i] / 86400
      currentVal = calculatePrice(fundHistory[i], marketHistory[i]) / 86400
    }
    // start of a candle, prepare
    if (candleSubCounter == 0) {
      if (lastUsedVal == -1) {
        highs.push(currentVal)
        lows.push(currentVal)
        opens.push(currentVal)
        closes.push(currentVal)
      } else {
        highs.push(lastUsedVal)
        lows.push(lastUsedVal)
        opens.push(lastUsedVal)
        closes.push(lastUsedVal)
      }
      eventLabelStr = 'trade ' + i
    }
    // within a candle, update
    if (currentVal > highs[candleCounter]) {
      highs[candleCounter] = currentVal
    }
    if (currentVal < lows[candleCounter]) {
      lows[candleCounter] = currentVal
    }
    closes[candleCounter] = currentVal

    lastUsedVal = currentVal

    candleSubCounter += 1

    if (candleSubCounter == candleLength) {
      eventLabelStr += ' - ' + i
      eventLabels.push(eventLabelStr)
      eventLabelStr = ''
      candleSubCounter = 0
      if (candleCounter < candleNumber) {
        candleCounter += 1
      } else {
        highs.shift()
        lows.shift()
        opens.shift()
        closes.shift()
        eventLabels.shift()
      }
    }
    if (i == lastEvent && eventLabelStr != '') {
      eventLabelStr += ' - ' + i
      eventLabels.push(eventLabelStr)
    }
    if (currentVal > highest || highestInd == -1) {
      highest = currentVal
      highestInd = i
    }
    if (currentVal < lowest || lowestInd == -1) {
      lowest = currentVal
      lowestInd = i
    }
  }

  if (closes.length > candleNumber) {
    highs.shift()
    lows.shift()
    opens.shift()
    closes.shift()
  }

  trace1.open = JSON.parse(JSON.stringify(opens))//opens
  trace1.close = JSON.parse(JSON.stringify(closes))//closes
  trace1.high = JSON.parse(JSON.stringify(highs))//highs
  trace1.low = JSON.parse(JSON.stringify(lows))//lows

  trace1.text = []

  if (graphMode == 'price') {
    for (i = 0; i < trace1.open.length; i++) {
      let newText = eventLabels[i] + '<br>'
      newText += 'open: ' + translateQuantity(trace1.open[i], 2) + '<br>'
      newText += 'high: ' + translateQuantity(trace1.high[i], 2) + '<br>'
      newText += 'low: ' + translateQuantity(trace1.low[i], 2) + '<br>'
      newText += 'close: ' + translateQuantity(trace1.close[i], 2) + '<br>'
      trace1.text.push(newText)
    }
  } else if (graphMode == 'fund') {
    for (i = 0; i < trace1.open.length; i++) {
      let newText = eventLabels[i] + '<br>'
      newText += 'open: ' + formatDollas(trace1.open[i] * 1e18) + '<br>'
      newText += 'high: ' + formatDollas(trace1.high[i] * 1e18) + '<br>'
      newText += 'low: ' + formatDollas(trace1.low[i] * 1e18) + '<br>'
      newText += 'close: ' + formatDollas(trace1.close[i] * 1e18) + '<br>'
      trace1.text.push(newText)
    }
  }

  layout.xaxis.range = [
    '0',
    String(candleNumber + 1)
  ]

  let newAxis = ['1']
  for (i = 1; i < candleNumber; i++) {
    newAxis.push(String(i + 1))
  }
  trace1.x = newAxis

  if (logEnabled) {
    layout.yaxis.type = 'log'
  } else {
    layout.yaxis.type = ''
  }

  layout.annotations[0].text = ''

  if (graphMode == 'fund') {
    layout.annotations[0].text += latestIndex + ' trades<br>'
    layout.annotations[0].text += 'low: ' + formatDollas(fundHistory[lowestInd]) + '<br>'
    layout.annotations[0].text += 'high: ' + formatDollas(fundHistory[highestInd]) + '<br>'
    layout.annotations[0].text += 'first: ' + formatDollas(fundHistory[1]) + '<br>'
    layout.annotations[0].text += 'last: ' + formatDollas(fundHistory[latestIndex]) + '<br>'
    layout.annotations[0].y = 0.01
  } else {
    /*
    layout.annotations[0].text += latestIndex + ' TRADES<br>'
    layout.annotations[0].text += 'LOW: ' + translateQuantity(fundHistory[lowestInd], 2) + '<br>'
    layout.annotations[0].text += 'HIGH: ' + translateQuantity(fundHistory[highestInd], 2) + '<br>'
    layout.annotations[0].text += 'FIRST: ' + translateQuantity(fundHistory[1], 2) + '<br>'
    layout.annotations[0].text += 'LAST: ' + translateQuantity(fundHistory[latestIndex], 2) + '<br>'
    */
    layout.annotations[0].text += 'number of<br>companies<br>received<br>for $1'
    layout.annotations[0].y = 0.01
  }

  Plotly.newPlot('stonkChart', [trace1], layout, { 'displayModeBar': false, 'staticPlot': false, 'responsive': true })
}

let lineLayout = {
  height: 340,
  margin: {
    l: 30,
    r: 30,
    b: 40,
    t: 30,
    pad: 0
  },
  autosize: true,
  xaxis: {
    showgrid: true,
    zeroline: true,
    showline: true,
    mirror: 'ticks',
    gridcolor: '#9fa9f5',
    gridwidth: 2,
    zerolinecolor: '#9fa9f5',
    zerolinewidth: 2,
    linecolor: '#9fa9f5',
    linewidth: 2,
    rangeslider: {
      visible: false
    },
    range: ['0', '21'],
    title: '',
    fixedrange: true
  },
  yaxis: {
    showgrid: true,
    zeroline: false,
    showline: true,
    mirror: 'ticks',
    gridcolor: '#9fa9f5',
    gridwidth: 2,
    zerolinecolor: '#9fa9f5',
    zerolinewidth: 2,
    linecolor: '#9fa9f5',
    linewidth: 2,
    fixedrange: true,
    automargin: true
  },
  font: {
    size: 15,
    color: '#9fa9f5'
  },
  plot_bgcolor: 'rgba(0, 0, 0, 0)',
  paper_bgcolor: 'rgba(0,0,0,0)',
  annotations: [{
    xref: 'paper',
    yref: 'paper',
    x: 0.99,
    xanchor: 'right',
    y: 0.01,
    yanchor: 'center',
    text: '',
    showarrow: false
  }],
  dragmode: false
}

let lineTrace = {
  x: [1, 2, 3, 4, 5],
  y: [1, 3, 2, 3, 1],
  mode: 'lines',
  name: 'Solid',
  line: {
    color: '#ff3912',
    dash: 'solid',
    width: 4
  }
}

async function drawLine () {

  let logEnabled = $('#liveMarketLog').prop('checked')

  let lineX = []
  let lineY = []

  lineLayout.xaxis.range = [
    '1',
    String(lastEvent + 1)
  ]

  for (let i = 1; i <= latestIndex; i++) {
    lineX.push(i)
    lineY.push(marketHistory[i])
  }

  lineTrace.x = JSON.parse(JSON.stringify(lineX))
  lineTrace.y = JSON.parse(JSON.stringify(lineY))

  lineLayout.annotations[0].text = 'market: ' + ((marketHistory[latestIndex]).toExponential(2)).replace('+', '') + '<br>'
  lineLayout.annotations[0].text += 'breaker 1: 1e16<br>breaker 2: 1e26<br>breaker 3: 1e37'

  if (logEnabled) {
    lineLayout.yaxis.type = 'log'
  } else {
    lineLayout.yaxis.type = ''
  }

  Plotly.newPlot('stonkChart', [lineTrace], lineLayout, { 'displayModeBar': false, 'staticPlot': false })
  allowedToUpdate = true
}