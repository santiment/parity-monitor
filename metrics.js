const { Gauge } = require("prom-client")
const { logger } = require("./logger")

module.exports.currentBlock = new Gauge({
  name: "current_block",
  help: "The latest blocks on the blockchain",
})

module.exports.currentBlockTime = new Gauge({
  name: "current_block_time",
  help: "The time of the current block as seconds since Epoch",
})

module.exports.startCollection = function () {
  logger.info(`Starting the collection of metrics, the metrics are available on /metrics`)
}

module.exports.register = require("prom-client").register
