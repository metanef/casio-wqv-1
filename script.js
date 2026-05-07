const video = document.getElementById('video');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const shutterBtn = document.getElementById('shutterBtn');
const brightBtn = document.getElementById('brightBtn');
const invertBtn = document.getElementById('invertBtn');
const importBtn = document.getElementById('importBtn');
const camBtn = document.getElementById('camBtn');
const fileInput = document.getElementById('fileInput');
const gallery = document.getElementById('gallery');
const msgBox = document.getElementById('msgBox');
const counterEl = document.getElementById('counter');
const modeIndicator = document.getElementById('mode-indicator');

let brightness = 1.0;
let isInverted = false;
let photoCount = 0;
let currentSource = 'camera'; // 'camera' or 'image'
let importedImage = null;

const bayerMatrix = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
];

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 480, height: 480 }, 
            audio: false 
        });
        video.srcObject = stream;
        currentSource = 'camera';
        modeIndicator.innerText = 'LIVE';
    } catch (err) {
        console.error("Camera error:", err);
        showMessage("CAMERA ERROR");
    }
}

function processFrame() {
    if (currentSource === 'camera' && video.readyState === video.HAVE_ENOUGH_DATA) {
        // Centre l'image caméra (Crop carré)
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 120, 120);
        applyWQV1Filter();
    } else if (currentSource === 'image' && importedImage) {
        ctx.drawImage(importedImage, 0, 0, 120, 120);
        applyWQV1Filter();
    }
    requestAnimationFrame(processFrame);
}

function applyWQV1Filter() {
    const imageData = ctx.getImageData(0, 0, 120, 120);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % 120;
        const y = Math.floor((i / 4) / 120);

        // Conversion Luminance
        let gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        gray *= brightness;

        // Ordered Dithering (16 levels)
        let level = (gray / 255) * 15;
        const ditheredLevel = Math.floor(level + (bayerMatrix[y % 4][x % 4] / 16));
        const finalLevel = Math.min(15, Math.max(0, ditheredLevel));
        
        let output = (finalLevel / 15) * 255;
        if (isInverted) output = 255 - output;

        data[i] = data[i+1] = data[i+2] = output;
    }
    ctx.putImageData(imageData, 0, 0);
}

function showMessage(text) {
    msgBox.innerText = text;
    msgBox.style.display = 'block';
    setTimeout(() => msgBox.style.display = 'none', 1500);
}

// Gestion de l'importation
importBtn.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            importedImage = img;
            currentSource = 'image';
            modeIndicator.innerText = 'FILE';
            showMessage("IMG LOADED");
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
};

camBtn.onclick = () => {
    currentSource = 'camera';
    modeIndicator.innerText = 'LIVE';
    showMessage("CAM MODE");
};

shutterBtn.onclick = () => {
    const dataUrl = canvas.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'gallery-item';
    img.onclick = () => {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        const downloadBtn = document.getElementById('downloadModalBtn');
        
        modalImg.src = dataUrl;
        modal.classList.remove('hidden');
        
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `WQV1_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        };
    };
    gallery.prepend(img);
    
    photoCount++;
    counterEl.innerText = photoCount.toString().padStart(3, '0');
    showMessage("MEM SAVED");
    
    canvas.style.filter = 'brightness(3)';
    setTimeout(() => canvas.style.filter = 'contrast(1.1) brightness(0.9)', 100);
};

brightBtn.onclick = () => {
    brightness += 0.2;
    if (brightness > 2.0) brightness = 0.6;
    showMessage(`LIGHT: ${Math.round(brightness * 10)}`);
};

invertBtn.onclick = () => {
    isInverted = !isInverted;
    showMessage(isInverted ? "NEGATIVE" : "NORMAL");
};

function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText = 
        `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
}
setInterval(updateClock, 1000);
updateClock();

window.onload = () => {
    initCamera();
    processFrame();
};

// Modal handling
document.getElementById('closeModalBtn').onclick = () => {
    document.getElementById('imageModal').classList.add('hidden');
};

document.getElementById('imageModal').onclick = (e) => {
    if (e.target.id === 'imageModal') {
        document.getElementById('imageModal').classList.add('hidden');
    }
};
