const { getModels, SECTORS } = require('@parking/shared');
const { QueryTypes } = require('sequelize');

async function turnover(req, res, next) {
  try {
    const sectorId = req.query.sectorId;
    if (!sectorId || !SECTORS.includes(sectorId)) {
      return res.status(400).json({ error: { code: 'BAD_SECTOR', message: 'sectorId is required and must be A|B|C' } });
    }
    // Defaults usam o MAX(ts) gravado em spot_events como "now". Isso casa com o tempo simulado
    // do simulador independente de quando cada container subiu.
    const { sequelize } = getModels();
    const [maxRow] = await sequelize.query(`SELECT MAX(ts) AS max_ts FROM spot_events`, { type: QueryTypes.SELECT });
    const fallbackNow = maxRow && maxRow.max_ts ? new Date(maxRow.max_ts) : new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(fallbackNow.getTime() - 24 * 3600 * 1000);
    const to = req.query.to ? new Date(req.query.to) : fallbackNow;
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: { code: 'BAD_DATES', message: 'invalid from/to' } });
    }

    // Transições FREE→OCCUPIED dentro da janela, usando LAG()
    const rows = await sequelize.query(
      `
      WITH ordered AS (
        SELECT spot_id, sector_id, state, ts,
               LAG(state) OVER (PARTITION BY spot_id ORDER BY ts) AS prev_state
          FROM spot_events
         WHERE sector_id = :sectorId
           AND ts BETWEEN :from AND :to
      )
      SELECT
        date_trunc('hour', ts) AS hour,
        COUNT(*) FILTER (WHERE state = 'OCCUPIED' AND prev_state = 'FREE') AS transitions
      FROM ordered
      GROUP BY 1
      ORDER BY 1;
      `,
      {
        replacements: { sectorId, from, to },
        type: QueryTypes.SELECT,
      },
    );

    const total = rows.reduce((acc, r) => acc + parseInt(r.transitions, 10), 0);
    res.json({
      sectorId,
      from: from.toISOString(),
      to: to.toISOString(),
      turnover: total,
      perHour: rows.map((r) => ({
        hour: new Date(r.hour).toISOString(),
        count: parseInt(r.transitions, 10),
      })),
    });
  } catch (e) { next(e); }
}

module.exports = { turnover };
