async function register() {
  if (customView) {
    return
  }
  if (!registerDisabled) {
    let urlParams = new URLSearchParams(window.location.search)
    let grantBroker = urlParams.get('grantBroker')
    let betaBroker = betaSigs[userAddr]
    if (typeof(betaBroker) != 'undefined') {
      grantBroker = betaBroker
    }

    if (grantBroker) {
      const sign = grantBroker
      const r = '0x' + sign.slice(0, 64)
      const s = '0x' + sign.slice(64, 128)
      const v = web3.utils.toDecimal('0x' + sign.slice(128, 130))

      await stonk.methods.registerNameAndClaim($('#inputName').val(), v, r, s).send({from:userAddr})
    } else {
      await stonk.methods.registerName($('#inputName').val()).send({from:userAddr})
    }
    lowPrio = true
    lowPrioCounter = 0
  }
}

function pmBuy () {
  if (customView) {
    return
  }
  let toBuy
  if ($('#pmBuyInput').val() == '' || isNaN($('#pmBuyInput').val())) {
    toBuy = 100e6
  } else {
    toBuy = $('#pmBuyInput').val() * 1e6
  }
  if (toBuy < 1e6) {
    return
  }
  // conditions for broker warning...
  if (Number(g.spent) + toBuy < 1000e6 && currentBroker == '' && care) {
    $( '#pmBrokerWarning').show()
    return
  }

  stonk.methods.preMarketBuy(toBuy, currentBroker).send({from:userAddr})
}

function buy () {
  if (customView) {
    return
  }
  let toBuy

  if ($('#buyInput').val() == '' || isNaN($('#buyInput').val())) {
    toBuy = 100e6
  } else {
    toBuy = $('#buyInput').val() * 1e6
  }
  if (toBuy < 1e6) {
    return
  }
  // conditions for broker warning...
  if (Number(g.spent) + toBuy < 1000e6 && currentBroker == '' && care) {
    $( '#brokerWarning').show()
    return
  }
  stonk.methods.buy(toBuy, currentBroker).send({from:userAddr})
}

function invest () {
  if (customView) {
    return
  }
  stonk.methods.invest().send({from:userAddr})
}

function sell () {
  if (customView) {
    return
  }
  stonk.methods.sell().send({from:userAddr})
}

function withdrawBonus () {
  if (customView) {
    return
  }
  stonk.methods.withdrawBonus().send({from:userAddr})
}

function approveGame() {
  if (customView) {
    return
  }
  let amount =  web3.utils.toHex(new BigNumber(2 ** 255))
  token.methods.approve(stonkAddr, amount).send({from:userAddr})
}