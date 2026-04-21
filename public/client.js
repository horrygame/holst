const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const colorPreview = document.getElementById('colorPreview');
const clearBtn = document.getElementById('clearBtn');

let currentColor = '#ff0000';
const socket = io();

colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
    colorPreview.style.backgroundColor = currentColor;
});

// Инициализация: получение всего холста
socket.on('init', (data) => {
    const { width, height, buffer } = data;
    canvas.width = width;
    canvas.height = height;
    
    const rgbData = new Uint8ClampedArray(buffer);
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
        imageData.data[i * 4] = rgbData[i * 3];
        imageData.data[i * 4 + 1] = rgbData[i * 3 + 1];
        imageData.data[i * 4 + 2] = rgbData[i * 3 + 2];
        imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    console.log('Холст инициализирован');
});

// Обновление одного пикселя от сервера
socket.on('pixel', (data) => {
    const { x, y, colorHex } = data;
    // Закрашиваем пиксель на canvas
    ctx.fillStyle = colorHex;
    ctx.fillRect(x, y, 1, 1);
});

// Очистка
socket.on('clearAll', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// Конвертация координат мыши в пиксель холста (учитывая масштаб CSS)
function getPixelFromClick(e) {
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
    canvasX = Math.floor(Math.min(Math.max(0, canvasX), canvas.width - 1));
    canvasY = Math.floor(Math.min(Math.max(0, canvasY), canvas.height - 1));
    return { x: canvasX, y: canvasY };
}

// Обработчик клика по холсту
function handleCanvasClick(e) {
    const { x, y } = getPixelFromClick(e);
    // Отправляем на сервер
    socket.emit('pixel', { x, y, colorHex: currentColor });
    // Локально не рисуем — ждём подтверждения от сервера (чтобы синхронизировать)
    // Но можно рисовать и сразу, чтобы не было задержки — добавим для отзывчивости
    ctx.fillStyle = currentColor;
    ctx.fillRect(x, y, 1, 1);
}

// Также можно рисовать при движении с зажатой кнопкой (для заливки нескольких клеток)
let painting = false;

function startPaint(e) {
    painting = true;
    handleCanvasClick(e); // закрасить первую клетку
}

function paint(e) {
    if (!painting) return;
    e.preventDefault();
    handleCanvasClick(e);
}

function stopPaint() {
    painting = false;
}

canvas.addEventListener('mousedown', startPaint);
canvas.addEventListener('mousemove', paint);
canvas.addEventListener('mouseup', stopPaint);
canvas.addEventListener('mouseleave', stopPaint);

// Touch-события для мобильных
canvas.addEventListener('touchstart', startPaint);
canvas.addEventListener('touchmove', paint);
canvas.addEventListener('touchend', stopPaint);

// Очистка холста
clearBtn.addEventListener('click', () => {
    if (confirm('Очистить весь холст для всех? Это необратимо.')) {
        socket.emit('clear');
    }
});
