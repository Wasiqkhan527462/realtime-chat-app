const express = require('express');
const router = express.Router();
const { createOrganization } = require('../controllers/organizationController');

// Route to create an organization
router.post('/create', createOrganization);

module.exports = router;
