const amqplib = require('amqplib');

let channel;

const connectRabbitMQ = async () => {
  try {
    channel = await (await amqplib.connect(process.env.RABBITMQ_URL)).createChannel();
    await channel.assertQueue('messages', { durable: true });
    console.log('✅ Connected to RabbitMQ');
  } catch (err) {
    console.error('❌ RabbitMQ connection failed:', err.message);
  }
};

const publishMessage = (msgObj) => {
  if (!channel) return console.error('RabbitMQ channel not ready');
  channel.sendToQueue('messages', Buffer.from(JSON.stringify(msgObj)), { persistent: true });
};

module.exports = { connectRabbitMQ, publishMessage };
