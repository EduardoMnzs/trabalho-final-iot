class Gateway {
  constructor(sectorId, spots, mqttClient) {
    this.sectorId = sectorId;
    this.spots = spots;
    this.mqtt = mqttClient;
  }

  publishStatus(status = 'ONLINE') {
    const topic = `campus/parking/sectors/${this.sectorId}/gateway/status`;
    const payload = JSON.stringify({
      ts: new Date().toISOString(),
      sectorId: this.sectorId,
      status,
    });
    this.mqtt.publish(topic, payload, { qos: 1, retain: true });
  }

  publishSpotEvent(event) {
    const topic = `campus/parking/sectors/${this.sectorId}/spots/${event.spotId}/events`;
    this.mqtt.publish(topic, JSON.stringify(event), { qos: 1, retain: false });
  }
}

module.exports = { Gateway };
