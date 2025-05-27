require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const app = require('./src/app');
const socketAuth = require('./src/sockets/socketAuth');
const handleSocketEvents = require('./src/sockets/socketHandlers');
const { connectRabbitMQ } = require('./src/services/rabbitmq');
const { connectQueue } = require('./src/services/messageConsumer');
const { connectRedis } = require('./src/services/redis');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// Use socketAuth middleware to authenticate user
io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`✅ ${socket.user.username} connected`);
  
  // Join the user to a socket room based on their user ID
  socket.join(socket.user._id.toString());  // This ensures the user is in a room named by their ID
  
  // Handle socket events (group creation, messaging, etc.)
  handleSocketEvents(io, socket);
  
  socket.on('disconnect', () => {
    console.log(`❌ ${socket.user.username} disconnected`);
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    await connectRabbitMQ();
    await connectQueue(io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer();
