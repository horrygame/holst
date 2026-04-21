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

socket.on('init', (data) => {
    const { canvasState, width, height } = data;
    canvas.width = width;
    canvas.height = height;
    const imgData = ctx.getImageData(0, 0, width, height);
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const color = canvasState[x][y];
            const idx = (y * width + x) * 4;
            const r = parseInt(color.slice(1,3), 16);
            const g = parseInt(color.slice(3,5), 16);
            const b = parseInt(color.slice(5,7), 16);
            imgData.data[idx] = r;
            imgData.data[idx+1] = g;
            imgData.data[idx+2] = b;
            imgData.data[idx+3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
});

socket.on('draw', (data) => {
    drawOnCanvas(data.x0, data.y0, data.x1, data.y1, data.color);
});

socket.on('clearAll', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

function drawOnCanvas(x0, y0, x1, y1, color) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
}

function getMouseCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    let x = (clientX - rect.left) * scaleX;
    let y = (clientY - rect.top) * scaleY;
    x = Math.min(Math.max(0, x), canvas.width - 1);
    y = Math.min(Math.max(0, y), canvas.height - 1);
    return { x: Math.floor(x), y: Math.floor(y) };
}

function startDrawing(e) {
    drawing = true;
    const { x, y } = getMouseCoords(e);
    lastX = x;
    lastY = y;
    drawOnCanvas(lastX, lastY, lastX, lastY, currentColor);
    socket.emit('draw', { x0: lastX, y0: lastY, x1: lastX, y1: lastY, color: currentColor });
}

function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getMouseCoords(e);
    drawOnCanvas(lastX, lastY, x, y, currentColor);
    socket.emit('draw', { x0: lastX, y0: lastY, x1: x, y1: y, color: currentColor });
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
