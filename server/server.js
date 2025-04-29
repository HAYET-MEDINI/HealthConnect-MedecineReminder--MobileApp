// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Permet toutes les connexions
  }
});

io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté');

  socket.on('chat message', (msg) => {
    console.log('Message reçu : ' + msg);
    socket.broadcast.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('Un utilisateur est déconnecté');
  });
});

server.listen(3000, () => {
  console.log('Serveur écoute sur http://localhost:3000');
});