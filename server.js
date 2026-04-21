const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const WIDTH = 800;
const HEIGHT = 600;

// Состояние холста (белый фон)
let canvasState = Array(WIDTH).fill().map(() => Array(HEIGHT).fill('#ffffff'));

function setPixel(x, y, color) {
  if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
    canvasState[x][y] = color;
  }
}

function drawLine(x0, y0, x1, y1, color) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    setPixel(x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

io.on('connection', (socket) => {
  console.log('Новый пользователь подключился');

  // Отправляем новому пользователю текущее состояние холста
  socket.emit('init', { canvasState, width: WIDTH, height: HEIGHT });

  // Принимаем событие рисования
  socket.on('draw', (data) => {
    const { x0, y0, x1, y1, color } = data;
    drawLine(x0, y0, x1, y1, color);
    socket.broadcast.emit('draw', data);
  });

  // Очистка холста для всех
  socket.on('clear', () => {
    for (let x = 0; x < WIDTH; x++) {
      for (let y = 0; y < HEIGHT; y++) {
        canvasState[x][y] = '#ffffff';
      }
    }
    io.emit('clearAll');
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
