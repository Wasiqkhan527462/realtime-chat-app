const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');
const { publishMessage } = require('../services/rabbitmq');
const { getCachedMessages, cacheMessages, invalidateRoomCache } = require('../services/redis');

module.exports = (io, socket) => {

  // Update the emitRooms function to include group rooms
  const emitRooms = async (userId, event = 'roomList') => {
    console.log('Emitting rooms for user:', userId);
    // Get both private and group rooms
    const rooms = await Room.find({ 
      participants: userId 
    }).populate('participants', 'username');
    console.log('Rooms found:', rooms);
    io.to(userId.toString()).emit(event, rooms);
  };
  
  // Add these socket event handlers
  socket.on('getGroups', async () => {
    try {
      let groups;
      // Check if the user is an admin
      if (socket.user.role === 'admin') {
        // Admins can see all groups
        groups = await Room.find({ type: 'group' })
          .populate('participants', 'username'); // Populate participants to show usernames
      } else {
        // Regular users can only see groups they are part of
        groups = await Room.find({ 
          participants: socket.user._id,
          type: 'group'
        }).populate('participants', 'username');
      }
      socket.emit('groupList', groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      socket.emit('error', 'Failed to fetch groups');
    }
  });
  
  socket.on('joinRoom', async (roomId) => {
    const room = await Room.findById(roomId);
    if (!room || (!room.participants.includes(socket.user._id) && socket.user.role !== 'admin')) {
      return socket.emit('error', 'Access denied');
    }
    // Admins can access messages from any group
    let messages = await getCachedMessages(roomId) || await Message.find({ room: roomId }).sort({ createdAt: -1 }).limit(20).populate('sender', 'username');
    if (!messages) await cacheMessages(roomId, messages);
    socket.emit('roomMessages', messages.reverse());
  });
  
  socket.on('createGroup', async ({ name, participants }) => {
    // Ensure creator is in participants
    if (!participants.includes(socket.user._id.toString())) {
      participants.push(socket.user._id);
    }
    const newGroup = await Room.create({
      name,
      type: 'group',
      participants,
      createdBy: socket.user._id
    });   
    const populatedGroup = await Room.findById(newGroup._id)
      .populate('participants', 'username'); 
    // Notify all participants about the new group
    participants.forEach(userId => {
      io.to(userId.toString()).emit('newGroup', populatedGroup);
    });
  });
  
  socket.on('addToGroup', async ({ groupId, users }) => {
    const group = await Room.findById(groupId);
    if (!group || group.createdBy.toString() !== socket.user._id.toString()) {
      return socket.emit('error', 'Access denied');
    } 
    // Add new users
    let newUsers = [];
    for (const userId of users) {
      if (!group.participants.includes(userId)) {
        group.participants.push(userId);
        newUsers.push(userId);
      }
    }
    await group.save();
    const updatedGroup = await Room.findById(groupId)
      .populate('participants', 'username');   
    // Notify all participants about the updated group
    group.participants.forEach(userId => {
      io.to(userId.toString()).emit('groupUpdated', updatedGroup);
    });
    // Notify new users they've been added
    newUsers.forEach(userId => {
      io.to(userId.toString()).emit('addedToGroup', updatedGroup);
    });
  });
  
  socket.on('leaveGroup', async ({ groupId }) => {
    const group = await Room.findById(groupId);
    if (!group || !group.participants.includes(socket.user._id)) {
      return socket.emit('error', 'Access denied');
    }
    // Remove user from group
    group.participants = group.participants.filter(
      participant => participant.toString() !== socket.user._id.toString()
    );  
    await group.save();
    socket.emit('leftGroup', groupId);  
    // If group is empty or this was the creator, delete the group
    if (group.participants.length === 0 || 
        group.createdBy.toString() === socket.user._id.toString()) {
      await Room.deleteOne({ _id: groupId });
      await Message.deleteMany({ room: groupId });
      await invalidateRoomCache(groupId);
      group.participants.forEach(userId => {
        io.to(userId.toString()).emit('groupDeleted', groupId);
      });
    } else {
      // Notify remaining participants
      const updatedGroup = await Room.findById(groupId)
        .populate('participants', 'username');
      group.participants.forEach(userId => {
        io.to(userId.toString()).emit('groupUpdated', updatedGroup);
      });
    }
  });

socket.on('getUsers', async () => {
  try {
    // Ensure the logged-in user has an organizationId
    if (!socket.user.organizationId) {
      return socket.emit('error', 'User does not belong to any organization');
    }
    // Find users who belong to the same organization (exclude the current user)
    const users = await User.find({
      _id: { $ne: socket.user._id }, // Exclude the current user
      organizationId: socket.user.organizationId // Match organizationId
    }).select('username _id');
    // Emit the list of users in the same organization
    socket.emit('userList', users);
  } catch (error) {
    console.error('Error fetching users:', error);
    socket.emit('error', 'Failed to fetch users');
  }
});

  socket.on('getRooms', () => {
    console.log('Fetching rooms for user:', socket.user._id);
    emitRooms(socket.user._id);
  });

  socket.on('getPrivateRoom', async ({ userId }) => {
    const existingRoom = await Room.findOne({ type: 'private', participants: { $all: [socket.user._id, userId] } }).populate('participants', 'username');
    if (existingRoom) return socket.emit('privateRoom', existingRoom);
    const otherUser = await User.findById(userId);
    const newRoom = await Room.create({
      name: `Private: ${socket.user.username} & ${otherUser.username}`,
      type: 'private',
      participants: [socket.user._id, userId],
      createdBy: socket.user._id
    });
    const populatedRoom = await Room.findById(newRoom._id).populate('participants', 'username');
    socket.emit('privateRoom', populatedRoom);
  });

  socket.on('joinRoom', async (roomId) => {
    const room = await Room.findById(roomId);
    if (!room || !room.participants.includes(socket.user._id)) return socket.emit('error', 'Access denied');
    socket.join(roomId);
    let messages = await getCachedMessages(roomId) || await Message.find({ room: roomId }).sort({ createdAt: -1 }).limit(20).populate('sender', 'username');
    if (!messages) await cacheMessages(roomId, messages);
    socket.emit('roomMessages', messages.reverse());
  });

  socket.on('sendMessage', async ({ roomId, content }) => {
    const room = await Room.findById(roomId);
    if (!room || !room.participants.includes(socket.user._id)) return socket.emit('error', 'Access denied');
    const newMessage = await Message.create({ sender: socket.user._id, content, room: roomId });
    await invalidateRoomCache(roomId);
    const messageData = { sender: { _id: socket.user._id, username: socket.user.username }, content, room: roomId, timestamp: newMessage.createdAt };
    publishMessage(messageData);
    socket.emit('messageSent', messageData);
  });

  socket.on('deleteRoom', async ({ roomId }) => {
    const room = await Room.findById(roomId);
    if (!room || room.createdBy.toString() !== socket.user._id.toString()) return socket.emit('error', 'Access denied');
    await Message.deleteMany({ room: roomId });
    await ReadStatus.deleteMany({ room: roomId });
    await Room.deleteOne({ _id: roomId });
    await invalidateRoomCache(roomId);
    io.emit('roomDeleted', roomId);
  });
};
