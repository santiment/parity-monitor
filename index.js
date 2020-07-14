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

const PARITY_URL = process.env.PARITY_URL || "http://localhost:8545/";



// To prevent healthcheck failing during initialization and processing first part of data,
// we set lastExportTime to current time.
let currentBlockTimeSecondsEpoch = Math.floor(Date.now() / 1000);
metrics.currentBlockTime.set(currentBlockTimeSecondsEpoch);


async function work(web3) {
  const currentBlockNumber = await web3.eth.getBlockNumber();
  if (currentBlockNumber <= 0) {
    // The node is currently syncing, ignore this value and report health depending on last seen one.
    logger.info(`Parity reports block: ${currentBlockNumber}. No time is extracted.`);
    return;
  }
  metrics.currentBlock.set(currentBlockNumber);

  const currentBlock = await web3.eth.getBlock(currentBlockNumber);
  currentBlockTimeSecondsEpoch = currentBlock.timestamp;
  metrics.currentBlockTime.set(currentBlockTimeSecondsEpoch);

  const currentBlockTimeHuman = new Date(currentBlock.timestamp * 1000);
  logger.info(`Progressed to block: ${currentBlockNumber} and time: ${currentBlockTimeHuman}`)
}

async function workLoop(web3) {
  try {
    await work(web3);
  }
  catch(error) {
    console.error(error);
  }
  setTimeout(function() {workLoop(web3);}, PARITY_REQUEST_INTERVAL_SECONDS * 1000);
}

async function init() {
  logger.info(`Connecting to parity node ${PARITY_URL}`)
  try {
    const web3 = new Web3(new Web3.providers.HttpProvider(PARITY_URL))
    metrics.startCollection();
    await workLoop(web3);
  }
  catch(error) {
    console.error(error);
  }
}

init()

const healthcheckExportTimeout = () => {
  const secondsFromLastExport = Math.floor(Date.now() / 1000) - currentBlockTimeSecondsEpoch;
  const isExportTimeoutExceeded = secondsFromLastExport > ALLOWED_LAG_MINUTES * 60
  if (isExportTimeoutExceeded) {
    return Promise.reject(`Last block is ${secondsFromLastExport / 60 } min old. Exceeding limit of ${ALLOWED_LAG_MINUTES} min.`)
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
