const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const protect = require('../middlewares/authMiddleware');

// Create a new group
router.post('/', protect, async (req, res) => {
  try {
    const { name, participants } = req.body;
    
    // Ensure the creator is included in participants
    if (!participants.includes(req.user._id.toString())) {
      participants.push(req.user._id);
    }
    
    const newGroup = await Room.create({
      name,
      type: 'group',
      participants,
      createdBy: req.user._id
    });
    
    const populatedGroup = await Room.findById(newGroup._id)
      .populate('participants', 'username');
      
    res.status(201).json(populatedGroup);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all groups for a user
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Room.find({ 
      participants: req.user._id,
      type: 'group'
    }).populate('participants', 'username');
    
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add users to a group
router.post('/:groupId/users', protect, async (req, res) => {
  try {
    const { users } = req.body;
    const group = await Room.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is the creator or has permission
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add users' });
    }
    
    // Add new users to the group
    for (const userId of users) {
      if (!group.participants.includes(userId)) {
        group.participants.push(userId);
      }
    }
    
    await group.save();
    const updatedGroup = await Room.findById(req.params.groupId)
      .populate('participants', 'username');
      
    res.json(updatedGroup);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove a user from a group
router.delete('/:groupId/users/:userId', protect, async (req, res) => {
  try {
    const group = await Room.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Check if user is the creator or removing themselves
    if (group.createdBy.toString() !== req.user._id.toString() && 
        req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to remove users' });
    }
    
    // Remove user from the group
    group.participants = group.participants.filter(
      participant => participant.toString() !== req.params.userId
    );
    
    await group.save();
    res.json({ message: 'User removed from group' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;