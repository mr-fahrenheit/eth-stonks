const Web3 = require('web3')
const express = require('express')
const EthStonksSource = require('./contracts/EthStonks.json')

const fs = require('fs/promises')

const app = express()

// Change to mainnet for live version
const MAINNET_NETWORK = process.env.MAINNET_NETWORK || 'rinkeby'

// Pass infura project id via environmental variable
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID || ''

const WEB3_PROVIDER = {
  'rinkeby': `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
  'ropsten': `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
  'mainnet': `https://${MAINNET_NETWORK}.infura.io/v3/${INFURA_PROJECT_ID}`
}

const STONKS_ADDRESS = {
  rinkeby: '0x5647f067d866De8823dBE5cBfF44a82D14810Bd9',
  ropsten: '0x03a02d1Be9E8BC705ff2D1a903f0a382bc41313d',
  mainnet: '0xdE3F362A8F2e89c72eEce8DC7b1D7a0cF8cbDB0b'
}

const nameCache = {
  rinkeby: {},
  ropsten: {},
  mainnet: {}
}

async function getName (network, id) {
  if (nameCache[network].hasOwnProperty(id)) {
    return nameCache[network][id]
  }

  try {
    const web3 = new Web3(WEB3_PROVIDER[network])
    const stonksContract = new web3.eth.Contract(EthStonksSource.abi, STONKS_ADDRESS[network])
    const playerAddress = await stonksContract.methods.getAddrById(1, id).call()

    if (!playerAddress) {
      return null
    }

    const name = await stonksContract.methods.addressToName(playerAddress).call()

    nameCache[network][id] = name
    return name
  } catch (e) {
    return null
  }
}

// Meta

app.get('/beta/:network/:id', async function (req, res) {
  const id = req.params.id
  const network = req.params.network

  if (!id) {
    return res.status(404).send()
  }

  if (!['ropsten', 'rinkeby'].includes(network)) {
    return res.status(404).send()
  }

  const name = await getName(network, id)

  if (!name) {
    return res.status(404).send()
  }

  res.json({
    name: `${network} beta #${id} - ${name}`,
    description: `earned for participation in the eth stonks ${network} beta`,
    external_url: 'https://ethstonks.finance',
    image: 'https://ethstonks.finance/meta/images/' + (network === 'ropsten' ? 'beta-stonks-guy.png' : 'beta-wojack-guy.png'),
    traits: [
      {
        trait_type: 'network',
        value: network
      },
      {
        trait_type: 'number',
        value: '#' + id
      },
      {
        trait_type: 'player',
        value: name
      },
      {
        trait_type: 'type',
        value: network === 'ropsten' ? 'stonks guy tester' : 'stonks wojack tester'
      }
    ]
  })
})

app.get('/live/:market/:id', async function (req, res) {
  const id = req.params.id
  const market = req.params.market

  if (!id) {
    return res.status(404).send()
  }

  if (!['premarket', 'main'].includes(market)) {
    return res.status(404).send()
  }

  const name = await getName('mainnet', id)

  if (!name) {
    return res.status(404).send()
  }

  const marketName = market === 'premarket' ? 'pre-market' : 'main market'

  res.json({
    name: `${marketName} #${id} - ${name}`,
    description: `earned for participation in the eth stonks mainnet ${marketName}`,
    external_url: 'https://ethstonks.finance',
    image: 'https://ethstonks.finance/meta/images/' + (market === 'premarket' ? 'stonks-guy.png' : 'wojack-guy.png'),
    traits: [
      {
        trait_type: 'network',
        value: 'mainnet'
      },
      {
        trait_type: 'number',
        value: '#' + id
      },
      {
        trait_type: 'player',
        value: name
      },
      {
        trait_type: 'type',
        value: market === 'premarket' ? 'stonks guy' : 'stonks wojack'
      }
    ]
  })
})

app.use('/images', express.static('images'))

app.listen(8080)

