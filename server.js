const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const CELLS_W = 128;
const CELLS_H = 128;
const TOTAL_CELLS = CELLS_W * CELLS_H;

// Храним цвета для каждой клетки (RGB)
let canvasState = new Uint8ClampedArray(TOTAL_CELLS * 3);
for (let i = 0; i < TOTAL_CELLS * 3; i += 3) {
    canvasState[i] = 255;
    canvasState[i+1] = 255;
    canvasState[i+2] = 255;
}

function setCell(x, y, r, g, b) {
    if (x >= 0 && x < CELLS_W && y >= 0 && y < CELLS_H) {
        const idx = (y * CELLS_W + x) * 3;
        canvasState[idx] = r;
        canvasState[idx+1] = g;
        canvasState[idx+2] = b;
    }
}

function hexToRgb(hex) {
    return [
        parseInt(hex.slice(1,3), 16),
        parseInt(hex.slice(3,5), 16),
        parseInt(hex.slice(5,7), 16)
    ];
}

io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    socket.emit('init', {
        width: CELLS_W,
        height: CELLS_H,
        buffer: canvasState.buffer
    });

    socket.on('cell', (data) => {
        const { x, y, colorHex } = data;
        const [r, g, b] = hexToRgb(colorHex);
        setCell(x, y, r, g, b);
        io.emit('cell', { x, y, colorHex });
    });

    socket.on('clear', () => {
        for (let i = 0; i < TOTAL_CELLS * 3; i += 3) {
            canvasState[i] = 255;
            canvasState[i+1] = 255;
            canvasState[i+2] = 255;
        }
        io.emit('clearAll');
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер пиксель-арта 128x128 (крупные клетки) на порту ${PORT}`);
});
