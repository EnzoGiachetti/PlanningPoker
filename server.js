const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomId, user }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = { users: {}, revealed: false, scaleType: 'fibonacci' };
        }
        rooms[roomId].users[socket.id] = { ...user, id: socket.id, vote: null };
        io.to(roomId).emit('roomUpdate', rooms[roomId]);
    });

    socket.on('changeRole', ({ roomId, role }) => {
        if (rooms[roomId] && rooms[roomId].users[socket.id]) {
            rooms[roomId].users[socket.id].role = role;
            if (role === 'spectator') rooms[roomId].users[socket.id].vote = null;
            io.to(roomId).emit('roomUpdate', rooms[roomId]);
        }
    });

    socket.on('vote', ({ roomId, vote }) => {
        if (rooms[roomId] && rooms[roomId].users[socket.id]) {
            rooms[roomId].users[socket.id].vote = vote;
            io.to(roomId).emit('roomUpdate', rooms[roomId]);
        }
    });

    socket.on('reveal', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].revealed = true;
            io.to(roomId).emit('roomUpdate', rooms[roomId]);
        }
    });

    socket.on('reset', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].revealed = false;
            Object.keys(rooms[roomId].users).forEach(id => {
                rooms[roomId].users[id].vote = null;
            });
            io.to(roomId).emit('roomUpdate', rooms[roomId]);
        }
    });

    socket.on('changeScale', ({ roomId, scaleType }) => {
        if (rooms[roomId]) {
            rooms[roomId].scaleType = scaleType;
            rooms[roomId].revealed = false;
            Object.keys(rooms[roomId].users).forEach(id => {
                rooms[roomId].users[id].vote = null;
            });
            io.to(roomId).emit('roomUpdate', rooms[roomId]);
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].users[socket.id]) {
                delete rooms[roomId].users[socket.id];
                io.to(roomId).emit('roomUpdate', rooms[roomId]);
                if (Object.keys(rooms[roomId].users).length === 0) {
                    delete rooms[roomId];
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});