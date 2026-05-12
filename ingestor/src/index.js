const mqtt = require('mqtt');
const { migrate, seedSpots } = require('@parking/shared');
const config = require('./config');
const { makeHandler } = require('./mqtt/handlers');
const { scanStuck } = require('./services/stuckScanner');
const { takeSnapshot } = require('./services/snapshotJob');
const { runReset } = require('./services/resetJob');

function log(...args) {
  console.log('[ingestor]', ...args);
}

async function main() {
  if (config.RUN_MIGRATIONS) {
    log('running migrations...');
    let attempt = 0;
    while (true) {
      try {
        await migrate();
        await seedSpots();
        log('migrations OK');
        break;
      } catch (e) {
        attempt++;
        log(`migration failed (attempt ${attempt}): ${e.message}`);
        if (attempt >= 30) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  log(`connecting to ${config.MQTT_URL}`);
  const client = mqtt.connect(config.MQTT_URL, {
    reconnectPeriod: 2000,
    clientId: `ingestor-${process.pid}`,
  });

  client.on('connect', () => {
    log('mqtt connected');
    client.subscribe('campus/parking/sectors/+/spots/+/events', { qos: 1 }, (err) => {
      if (err) log('subscribe error', err.message);
      else log('subscribed to spot events');
    });
    client.subscribe('campus/parking/sectors/+/gateway/status', { qos: 1 }, (err) => {
      if (err) log('subscribe error', err.message);
      else log('subscribed to gateway status');
    });
  });

  client.on('message', makeHandler({ mqttClient: client, log }));

  setInterval(() => {
    scanStuck().catch((e) => log('stuckScanner error', e.message));
  }, config.STUCK_SCAN_INTERVAL_MS);

  setInterval(() => {
    takeSnapshot().catch((e) => log('snapshotJob error', e.message));
  }, config.SNAPSHOT_INTERVAL_MS);

  if (config.RESET_INTERVAL_MS > 0) {
    log(`reset job enabled: every ${config.RESET_INTERVAL_MS}ms (db only; faults survive)`);
    setInterval(() => {
      runReset({ log }).catch((e) => log('resetJob error', e.message));
    }, config.RESET_INTERVAL_MS);
  } else {
    log('reset job disabled (RESET_INTERVAL_MS=0)');
  }

  process.on('SIGINT', () => {
    log('shutting down');
    client.end(true, () => process.exit(0));
  });
}

main().catch((err) => {
  console.error('[ingestor] fatal', err);
  process.exit(1);
});
