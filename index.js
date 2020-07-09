/*jshint esversion: 8 */
/* jshint node: true */

"use strict";
const pkg = require('./package.json');
const Web3 = require('web3')
const { send } = require('micro')
const url = require('url')


const metrics = require('./metrics');
const { logger } = require('./logger')

const ALLOWED_LAG_MINUTES = parseInt(process.env.ALLOWED_LAG_MINUTES || 60)
const PARITY_REQUEST_INTERVAL_SECONDS =  parseInt(process.env.PARITY_REQUEST_INTERVAL_SECONDS || 60)

const PARITY_NODE = process.env.PARITY_URL || "http://localhost:8545/";



// To prevent healthcheck failing during initialization and processing first part of data,
// we set lastExportTime to current time.
metrics.currentBlockTime.set(Date.now() / 1000);

async function work(web3) {
  const currentBlockNumber = await web3.eth.getBlockNumber();
  metrics.currentBlock.set(currentBlockNumber);

  const currentBlock = await web3.eth.getBlock(currentBlockNumber);
  metrics.currentBlockTime.set(currentBlock.timestamp);

  const currentBlockTimeHuman = new Date(metrics.currentBlockTime * 1000);
  logger.info(`Progressed to time ${currentBlockTimeHuman}`)
}

async function workLoop(web3) {
  await work(web3)
    .then(() => {
      setTimeout(function() {workLoop(web3);}, PARITY_REQUEST_INTERVAL_SECONDS * 1000)
    })
}

async function init() {
  logger.info(`Connecting to parity node ${PARITY_NODE}`)
  try {
    const web3 = new Web3(new Web3.providers.HttpProvider(PARITY_NODE))
    metrics.startCollection();
    await workLoop(web3);
  }
  catch(error) {
    console.error(error);
  }
}

init()

const healthcheckExportTimeout = () => {
  const secondsFromLastExport = Date.now() / 1000 - metrics.currentBlockTime
  const isExportTimeoutExceeded = secondsFromLastExport > ALLOWED_LAG_MINUTES * 60
  if (isExportTimeoutExceeded) {
    return Promise.reject(`Last block is ${secondsFromLastExport / 60 }min old. Exceeding limit  ${ALLOWED_LAG_MINUTES}min.`)
  } else {
    return Promise.resolve()
  }
}

module.exports = async (request, response) => {
  const req = url.parse(request.url, true);

  switch (req.pathname) {
    case '/healthcheck':
      return healthcheckExportTimeout()
          .then(() => send(response, 200, "ok"))
          .catch((err) => send(response, 500, err.toString()))
    case '/metrics':
      response.setHeader('Content-Type', metrics.register.contentType);
      return send(response, 200, metrics.register.metrics());
    default:
      return send(response, 404, 'Not found');
  }
}
