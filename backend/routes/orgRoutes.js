const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/orgController");
const { protect } = require("../middleware/auth");

// Organizations
router.post("/organizations", protect, ctrl.createOrganization);
router.get("/organizations", protect, ctrl.listOrganizations);

// Departments
router.post("/departments", protect, ctrl.createDepartment);
router.get("/organizations/:organizationId/departments", protect, ctrl.listDepartments);

module.exports = router;
