const { SECTORS } = require('@parking/shared');
const { compute, logAndPublish } = require('../services/recommenderProxy');
const { getMqttClient } = require('../services/mqttBus');

async function get(req, res, next) {
  try {
    const fromSector = req.query.fromSector;
    if (!fromSector || !SECTORS.includes(fromSector)) {
      return res.status(400).json({ error: { code: 'BAD_SECTOR', message: 'fromSector is required and must be A|B|C' } });
    }
    const result = await compute(fromSector);
    // Se realmente recomendou, registra também em ações sob-demanda (sem cooldown — registro de auditoria)
    if (result.recommendedSector) {
      await logAndPublish(result, getMqttClient());
    }
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = { get };
