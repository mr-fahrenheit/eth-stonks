# eth stonks
Created by Mr F\
HTML/CSS and Graphics by Karl\
Advanced Solidity by ToCsIcK

<https://ethstonks.finance/>\
<https://discord.gg/mDMyTksceR>\
<https://t.me/ethstonks>

## Live Contracts
- EthStonks.sol: [etherscan](https://etherscan.io/address/0xdE3F362A8F2e89c72eEce8DC7b1D7a0cF8cbDB0b#code)
- StonkLib.sol: [etherscan](https://etherscan.io/address/0x1cEa5D3a73ca0a00453a4c9fFa03F61f92A23f17#code)
- StonkNFT.sol: [etherscan](https://etherscan.io/address/0x0076b645920716Be2aD8ecD41fDd6760BbB1124d#code)
- StonkRevenueService.sol: [etherscan](https://etherscan.io/address/0x137F4fa53577f08b6863Ce92fC67433A9269ab95#code)
- StonkReader.sol: [etherscan](https://etherscan.io/address/0xAaF8324363cb77c5b96507474299B31C90d11c9a#code)

## Prerequisites

- nodejs (10+)
- npm

## Project Structure

- `/contracts/` - contains Solidity contracts for eth stonks
- `/lib/` - contains external Solidity contracts, not to be compiled by Truffle
- `/test/` - contains tests for the Solidity stuff, to be run by Truffle
- `/web-dev/` - bare-html web-UI for eth stonks

## Installing

- `git clone git@github.com/mr-fahrenheit/eth-stonks`
- `npm install` at root

## Running

- `npm run test` - at root. Will spin up ganache & run the tests in the same terminal.
- `npm run start-web` - at root. Will spin up a local web server on localhost:8080

## Running in separate terminals

- `npm run start-ganache` - at root. Will start ganache.
- `npm run start-tests` - at root. Will run the tests in a solo terminal. (more readable)