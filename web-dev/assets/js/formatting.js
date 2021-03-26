const percentToMillis = (percent, highMillis, lowMillis) =>
{
    percent = parseFloat(percent)

    const millisSpread = highMillis - lowMillis

    const highPercent = 100
    const lowPercent = 1
    const percentSpread = highPercent - lowPercent

    percent = Math.max(lowPercent, percent)
    percent = Math.min(highPercent, percent)

    const factor = (percent - lowPercent) / percentSpread

    return highMillis - millisSpread * factor
}


function formatDollas(amount) {
  if (amount < 0) {
      return '-$' + addCommas((Math.abs(amount)/1e6).toFixed(2))
  }
  return '$' + addCommas((amount/1e6).toFixed(2))
}

function getEpochSeconds() {
  return Math.floor(new Date().getTime() / 1000)
}


function getHHMMSS(time) {
  let sec_num = parseInt(time, 10)
  let hours = Math.floor(sec_num / 3600)
  let minutes = Math.floor((sec_num - (hours * 3600)) / 60)
  let seconds = sec_num - (hours * 3600) - (minutes * 60)

  if (hours < 10) {
    hours = "0" + hours
  }
  if (minutes < 10) {
    minutes = "0" + minutes
  }
  if (seconds < 10) {
    seconds = "0" + seconds
  }
  if (time < 0) {
    //return '00:00:00'
    return ['00', '00', '00']
  }
  return [hours, minutes, seconds]
}

function addCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatProduct (product) {
  return translateQuantity(product,2).toLowerCase()
}

function translateQuantity (quantity, precision) {
  if (Number(quantity) == 0) {
    return '0'
  }

  quantity = Number(quantity)
  let finalQuantity = quantity
  let modifier = ''

  if (quantity < 1e6) {
    return addCommas((quantity).toFixed(0))
  }

  if (quantity >= 1000000) {
    modifier = ' Million'
    finalQuantity = quantity / 1000000
  }
  if (quantity >= 1000000000) {
    modifier = ' Billion'
    finalQuantity = quantity / 1000000000
  }
  if (quantity >= 1000000000000) {
    modifier = ' Trillion'
    finalQuantity = quantity / 1000000000000
  }
  if (quantity >= 1000000000000000) {
    modifier = ' Quadrillion'
    finalQuantity = quantity / 1000000000000000
  }
  if (quantity >= 1000000000000000000) {
    modifier = ' Quintillion'
    finalQuantity = quantity / 1000000000000000000
  }
  if (quantity >= 1000000000000000000000) {
    modifier = ' Sextillion'
    finalQuantity = quantity / 1000000000000000000000
  }
  if (quantity >= 1000000000000000000000000) {
    modifier = ' Septillion'
    finalQuantity = quantity / 1000000000000000000000000
  }
  if (quantity >= 1000000000000000000000000000) {
    modifier = ' Octillion'
    finalQuantity = quantity / 1000000000000000000000000000
  }
  if (quantity >= 1000000000000000000000000000000) {
    modifier = ' Nonillion'
    finalQuantity = quantity / 1000000000000000000000000000000
  }
  if (quantity >= 1000000000000000000000000000000000) {
    modifier = ' Decillion'
    finalQuantity = quantity / 1000000000000000000000000000000000
  }
  if (quantity >= 1000000000000000000000000000000000000) {
    modifier = ' Undecillion'
    finalQuantity = quantity / 1000000000000000000000000000000000000
  }

  if (precision === undefined) {
    precision = 0
    if (finalQuantity < 10000) {
      precision = 1
    }
    if (finalQuantity < 1000) {
      precision = 2
    }
    if (finalQuantity < 100) {
      precision = 3
    }
    if (finalQuantity < 10) {
      precision = 4
    }
  }

  if (precision === 0) {
    finalQuantity = Math.floor(finalQuantity)
  }

  return finalQuantity.toFixed(precision) + modifier.toLowerCase()
}
