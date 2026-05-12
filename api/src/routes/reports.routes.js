const express = require('express');
const ctrl = require('../controllers/reports.controller');
const router = express.Router();
router.get('/turnover', ctrl.turnover);
module.exports = router;
