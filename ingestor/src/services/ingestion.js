const { getModels } = require('@parking/shared');
const { Op } = require('sequelize');

async function persistEvent(payload) {
  const { sequelize, Spot, SpotEvent } = getModels();
  const { eventId, ts, sectorId, spotId, state, source } = payload;
  let wasNew = false;

  await sequelize.transaction(async (t) => {
    const [, created] = await SpotEvent.findOrCreate({
      where: { eventId },
      defaults: {
        eventId,
        ts: new Date(ts),
        sectorId,
        spotId,
        state,
        source,
        rawPayloadJson: payload,
      },
      transaction: t,
    });

    if (!created) return; // duplicata, idempotente
    wasNew = true;

    await Spot.update(
      {
        currentState: state,
        lastChangeTs: new Date(ts),
        lastEventId: eventId,
      },
      {
        where: {
          spotId,
          [Op.or]: [{ lastChangeTs: { [Op.lt]: new Date(ts) } }, { lastChangeTs: null }],
        },
        transaction: t,
      },
    );
  });

  return { wasNew };
}

module.exports = { persistEvent };
