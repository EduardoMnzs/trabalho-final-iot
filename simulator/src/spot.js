const { v4: uuidv4 } = require('uuid');
const { lambdaForHour } = require('./arrivals');

const FAULT_MODES = ['normal', 'stuck_occupied', 'stuck_free', 'flapping'];
const FLAPPING_INTERVAL_SIM_SEC = 5;
const MIN_STAY_SEC = 30 * 60;
const MAX_STAY_SEC = 6 * 60 * 60;

class Spot {
  constructor(spotId, rng) {
    this.spotId = spotId;
    this.sectorId = spotId.split('-')[0];
    this.state = 'FREE';
    this.rng = rng;
    this.fault = 'normal';
    this.nextChangeSimMs = null;
    this.forceFill = false;
  }

  setFault(mode) {
    if (!FAULT_MODES.includes(mode)) throw new Error(`unknown mode ${mode}`);
    this.fault = mode;
    this.nextChangeSimMs = null;
  }

  setForceFill(on) {
    this.forceFill = !!on;
    this.nextChangeSimMs = null;
  }

  shouldEmit(_nowSim) {
    if (this.fault === 'stuck_occupied' || this.fault === 'stuck_free') return false;
    return true;
  }

  scheduleNext(nowSim) {
    const nowMs = nowSim.getTime();

    if (this.fault === 'flapping') {
      this.nextChangeSimMs = nowMs + FLAPPING_INTERVAL_SIM_SEC * 1000;
      return;
    }

    if (this.fault === 'stuck_occupied') {
      this.state = 'OCCUPIED';
      this.nextChangeSimMs = null;
      return;
    }
    if (this.fault === 'stuck_free') {
      this.state = 'FREE';
      this.nextChangeSimMs = null;
      return;
    }

    if (this.state === 'FREE') {
      // Próxima chegada exponencial baseada na curva horária
      let lambda = lambdaForHour(nowSim);
      if (this.forceFill) lambda = Math.max(lambda, 60); // 60/hora ≈ chegada a cada 1min simulado
      if (lambda <= 0) {
        // Madrugada: tenta de novo em 1h simulada
        this.nextChangeSimMs = nowMs + 60 * 60 * 1000;
        return;
      }
      const meanSec = 3600 / lambda;
      const u = Math.max(1e-9, this.rng());
      const deltaSec = -Math.log(u) * meanSec;
      this.nextChangeSimMs = nowMs + deltaSec * 1000;
    } else {
      // OCCUPIED → permanência uniforme
      const stay = MIN_STAY_SEC + this.rng() * (MAX_STAY_SEC - MIN_STAY_SEC);
      this.nextChangeSimMs = nowMs + stay * 1000;
    }
  }

  tick(nowSim) {
    if (this.fault === 'stuck_occupied') {
      if (this.state !== 'OCCUPIED') {
        this.state = 'OCCUPIED';
        return this._buildEvent(nowSim);
      }
      return null;
    }
    if (this.fault === 'stuck_free') {
      if (this.state !== 'FREE') {
        this.state = 'FREE';
        return this._buildEvent(nowSim);
      }
      return null;
    }

    if (this.nextChangeSimMs === null) {
      this.scheduleNext(nowSim);
      return null;
    }

    if (nowSim.getTime() >= this.nextChangeSimMs) {
      this.state = this.state === 'FREE' ? 'OCCUPIED' : 'FREE';
      const evt = this._buildEvent(nowSim);
      this.scheduleNext(nowSim);
      return evt;
    }

    return null;
  }

  _buildEvent(nowSim) {
    return {
      eventId: uuidv4(),
      ts: nowSim.toISOString(),
      sectorId: this.sectorId,
      spotId: this.spotId,
      state: this.state,
      source: 'gateway',
    };
  }
}

module.exports = { Spot, FAULT_MODES };
