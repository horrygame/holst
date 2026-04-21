const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const colorPreview = document.getElementById('colorPreview');
const clearBtn = document.getElementById('clearBtn');

let drawing = false;
let lastX = 0, lastY = 0;
let currentColor = '#ff0000';

const socket = io();

colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
    colorPreview.style.backgroundColor = currentColor;
});

// Инициализация: получаем бинарные данные холста
socket.on('init', (data) => {
    const { width, height, buffer } = data;
    canvas.width = width;
    canvas.height = height;
    
    // Преобразуем ArrayBuffer в Uint8ClampedArray (RGB)
    const rgbData = new Uint8ClampedArray(buffer);
    // Создаём ImageData (нужен RGBA, поэтому добавляем альфа-канал = 255)
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
        const r = rgbData[i * 3];
        const g = rgbData[i * 3 + 1];
        const b = rgbData[i * 3 + 2];
        imageData.data[i * 4] = r;
        imageData.data[i * 4 + 1] = g;
        imageData.data[i * 4 + 2] = b;
        imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    console.log('Холст инициализирован (1024x1024)');
});

// Получение команды рисования от сервера
socket.on('draw', (data) => {
    drawOnCanvas(data.x0, data.y0, data.x1, data.y1, data.colorHex);
});

// Очистка
socket.on('clearAll', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log('Холст очищен');
});

// Функция рисования линии на канвасе
function drawOnCanvas(x0, y0, x1, y1, colorHex) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
}

// Получение координат мыши/касания относительно canvas (учитывая реальные пиксели)
function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;   // canvas.width = 1024, rect.width = CSS-ширина
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
    return { x: Math.floor(canvasX), y: Math.floor(canvasY) };
}

function startDrawing(e) {
    drawing = true;
    const { x, y } = getCanvasCoords(e);
    lastX = x;
    lastY = y;
    // Отправляем точку
    socket.emit('draw', {
        x0: lastX, y0: lastY,
        x1: lastX, y1: lastY,
        colorHex: currentColor
    });
}

function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    socket.emit('draw', {
        x0: lastX, y0: lastY,
        x1: x, y1: y,
        colorHex: currentColor
    });
    lastX = x;
    lastY = y;
}

function stopDrawing() {
    drawing = false;
}

clearBtn.addEventListener('click', () => {
    if (confirm('Очистить холст для всех? Это действие необратимо.')) {
        socket.emit('clear');
    }
});

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);
