const mqtt = require('mqtt');
const { SECTORS, allSpotIds, time } = require('@parking/shared');
const { Spot } = require('./spot');
const { Gateway } = require('./gateway');
const { startInjector } = require('./faultInjector');
const { makeRng } = require('./rng');

const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const INJECT_PORT = parseInt(process.env.INJECT_PORT || '9000', 10);
const TICK_MS = 100;

function log(...args) {
  console.log('[simulator]', ...args);
}

async function main() {
  log(`connecting to ${MQTT_URL}, TIME_SCALE=${time.getTimeScale()}`);
  const client = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 2000,
    clientId: `simulator-${process.pid}`,
  });

  await new Promise((resolve) => client.once('connect', resolve));
  log('mqtt connected');

  const rng = makeRng();
  const spotsById = new Map();
  for (const id of allSpotIds()) spotsById.set(id, new Spot(id, rng));

  const gateways = new Map();
  for (const s of SECTORS) {
    const spots = Array.from(spotsById.values()).filter((sp) => sp.sectorId === s);
    const g = new Gateway(s, spots, client);
    gateways.set(s, g);
    g.publishStatus('ONLINE');
  }

  // Heartbeat dos gateways: status retained a cada 30s reais
  setInterval(() => {
    for (const g of gateways.values()) g.publishStatus('ONLINE');
  }, 30000);

  startInjector({ port: INJECT_PORT, spotsById });

  let emitted = 0;
  let lastReport = Date.now();

  setInterval(() => {
    const nowSim = time.nowSim();
    for (const spot of spotsById.values()) {
      const evt = spot.tick(nowSim);
      if (evt) {
        const gw = gateways.get(spot.sectorId);
        gw.publishSpotEvent(evt);
        emitted++;
      }
    }
    if (Date.now() - lastReport > 5000) {
      const occ = Array.from(spotsById.values()).filter((s) => s.state === 'OCCUPIED').length;
      log(`emitted=${emitted} occupied=${occ}/90 simTime=${nowSim.toISOString()}`);
      lastReport = Date.now();
    }
  }, TICK_MS);

  process.on('SIGINT', () => {
    log('shutting down');
    client.end(true, () => process.exit(0));
  });
}

main().catch((err) => {
  console.error('[simulator] fatal', err);
  process.exit(1);
});
