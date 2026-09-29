const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { MessageHandler } = require('./MessageHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const rooms = new Map(); // roomId -> Room (in memory)

app.get('/health', (_req, res) => res.send('ok'));

// serve the built React app (client/dist) from the same server
const dist = path.join(__dirname, '../client/dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

io.on('connection', (socket) => new MessageHandler(io, rooms, socket));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Watch Party running on port ${PORT}`));
