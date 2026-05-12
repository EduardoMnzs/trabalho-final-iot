const express = require('express');
const ctrl = require('../controllers/recommendation.controller');
const router = express.Router();
router.get('/', ctrl.get);
module.exports = router;
