const express = require('express');
const ctrl = require('../controllers/admin.controller');
const router = express.Router();
router.post('/reset', ctrl.reset);
module.exports = router;
