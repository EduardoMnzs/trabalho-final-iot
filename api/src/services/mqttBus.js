let client = null;
function setMqttClient(c) { client = c; }
function getMqttClient() { return client; }
module.exports = { setMqttClient, getMqttClient };
