function getTimeScale() {
  const v = parseFloat(process.env.TIME_SCALE || "60");
  return Number.isFinite(v) && v > 0 ? v : 60;
}

const BOOT_REAL_MS = Date.now();
const BOOT_SIM_MS = Date.now();

function nowSim() {
  const elapsedReal = Date.now() - BOOT_REAL_MS;
  return new Date(BOOT_SIM_MS + elapsedReal * getTimeScale());
}

function nowSimMs() {
  return nowSim().getTime();
}

function simToRealMs(simMs) {
  return simMs / getTimeScale();
}

function realToSimMs(realMs) {
  return realMs * getTimeScale();
}

module.exports = { getTimeScale, nowSim, nowSimMs, simToRealMs, realToSimMs };
