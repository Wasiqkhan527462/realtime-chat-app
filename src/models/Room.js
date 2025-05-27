const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['group', 'private'], required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Add indexes for better query performance
roomSchema.index({ participants: 1 });
roomSchema.index({ type: 1, participants: 1 });

module.exports = mongoose.model('Room', roomSchema);