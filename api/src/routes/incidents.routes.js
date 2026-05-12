const express = require('express');
const ctrl = require('../controllers/incidents.controller');
const router = express.Router();
router.get('/', ctrl.list);
module.exports = router;
