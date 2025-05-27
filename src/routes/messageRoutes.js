const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const protect = require('../middlewares/authMiddleware');

// @desc    Get messages for a room
// @route   GET /api/messages/:roomId
// @access  Private
router.get('/:roomId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'username');
      
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @desc    Create a new message
// @route   POST /api/messages
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { roomId, content } = req.body;
    const newMessage = await Message.create({
      sender: req.user._id,
      content,
      room: roomId
    });

    const messageData = {
      sender: req.user.username,
      senderId: req.user._id,
      content,
      room: roomId,
      timestamp: newMessage.createdAt
    };

    // Publish to RabbitMQ
    publishMessage(messageData);

    res.status(201).json(messageData);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
