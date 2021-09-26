const fetch = require("node-fetch")
const { logger } = require("./logger")
const dotenv = require("dotenv")
dotenv.config()

const apiKey = process.env.ETHERSCAN_API_KEY
const apiUrl = process.env.ETHERSCAN_API_URL || "https://api.etherscan.io/api"

module.exports = async () => {
  try {
    const _ = await fetch(`${apiUrl}?module=proxy&action=eth_blockNumber&apikey=${apiKey}`)
    const response = await _.json()
    logger.debug(`Call Etherscan api. Response is ${response.result}`)
    return parseInt(response.result, 16)
  } catch (error) {
    console.log(error.response.body)
  }
}
