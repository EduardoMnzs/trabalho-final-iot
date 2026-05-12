const express = require('express');
const mapRoutes = require('./map.routes');
const sectorsRoutes = require('./sectors.routes');
const reportsRoutes = require('./reports.routes');
const incidentsRoutes = require('./incidents.routes');
const recommendationRoutes = require('./recommendation.routes');

const router = express.Router();
router.use('/map', mapRoutes);
router.use('/sectors', sectorsRoutes);
router.use('/reports', reportsRoutes);
router.use('/incidents', incidentsRoutes);
router.use('/recommendation', recommendationRoutes);

module.exports = router;
