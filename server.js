const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server,{
    cors: {
      origin: 'http://localhost:3001', // Allow the client origin
      methods: ['GET', 'POST']
    }
  });

// Use CORS middleware
app.use(cors({
    origin: 'http://localhost:3001', // Allow only this origin
    methods: ['GET', 'POST'],
    credentials: true
  }));

// Serve static files if needed
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New user connected');

    // Handle offer event
    socket.on('offer', (data) => {
        socket.broadcast.emit('offer', data);
    });

    // Handle answer event
    socket.on('answer', (data) => {
        socket.broadcast.emit('answer', data);
    });

    // Handle ICE candidate
    socket.on('ice-candidate', (data) => {
        socket.broadcast.emit('ice-candidate', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
