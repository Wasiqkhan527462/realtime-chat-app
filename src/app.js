const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const groupRoutes = require('./routes/groupRoutes');
const organizationRoutes = require('./routes/organizationRoutes'); // Import your organization routes

const app = express();

// Middleware
app.use(cors(), helmet(), express.json(), morgan('dev'));

// Rate limiting for auth routes
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many attempts from this IP, please try again later.'
}), authRoutes);

// Basic route
app.get('/', (req, res) => res.send('Chat App API Running'));

// Register after auth routes
app.use('/api/messages', messageRoutes);

// Add this line after your other app.use statements
app.use('/api/groups', groupRoutes);

// Add organization route (make sure it's after your other routes)
app.use('/api/organizations', organizationRoutes); // This is where the organization routes are integrated

module.exports = app;
