const mqtt = require('mqtt');
const { getModels } = require('@parking/shared');
const { buildApp } = require('./app');
const { setMqttClient } = require('./services/mqttBus');

const PORT = parseInt(process.env.PORT || '3000', 10);
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';

function log(...args) {
  console.log('[api]', ...args);
}

async function main() {
  // espera o DB ficar pronto (ingestor cuida da migration)
  const { sequelize } = getModels();
  let attempt = 0;
  while (true) {
    try {
      await sequelize.authenticate();
      log('db connected');
      break;
    } catch (e) {
      attempt++;
      log(`db not ready (attempt ${attempt})`);
      if (attempt >= 30) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const mqttClient = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 2000,
    clientId: `api-${process.pid}`,
  });
  mqttClient.on('connect', () => log('mqtt connected'));
  setMqttClient(mqttClient);

  const app = buildApp();
  app.listen(PORT, () => log(`HTTP listening on :${PORT}`));
}

main().catch((err) => {
  console.error('[api] fatal', err);
  process.exit(1);
});
