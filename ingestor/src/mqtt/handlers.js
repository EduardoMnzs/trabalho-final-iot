const { persistEvent } = require('../services/ingestion');
const { checkFlapping } = require('../services/flapping');
const { maybeTrigger } = require('../services/recommender');

const EVENT_TOPIC = /^campus\/parking\/sectors\/([A-Z])\/spots\/([A-Z]-\d{2})\/events$/;
const GATEWAY_TOPIC = /^campus\/parking\/sectors\/([A-Z])\/gateway\/status$/;

function validateEvent(payload) {
  if (!payload || typeof payload !== 'object') return 'payload not object';
  if (!payload.eventId) return 'missing eventId';
  if (!payload.ts) return 'missing ts';
  if (!payload.sectorId) return 'missing sectorId';
  if (!payload.spotId) return 'missing spotId';
  if (payload.state !== 'FREE' && payload.state !== 'OCCUPIED') return 'invalid state';
  if (payload.source !== 'sensor' && payload.source !== 'gateway') return 'invalid source';
  return null;
}

function makeHandler({ mqttClient, log }) {
  return async function onMessage(topic, messageBuf) {
    const evtMatch = topic.match(EVENT_TOPIC);
    const gwMatch = topic.match(GATEWAY_TOPIC);

    if (gwMatch) {
      // só loga; não persiste status de gateway
      try {
        const p = JSON.parse(messageBuf.toString());
        log(`gateway ${gwMatch[1]} -> ${p.status || '?'}`);
      } catch {}
      return;
    }

    if (!evtMatch) {
      log('ignoring topic', topic);
      return;
    }

    let payload;
    try {
      payload = JSON.parse(messageBuf.toString());
    } catch (e) {
      log('bad json on', topic, e.message);
      return;
    }

    const err = validateEvent(payload);
    if (err) {
      log('invalid event', err, topic);
      return;
    }

    // Coerência topic vs payload
    if (payload.spotId !== evtMatch[2] || payload.sectorId !== evtMatch[1]) {
      log('topic/payload mismatch', topic, payload.spotId, payload.sectorId);
      return;
    }

    try {
      const { wasNew } = await persistEvent(payload);
      if (!wasNew) return;

      await checkFlapping({ spotId: payload.spotId, sectorId: payload.sectorId });
      maybeTrigger(payload.sectorId, mqttClient).catch((e) =>
        log('recommender error', e.message),
      );
    } catch (e) {
      log('persist error', e.message);
    }
  };
}

module.exports = { makeHandler };
