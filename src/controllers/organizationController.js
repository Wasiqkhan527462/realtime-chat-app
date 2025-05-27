const Organization = require('../models/Ogranization');

// Controller to create a new organization
exports.createOrganization = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if the organization name already exists
    const existingOrganization = await Organization.findOne({ name });
    if (existingOrganization) {
      return res.status(400).json({ message: 'Organization with this name already exists.' });
    }

    // Create a new organization
    const newOrganization = new Organization({
      name,
      description
    });

    await newOrganization.save();
    return res.status(201).json({
      message: 'Organization created successfully!',
      organization: newOrganization
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error. Could not create organization.' });
  }
};
