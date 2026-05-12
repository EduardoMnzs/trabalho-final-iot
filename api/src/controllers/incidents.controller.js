const { getModels, SECTORS } = require("@parking/shared");
const { incidentDto } = require("../views");

async function list(req, res, next) {
  try {
    const { Incident } = getModels();
    const where = {};
    const status = (req.query.status || "open").toLowerCase();
    if (status === "open") where.status = "OPEN";
    else if (status === "closed") where.status = "CLOSED";
    else if (status !== "all") {
      return res
        .status(400)
        .json({
          error: {
            code: "BAD_STATUS",
            message: "status must be open|closed|all",
          },
        });
    }
    if (req.query.sectorId) {
      if (!SECTORS.includes(req.query.sectorId)) {
        return res
          .status(400)
          .json({
            error: { code: "BAD_SECTOR", message: "sectorId must be A|B|C" },
          });
      }
      where.sectorId = req.query.sectorId;
    }
    const rows = await Incident.findAll({
      where,
      order: [["tsOpen", "DESC"]],
      limit: 200,
    });
    res.json({ incidents: rows.map(incidentDto) });
  } catch (e) {
    next(e);
  }
}

module.exports = { list };
