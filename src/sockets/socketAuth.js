const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketAuth = async (socket, next) => {
  try {
    // Accept token from either auth payload or query param
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) throw new Error('Authentication error');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) throw new Error('User not found');
    
    socket.user = user;
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
};


module.exports = socketAuth;
