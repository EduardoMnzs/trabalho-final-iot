function intEnv(name, def) {
  const v = parseInt(process.env[name] || "", 10);
  return Number.isFinite(v) ? v : def;
}
function floatEnv(name, def) {
  const v = parseFloat(process.env[name] || "");
  return Number.isFinite(v) ? v : def;
}

module.exports = {
  MQTT_URL: process.env.MQTT_URL || "mqtt://localhost:1883",

  FLAPPING_WINDOW_SEC: intEnv("FLAPPING_WINDOW_SEC", 120),
  FLAPPING_MAX_TRANSITIONS: intEnv("FLAPPING_MAX_TRANSITIONS", 6),
  FLAPPING_COOLDOWN_SEC: intEnv("FLAPPING_COOLDOWN_SEC", 60),

  STUCK_OCCUPIED_THRESHOLD_SEC: intEnv("STUCK_OCCUPIED_THRESHOLD_SEC", 28800),
  STUCK_FREE_THRESHOLD_SEC: intEnv("STUCK_FREE_THRESHOLD_SEC", 86400),
  STUCK_SCAN_INTERVAL_MS: intEnv("STUCK_SCAN_INTERVAL_MS", 30000),
  SNAPSHOT_INTERVAL_MS: intEnv("SNAPSHOT_INTERVAL_MS", 10000),

  RECOMMENDATION_THRESHOLD: floatEnv("RECOMMENDATION_THRESHOLD", 0.9),
  RECOMMENDATION_COOLDOWN_SEC: intEnv("RECOMMENDATION_COOLDOWN_SEC", 300),

  RUN_MIGRATIONS: (process.env.RUN_MIGRATIONS || "true") === "true",
};
