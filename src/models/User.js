const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Assuming you have an Organization model already
// const Organization = require('./models/Organization');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['user', 'admin'], // Role can only be 'user' or 'admin'
    default: 'user' 
  },
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', // Reference to the Organization model
    required: true // Assuming the user should belong to an organization
  }
}, { timestamps: true });

// Hash password before saving the user
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(10));
  next();
});

// Method to check if entered password matches the stored password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
