# parity-monitor
A monitor for the Parity Ethereum client. It would keep getting the last block and report health status depending on the lag between the block timestamp and Now.

## Run

You need to have access to a parity full node. By default in docker-compose `PARITY_URL` points to
the staging instance.

```bash
$ ./bin/run.sh
```

## Configure

You can configure the service with the following ENV variables:

* `PARITY_URL` - Parity node url. Default: `http://localhost:8545/`
* `ALLOWED_LAG_MINUTES` - The time after which the monitor will report bad health.
* `PARITY_REQUEST_INTERVAL_SECONDS` - The intervals on which Parity would be asked for last block time.

## API

The monitor exports two interfaces:
* hostname:3000/healtcheck - OK / Fall of check
* hostname:3000/metrics - The time of the last block
