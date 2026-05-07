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
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
];

// Audio System
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playClick() {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;

    // Very fast, light tick
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3000, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.015);

    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.015);
}

function playShutter() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // Soft shutter noise
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    noiseGain.gain.linearRampToValueAtTime(0.0, now + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5000;
    filter.Q.value = 0.5;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
}

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
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray *= brightness;

        // Ordered Dithering (16 levels)
        let level = (gray / 255) * 15;
        const ditheredLevel = Math.floor(level + (bayerMatrix[y % 4][x % 4] / 16));
        const finalLevel = Math.min(15, Math.max(0, ditheredLevel));

        let output = (finalLevel / 15) * 255;
        if (isInverted) output = 255 - output;

        data[i] = data[i + 1] = data[i + 2] = output;
    }
    ctx.putImageData(imageData, 0, 0);
}

function showMessage(text) {
    msgBox.innerText = text;
    msgBox.style.display = 'block';
    setTimeout(() => msgBox.style.display = 'none', 1500);
}

// Gestion de l'importation
importBtn.onclick = () => {
    playClick();
    fileInput.click();
};

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
    playClick();
    currentSource = 'camera';
    modeIndicator.innerText = 'LIVE';
    showMessage("CAM MODE");
};

function addImageToGallery(dataUrl) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'gallery-item';
    img.onclick = () => {
        playClick();
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        const downloadBtn = document.getElementById('downloadModalBtn');

        modalImg.src = dataUrl;
        modal.classList.remove('hidden');

        downloadBtn.onclick = () => {
            playClick();
            const link = document.createElement('a');
            link.download = `WQV1_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        };
    };
    gallery.prepend(img);

    photoCount++;
    counterEl.innerText = photoCount.toString().padStart(3, '0');
}

function savePhoto(dataUrl) {
    let photos = JSON.parse(localStorage.getItem('wqv1_photos') || '[]');
    photos.push(dataUrl);
    localStorage.setItem('wqv1_photos', JSON.stringify(photos));
}

function loadPhotos() {
    let photos = JSON.parse(localStorage.getItem('wqv1_photos') || '[]');
    photos.forEach(dataUrl => {
        addImageToGallery(dataUrl);
    });
}

shutterBtn.onclick = () => {
    playShutter();
    const dataUrl = canvas.toDataURL('image/png');
    addImageToGallery(dataUrl);
    savePhoto(dataUrl);

    showMessage("MEM SAVED");

    canvas.style.filter = 'brightness(3)';
    setTimeout(() => canvas.style.filter = 'contrast(1.1) brightness(0.9)', 100);
};

brightBtn.onclick = () => {
    playClick();
    brightness += 0.2;
    if (brightness > 2.0) brightness = 0.6;
    showMessage(`LIGHT: ${Math.round(brightness * 10)}`);
};

invertBtn.onclick = () => {
    playClick();
    isInverted = !isInverted;
    showMessage(isInverted ? "NEGATIVE" : "NORMAL");
};

function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText =
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}
setInterval(updateClock, 1000);
updateClock();

window.onload = () => {
    initCamera();
    processFrame();
    loadPhotos();
};

// Modal handling
document.getElementById('closeModalBtn').onclick = () => {
    playClick();
    document.getElementById('imageModal').classList.add('hidden');
};

document.getElementById('imageModal').onclick = (e) => {
    if (e.target.id === 'imageModal') {
        playClick();
        document.getElementById('imageModal').classList.add('hidden');
    }
};

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(registration => {
            console.log('ServiceWorker registration successful');
        }).catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
