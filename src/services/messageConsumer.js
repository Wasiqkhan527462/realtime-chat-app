const amqplib = require('amqplib');
const Room = require('../models/Room');

let channel, connection;

const connectQueue = async (io) => {
  try {
    connection = await amqplib.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue('messages');

    channel.consume('messages', async (data) => {
      const message = JSON.parse(data.content);
      const room = await Room.findById(message.room);
      
      if (room) {
        io.to(message.room).emit('newMessage', message);
      }
      
      channel.ack(data);
    });

    console.log('✅ Message consumer connected');
  } catch (error) {
    console.error('❌ Message consumer error:', error);
  }
};

module.exports = { connectQueue };
