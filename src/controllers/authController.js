const User = require('../models/User');
const Organization = require('../models/Ogranization');
const generateToken = require('../utils/generateToken');

// Helper function to send user response with token and relevant user details
const sendUserResponse = (user, res, status = 200) => {
  res.status(status).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,            // Include role in response
    organizationId: user.organizationId, // Include organizationId in response
    token: generateToken(user._id)
  });
};

exports.register = async (req, res) => {
  try {
    const { username, email, password, role = 'user', organizationId } = req.body;

    // Ensure the organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(400).json({ message: 'Organization not found' });
    }

    // Check if the user already exists by email
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user with the given data
    const newUser = await User.create({
      username,
      email,
      password,
      role,
      organizationId
    });

    sendUserResponse(newUser, res, 201); // Send the response with the new user
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    sendUserResponse(user, res); // Send the response with the authenticated user
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
