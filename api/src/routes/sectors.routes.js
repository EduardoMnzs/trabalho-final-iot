const express = require('express');
const ctrl = require('../controllers/sectors.controller');
const router = express.Router();
router.get('/', ctrl.listSectors);
router.get('/:sectorId/spots', ctrl.spotsBySector);
router.get('/:sectorId/free-spots', ctrl.freeSpotsBySector);
module.exports = router;
