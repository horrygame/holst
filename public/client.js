const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');

let currentColor = '#ff0000';
const socket = io();

colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
});

socket.on('init', (data) => {
    const { width, height, buffer } = data;
    canvas.width = width;
    canvas.height = height;
    
    const rgbData = new Uint8ClampedArray(buffer);
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) {
        imageData.data[i*4] = rgbData[i*3];
        imageData.data[i*4+1] = rgbData[i*3+1];
        imageData.data[i*4+2] = rgbData[i*3+2];
        imageData.data[i*4+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
});

socket.on('pixel', (data) => {
    const { x, y, colorHex } = data;
    ctx.fillStyle = colorHex;
    ctx.fillRect(x, y, 1, 1);
});

function getPixelFromClick(e) {
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
    let canvasX = (clientX - rect.left) * scaleX;
    let canvasY = (clientY - rect.top) * scaleY;
    canvasX = Math.floor(Math.min(Math.max(0, canvasX), canvas.width - 1));
    canvasY = Math.floor(Math.min(Math.max(0, canvasY), canvas.height - 1));
    return { x: canvasX, y: canvasY };
}

function paintPixel(e) {
    const { x, y } = getPixelFromClick(e);
    socket.emit('pixel', { x, y, colorHex: currentColor });
    ctx.fillStyle = currentColor;
    ctx.fillRect(x, y, 1, 1);
}

let painting = false;

function startPaint(e) {
    painting = true;
    paintPixel(e);
}

function doPaint(e) {
    if (!painting) return;
    e.preventDefault();
    paintPixel(e);
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
