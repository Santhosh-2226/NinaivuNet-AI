const Organization = require("../models/Organization");
const Department = require("../models/Department");

// Create Organization
exports.createOrganization = async (req, res) => {
  const { name, domain } = req.body;
  try {
    const existing = await Organization.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ ok: false, error: "Organization already exists" });
    }

    const org = new Organization({
      name: name.trim(),
      domain: domain ? domain.trim() : "",
      createdBy: req.user.id
    });

    await org.save();
    res.status(201).json({ ok: true, organization: org });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// List Organizations
exports.listOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find().sort({ name: 1 });
    res.json({ ok: true, organizations });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};


// Create Department
exports.createDepartment = async (req, res) => {
  const { name, organizationId } = req.body;
  try {
    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({ ok: false, error: "Organization not found" });
    }

    const existing = await Department.findOne({ name: name.trim(), organization: organizationId });
    if (existing) {
      return res.status(400).json({ ok: false, error: "Department already exists in this Organization" });
    }

    const dept = new Department({
      name: name.trim(),
      organization: organizationId,
      createdBy: req.user.id
    });

    await dept.save();
    res.status(201).json({ ok: true, department: dept });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// List Departments in Organization
exports.listDepartments = async (req, res) => {
  const { organizationId } = req.params;
  try {
    const departments = await Department.find({ organization: organizationId }).sort({ name: 1 });
    res.json({ ok: true, departments });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
