const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const colorPreview = document.getElementById('colorPreview');
const clearBtn = document.getElementById('clearBtn');

let currentColor = '#ff0000';
const socket = io();

// Размер одной клетки в пикселях
const CELL_SIZE = 8;   // 128 * 8 = 1024
const CELLS_W = 128;
const CELLS_H = 128;

colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
    colorPreview.style.backgroundColor = currentColor;
});

// Рисование всей сетки по данным от сервера
function drawGridFromState(rgbData) {
    for (let y = 0; y < CELLS_H; y++) {
        for (let x = 0; x < CELLS_W; x++) {
            const idx = (y * CELLS_W + x) * 3;
            const r = rgbData[idx];
            const g = rgbData[idx+1];
            const b = rgbData[idx+2];
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }
}

// Инициализация от сервера
socket.on('init', (data) => {
    const { width, height, buffer } = data;
    if (width !== CELLS_W || height !== CELLS_H) {
        console.warn('Размеры не совпадают');
    }
    const rgbData = new Uint8ClampedArray(buffer);
    drawGridFromState(rgbData);
    console.log('Холст инициализирован (128x128, клетка 8px)');
});

// Обновление одной клетки от сервера
socket.on('cell', (data) => {
    const { x, y, colorHex } = data;
    ctx.fillStyle = colorHex;
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
});

// Очистка
socket.on('clearAll', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// Конвертация клика в координаты клетки (с учётом масштаба)
function getCellFromClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;   // canvas.width = 1024
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    let canvasX = (clientX - rect.left) * scaleX;
    let canvasY = (clientY - rect.top) * scaleY;
    canvasX = Math.min(Math.max(0, canvasX), canvas.width - 1);
    canvasY = Math.min(Math.max(0, canvasY), canvas.height - 1);
    const cellX = Math.floor(canvasX / CELL_SIZE);
    const cellY = Math.floor(canvasY / CELL_SIZE);
    return { x: Math.min(cellX, CELLS_W-1), y: Math.min(cellY, CELLS_H-1) };
}

function paintCell(e) {
    const { x, y } = getCellFromClick(e);
    socket.emit('cell', { x, y, colorHex: currentColor });
    // Локально рисуем для отзывчивости
    ctx.fillStyle = currentColor;
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

let painting = false;

function startPaint(e) {
    painting = true;
    paintCell(e);
}

function doPaint(e) {
    if (!painting) return;
    e.preventDefault();
    paintCell(e);
}

function stopPaint() {
    painting = false;
}

canvas.addEventListener('mousedown', startPaint);
canvas.addEventListener('mousemove', doPaint);
canvas.addEventListener('mouseup', stopPaint);
canvas.addEventListener('mouseleave', stopPaint);

canvas.addEventListener('touchstart', startPaint);
canvas.addEventListener('touchmove', doPaint);
canvas.addEventListener('touchend', stopPaint);

clearBtn.addEventListener('click', () => {
    if (confirm('Очистить весь холст для всех?')) {
        socket.emit('clear');
    }
});
