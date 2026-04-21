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

// Храним холст как Uint8ClampedArray в формате RGB (без альфа)
let canvasState = new Uint8ClampedArray(PIXEL_COUNT * 3);
// Заполняем белым цветом (255,255,255)
for (let i = 0; i < PIXEL_COUNT * 3; i += 3) {
    canvasState[i] = 255;     // R
    canvasState[i+1] = 255;   // G
    canvasState[i+2] = 255;   // B
}

// Установка цвета пикселя (RGB)
function setPixel(x, y, r, g, b) {
    if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
        const idx = (y * WIDTH + x) * 3;
        canvasState[idx] = r;
        canvasState[idx+1] = g;
        canvasState[idx+2] = b;
    }
}

// Алгоритм Брезенхема для линии (обновляет массив)
function drawLine(x0, y0, x1, y1, r, g, b) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        setPixel(x0, y0, r, g, b);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}

// Преобразование hex цвета в RGB
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return [r, g, b];
}

io.on('connection', (socket) => {
    console.log('Новый пользователь подключился');

    // Отправляем бинарные данные холста + размеры
    socket.emit('init', {
        width: WIDTH,
        height: HEIGHT,
        buffer: canvasState.buffer  // передаём ArrayBuffer
    });

    // Обработка рисования
    socket.on('draw', (data) => {
        const { x0, y0, x1, y1, colorHex } = data;
        const [r, g, b] = hexToRgb(colorHex);
        // Обновляем серверный массив
        drawLine(x0, y0, x1, y1, r, g, b);
        // Рассылаем всем (включая отправителя)
        io.emit('draw', { x0, y0, x1, y1, colorHex });
    });

    // Очистка холста
    socket.on('clear', () => {
        // Заполняем белым
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
    console.log(`Сервер запущен на порту ${PORT} (холст ${WIDTH}x${HEIGHT})`);
});
