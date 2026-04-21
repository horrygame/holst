const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const WIDTH = 1024;
const HEIGHT = 1024;
const PIXEL_COUNT = WIDTH * HEIGHT;

// Храним холст как Uint8ClampedArray RGB
let canvasState = new Uint8ClampedArray(PIXEL_COUNT * 3);
// Заполняем белым (255,255,255)
for (let i = 0; i < PIXEL_COUNT * 3; i += 3) {
    canvasState[i] = 255;
    canvasState[i+1] = 255;
    canvasState[i+2] = 255;
}

function setPixel(x, y, r, g, b) {
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
        const idx = (y * WIDTH + x) * 3;
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

    // Отправляем текущее состояние холста (бинарные данные)
    socket.emit('init', {
        width: WIDTH,
        height: HEIGHT,
        buffer: canvasState.buffer
    });

    // Установка одного пикселя
    socket.on('pixel', (data) => {
        const { x, y, colorHex } = data;
        const [r, g, b] = hexToRgb(colorHex);
        setPixel(x, y, r, g, b);
        // Рассылаем всем (включая отправителя)
        io.emit('pixel', { x, y, colorHex });
    });

    // Очистка холста
    socket.on('clear', () => {
        for (let i = 0; i < PIXEL_COUNT * 3; i += 3) {
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
    console.log(`Пиксель-арт сервер запущен на порту ${PORT} (${WIDTH}x${HEIGHT})`);
});
