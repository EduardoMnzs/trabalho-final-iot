const express = require('express');
const ctrl = require('../controllers/map.controller');
const router = express.Router();
router.get('/', ctrl.getMap);
module.exports = router;
