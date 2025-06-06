const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
