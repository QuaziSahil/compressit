/**
 * CompressIt - Image Compression Tool
 * Client-side image compression using HTML5 Canvas
 */

// State management
const state = {
    originalFile: null,
    originalImage: null,
    compressedBlob: null,
    quality: 80,
    outputFormat: 'image/jpeg',
    aspectRatio: 1,
    lockAspectRatio: true
};

// DOM Elements
const elements = {
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    compressionPanel: document.getElementById('compressionPanel'),
    originalPreview: document.getElementById('originalPreview'),
    compressedPreview: document.getElementById('compressedPreview'),
    originalInfo: document.getElementById('originalInfo'),
    compressedInfo: document.getElementById('compressedInfo'),
    savings: document.getElementById('savings'),
    qualitySlider: document.getElementById('qualitySlider'),
    qualityValue: document.getElementById('qualityValue'),
    widthInput: document.getElementById('widthInput'),
    heightInput: document.getElementById('heightInput'),
    aspectRatio: document.getElementById('aspectRatio'),
    formatButtons: document.querySelectorAll('.format-btn'),
    downloadBtn: document.getElementById('downloadBtn'),
    resetBtn: document.getElementById('resetBtn'),
    menuToggle: document.querySelector('.menu-toggle'),
    navLinks: document.querySelector('.nav-links')
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupUploadZone();
    setupControls();
    setupNavigation();
}

// ===== Upload Zone =====
function setupUploadZone() {
    const zone = elements.uploadZone;
    const input = elements.fileInput;

    // Click to upload
    zone.addEventListener('click', () => input.click());

    // File input change
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop
    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file);
        }
    });
}

// ===== File Handling =====
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    state.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            state.originalImage = img;
            state.aspectRatio = img.width / img.height;

            // Set dimension inputs
            elements.widthInput.value = img.width;
            elements.heightInput.value = img.height;
            elements.widthInput.placeholder = img.width;
            elements.heightInput.placeholder = img.height;

            // Show original preview
            elements.originalPreview.src = e.target.result;
            updateOriginalInfo();

            // Show compression panel
            elements.uploadZone.style.display = 'none';
            elements.compressionPanel.classList.add('active');

            // Initial compression
            compressImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ===== Image Compression =====
function compressImage() {
    if (!state.originalImage) return;

    const img = state.originalImage;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Determine output dimensions
    let width = parseInt(elements.widthInput.value) || img.width;
    let height = parseInt(elements.heightInput.value) || img.height;

    canvas.width = width;
    canvas.height = height;

    // Draw image on canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob with quality setting
    const quality = state.quality / 100;

    // PNG is lossless - quality param is ignored. Use WebP for better compression if PNG selected.
    let actualFormat = state.outputFormat;
    let actualQuality = quality;

    if (state.outputFormat === 'image/png') {
        // PNG doesn't support quality - for compression, we'll use lower resolution or suggest JPEG/WebP
        // We'll still output PNG but resize if needed
        actualQuality = undefined; // PNG ignores this anyway
    }

    canvas.toBlob((blob) => {
        if (blob) {
            state.compressedBlob = blob;

            // Update preview
            const url = URL.createObjectURL(blob);
            elements.compressedPreview.src = url;

            // Update info
            updateCompressedInfo(blob.size);
        }
    }, actualFormat, actualQuality);
}

// ===== Info Updates =====
function updateOriginalInfo() {
    const size = state.originalFile.size;
    elements.originalInfo.querySelector('.file-size').textContent = formatFileSize(size);
}

function updateCompressedInfo(compressedSize) {
    const originalSize = state.originalFile.size;
    const savedPercent = Math.round((1 - compressedSize / originalSize) * 100);

    elements.compressedInfo.querySelector('.file-size').textContent = formatFileSize(compressedSize);
    elements.savings.textContent = savedPercent >= 0 ? `-${savedPercent}%` : `+${Math.abs(savedPercent)}%`;
    elements.savings.style.background = savedPercent >= 0 ? 'var(--success)' : '#ef4444';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== Controls Setup =====
function setupControls() {
    // Quality slider
    elements.qualitySlider.addEventListener('input', (e) => {
        state.quality = parseInt(e.target.value);
        elements.qualityValue.textContent = state.quality + '%';
        debounce(compressImage, 100)();
    });

    // Width input
    elements.widthInput.addEventListener('input', () => {
        if (state.lockAspectRatio && state.originalImage) {
            const width = parseInt(elements.widthInput.value) || state.originalImage.width;
            elements.heightInput.value = Math.round(width / state.aspectRatio);
        }
        debounce(compressImage, 300)();
    });

    // Height input
    elements.heightInput.addEventListener('input', () => {
        if (state.lockAspectRatio && state.originalImage) {
            const height = parseInt(elements.heightInput.value) || state.originalImage.height;
            elements.widthInput.value = Math.round(height * state.aspectRatio);
        }
        debounce(compressImage, 300)();
    });

    // Aspect ratio lock
    elements.aspectRatio.addEventListener('change', (e) => {
        state.lockAspectRatio = e.target.checked;
    });

    // Format buttons
    elements.formatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.formatButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.outputFormat = btn.dataset.format;
            compressImage();
        });
    });

    // Download button
    elements.downloadBtn.addEventListener('click', downloadCompressedImage);

    // Reset button
    elements.resetBtn.addEventListener('click', resetCompressor);
}

// ===== Download =====
function downloadCompressedImage() {
    if (!state.compressedBlob) return;

    const extension = state.outputFormat.split('/')[1];
    const originalName = state.originalFile.name.replace(/\.[^/.]+$/, '');
    const filename = `${originalName}_compressed.${extension}`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(state.compressedBlob);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
}

// ===== Reset =====
function resetCompressor() {
    // Reset state
    state.originalFile = null;
    state.originalImage = null;
    state.compressedBlob = null;
    state.quality = 80;
    state.outputFormat = 'image/jpeg';

    // Reset UI
    elements.qualitySlider.value = 80;
    elements.qualityValue.textContent = '80%';
    elements.widthInput.value = '';
    elements.heightInput.value = '';
    elements.fileInput.value = '';

    // Reset format buttons
    elements.formatButtons.forEach((btn, i) => {
        btn.classList.toggle('active', i === 0);
    });

    // Show upload zone, hide panel
    elements.uploadZone.style.display = 'block';
    elements.compressionPanel.classList.remove('active');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Navigation =====
function setupNavigation() {
    // Mobile menu toggle
    elements.menuToggle?.addEventListener('click', () => {
        elements.navLinks.classList.toggle('active');
    });

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);

            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                elements.navLinks.classList.remove('active');
            }

            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

// ===== Utilities =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
