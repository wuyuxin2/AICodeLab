// 证件照背景色替换工具主要脚本

// 全局变量
let originalImage = null;
let bodypixModel = null;
let selectedColor = '#FFFFFF';
let isProcessing = false;
let webGLSupported = false;
let currentMode = 'view'; // 当前编辑模式: 'view', 'draw', 'erase'
let brushSize = 10; // 笔刷大小
let isDrawing = false; // 是否正在绘制
let segmentationMask = null; // 分割掩码
let originalSegmentationMask = null; // 原始分割掩码（用于重置）
let lastX, lastY; // 上一次绘制位置

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const uploadPrompt = document.getElementById('uploadPrompt');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const processBtn = document.getElementById('processBtn');
const resultContainer = document.getElementById('resultContainer');
const resultCanvas = document.getElementById('resultCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const customColor = document.getElementById('customColor');
const photoSize = document.getElementById('photoSize');
const colorOptions = document.querySelectorAll('.color-option');
// 进度条相关元素
const processingContainer = document.getElementById('processingContainer');
const progressBar = document.getElementById('progressBar');
// 新增：编辑相关元素
const editCanvas = document.getElementById('editCanvas');
const viewBtn = document.getElementById('viewBtn');
const drawBtn = document.getElementById('drawBtn');
const eraseBtn = document.getElementById('eraseBtn');
const brushSizeInput = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const brushControls = document.getElementById('brushControls');
const applyEditBtn = document.getElementById('applyEditBtn');
const resetEditBtn = document.getElementById('resetEditBtn');

    // 检查WebGL支持
function checkWebGLSupport() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl && gl instanceof WebGLRenderingContext;
}
    
// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 检查WebGL支持
    webGLSupported = checkWebGLSupport();
    
    if (!webGLSupported) {
        console.warn('WebGL不受支持，将使用基本模式');
        // 显示警告给用户
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-warning';
        alertDiv.innerHTML = `
            <strong>注意:</strong> 您的设备或浏览器不支持WebGL，将使用基本模式。
            人像分割效果可能不理想。请尝试使用Chrome或Firefox的最新版本以获得最佳效果。
        `;
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('header').nextSibling);
    }
    
    // 事件监听器设置
    setupEventListeners();
    
    // 如果支持WebGL，加载BodyPix模型
    if (webGLSupported) {
    try {
            uploadArea.classList.add('loading');
            bodypixModel = await bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                multiplier: 0.75,
                quantBytes: 2
            });
            console.log('BodyPix 模型加载成功');
    } catch (error) {
            console.error('加载 BodyPix 模型失败:', error);
            webGLSupported = false;
            alert('无法加载人像分割模型，将使用基本模式。');
    } finally {
            uploadArea.classList.remove('loading');
    }
}
});

// 设置事件监听器
function setupEventListeners() {
    // 上传按钮点击事件
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件输入变化事件
    fileInput.addEventListener('change', handleFileSelect);

    // 上传区域拖放事件
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadPrompt.classList.add('bg-light');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadPrompt.classList.remove('bg-light');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadPrompt.classList.remove('bg-light');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // 颜色选择事件
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectedColor = option.dataset.color;
            colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            customColor.value = selectedColor;
        });
    });

    // 自定义颜色事件
    customColor.addEventListener('input', () => {
        selectedColor = customColor.value;
        colorOptions.forEach(opt => opt.classList.remove('active'));
    });

    // 处理按钮点击事件
    processBtn.addEventListener('click', processImage);

    // 下载按钮点击事件
    downloadBtn.addEventListener('click', downloadResult);
    
    // 新增：编辑模式切换事件
    viewBtn.addEventListener('click', () => setEditMode('view'));
    drawBtn.addEventListener('click', () => setEditMode('draw'));
    eraseBtn.addEventListener('click', () => setEditMode('erase'));
    
    // 新增：笔刷大小变化事件
    brushSizeInput.addEventListener('input', () => {
        brushSize = parseInt(brushSizeInput.value);
        brushSizeValue.textContent = brushSize;
    });
    
    // 新增：编辑画布绘制事件
    editCanvas.addEventListener('mousedown', startDrawing);
    editCanvas.addEventListener('mousemove', draw);
    editCanvas.addEventListener('mouseup', stopDrawing);
    editCanvas.addEventListener('mouseout', stopDrawing);
    
    // 新增：触摸设备支持
    editCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        editCanvas.dispatchEvent(mouseEvent);
    });
    
    editCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        editCanvas.dispatchEvent(mouseEvent);
    });
    
    editCanvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup');
        editCanvas.dispatchEvent(mouseEvent);
    });
    
    // 新增：应用编辑按钮事件
    applyEditBtn.addEventListener('click', applyEdit);
    
    // 新增：重置编辑按钮事件
    resetEditBtn.addEventListener('click', resetEdit);
}

// 处理文件选择
function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
}
}

// 处理文件
function handleFile(file) {
    // 检查文件类型
    if (!file.type.match('image.*')) {
        alert('请选择图片文件！');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        // 创建新图像对象以获取图像尺寸
        originalImage = new Image();
        originalImage.onload = () => {
            // 显示预览
            previewImage.src = originalImage.src;
            uploadPrompt.classList.add('d-none');
            previewContainer.classList.remove('d-none');
            processBtn.disabled = false;
        };
        originalImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 更新进度条
function updateProgressBar(percent) {
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
}

// 处理图像 - 更换背景色
async function processImage() {
    if (!originalImage || isProcessing) return;
    
    isProcessing = true;
    processBtn.disabled = true;
    
    // 显示进度条
    processingContainer.classList.remove('d-none');
    resultContainer.classList.add('d-none');
    updateProgressBar(10); // 初始进度
    
    try {
        // 设置画布尺寸
        let width = originalImage.width;
        let height = originalImage.height;
        
        // 添加延迟以确保进度条显示
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgressBar(20);
        
        // 根据选择的照片尺寸调整
        const sizeOption = photoSize.value;
        if (sizeOption !== 'custom') {
            // 根据选定的证件照尺寸调整
            const aspectRatio = sizeOption === '1_1' ? 25/35 : 35/49; // 1寸或2寸的宽高比
            
            // 保持原始图像的宽高比，但确保符合证件照的要求
            if (width / height > aspectRatio) {
                // 原图更宽，以高度为基准
                width = Math.round(height * aspectRatio);
            } else {
                // 原图更高，以宽度为基准
                height = Math.round(width / aspectRatio);
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgressBar(30);
        
        // 设置画布尺寸
        resultCanvas.width = width;
        resultCanvas.height = height;
        editCanvas.width = width;
        editCanvas.height = height;
        
        const ctx = resultCanvas.getContext('2d');
        
        if (webGLSupported && bodypixModel) {
            // WebGL模式：使用BodyPix进行人像分割
            
            // 绘制背景色
            ctx.fillStyle = selectedColor;
            ctx.fillRect(0, 0, width, height);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            updateProgressBar(40);
            
            // 使用 BodyPix 进行人像分割
            const segmentation = await bodypixModel.segmentPerson(originalImage, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
            updateProgressBar(60);
            
            // 创建临时画布用于调整原图尺寸
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // 在临时画布上绘制调整大小后的原图
            tempCtx.drawImage(originalImage, 0, 0, width, height);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            updateProgressBar(70);
            
            // 获取图像数据
            const imageData = tempCtx.getImageData(0, 0, width, height);
            
            // 调整分割掩码以匹配调整后的尺寸
            segmentationMask = resizeSegmentation(segmentation.data, segmentation.width, segmentation.height, width, height);
            // 保存原始分割掩码用于重置
            originalSegmentationMask = new Uint8Array(segmentationMask);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            updateProgressBar(80);
            
            // 应用掩码：保留人像，替换背景
            applyMaskToImage(imageData, segmentationMask, selectedColor);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            updateProgressBar(90);
            
            // 将处理后的图像数据绘制到结果画布上
            ctx.putImageData(imageData, 0, 0);
        } else {
            // 基本模式：使用简单的颜色检测和替换
            // 这种方法不如AI分割准确，但不需要WebGL支持
            
            await new Promise(resolve => setTimeout(resolve, 100));
            updateProgressBar(50);
            
            // 绘制背景色
            ctx.fillStyle = selectedColor;
            ctx.fillRect(0, 0, width, height);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            updateProgressBar(70);
            
            // 绘制原始图像
            ctx.drawImage(originalImage, 0, 0, width, height);
            
            // 创建一个简单的分割掩码（全部是人像）
            segmentationMask = new Uint8Array(width * height);
            segmentationMask.fill(1); // 默认所有像素都是人像
            originalSegmentationMask = new Uint8Array(segmentationMask);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            updateProgressBar(90);
            
            // 提示用户正在使用基本模式
            alert('由于您的设备不支持WebGL，将使用基本模式处理图像。请使用绘制和擦除工具手动调整人像区域。');
            
            // 简单地将图像绘制在背景色上
            ctx.drawImage(originalImage, 0, 0, width, height);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        updateProgressBar(100);
        
        // 短暂延迟后显示结果，让用户看到进度条完成
        setTimeout(() => {
            // 隐藏进度条
            processingContainer.classList.add('d-none');
            
            // 显示结果
            resultContainer.classList.remove('d-none');
            
            // 初始化编辑画布
            initEditCanvas();
        }, 500);
        
    } catch (error) {
        console.error('处理图像时出错:', error);
        alert('处理图像时出错，请重试。');
        
        // 隐藏进度条
        processingContainer.classList.add('d-none');
    } finally {
        isProcessing = false;
        processBtn.disabled = false;
    }
}

/// 应用掩码到图像
function applyMaskToImage(imageData, mask, backgroundColor) {
    const data = imageData.data;
    
    // 转换背景色为RGB
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };
    
    const [bgR, bgG, bgB] = hexToRgb(backgroundColor);
    
    // 应用掩码：保留人像，替换背景
    for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        if (!mask[pixelIndex]) {
            // 背景像素 - 设置为选定的颜色
            data[i] = bgR;     // R
            data[i + 1] = bgG; // G
            data[i + 2] = bgB; // B
            // 保持原始 alpha 值
        }
    }
}

// 调整分割掩码尺寸
function resizeSegmentation(segmentation, oldWidth, oldHeight, newWidth, newHeight) {
    const resizedSegmentation = new Uint8Array(newWidth * newHeight);
    
    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            // 计算对应的原始坐标
            const srcX = Math.floor(x * oldWidth / newWidth);
            const srcY = Math.floor(y * oldHeight / newHeight);
            
            // 获取原始掩码中的值
            const srcIndex = srcY * oldWidth + srcX;
            const value = segmentation[srcIndex];
            
            // 设置到新掩码
            const destIndex = y * newWidth + x;
            resizedSegmentation[destIndex] = value;
        }
    }
    
    return resizedSegmentation;
}

// 下载处理结果
function downloadResult() {
    const link = document.createElement('a');
    link.download = '证件照_' + new Date().getTime() + '.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
}

// 新增：初始化编辑画布
function initEditCanvas() {
    // 设置编辑画布的大小与结果画布相同
    editCanvas.width = resultCanvas.width;
    editCanvas.height = resultCanvas.height;
    
    // 设置默认编辑模式
    setEditMode('view');
}

// 新增：设置编辑模式
function setEditMode(mode) {
    currentMode = mode;
    
    // 更新按钮状态
    viewBtn.classList.remove('active');
    drawBtn.classList.remove('active');
    eraseBtn.classList.remove('active');
    
    switch(mode) {
        case 'view':
            viewBtn.classList.add('active');
            editCanvas.classList.add('d-none');
            brushControls.classList.add('d-none');
            applyEditBtn.classList.add('d-none');
            resetEditBtn.classList.add('d-none');
            editCanvas.style.cursor = 'default';
            break;
        case 'draw':
            drawBtn.classList.add('active');
            editCanvas.classList.remove('d-none');
            brushControls.classList.remove('d-none');
            applyEditBtn.classList.remove('d-none');
            resetEditBtn.classList.remove('d-none');
            editCanvas.style.cursor = 'crosshair';
            break;
        case 'erase':
            eraseBtn.classList.add('active');
            editCanvas.classList.remove('d-none');
            brushControls.classList.remove('d-none');
            applyEditBtn.classList.remove('d-none');
            resetEditBtn.classList.remove('d-none');
            editCanvas.style.cursor = 'crosshair';
            break;
    }
    
    // 清除编辑画布
    const ctx = editCanvas.getContext('2d');
    ctx.clearRect(0, 0, editCanvas.width, editCanvas.height);
}

// 新增：开始绘制
function startDrawing(e) {
    if (currentMode === 'view') return;
    
    isDrawing = true;
    
    // 获取鼠标相对于画布的位置
    const rect = editCanvas.getBoundingClientRect();
    const scaleX = editCanvas.width / rect.width;
    const scaleY = editCanvas.height / rect.height;
    
    lastX = (e.clientX - rect.left) * scaleX;
    lastY = (e.clientY - rect.top) * scaleY;
    
    // 绘制一个点
    draw(e);
}

// 新增：绘制
function draw(e) {
    if (!isDrawing || currentMode === 'view') return;
    
    // 获取鼠标相对于画布的位置
    const rect = editCanvas.getBoundingClientRect();
    const scaleX = editCanvas.width / rect.width;
    const scaleY = editCanvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const ctx = editCanvas.getContext('2d');
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    // 设置绘制样式
    if (currentMode === 'draw') {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // 绿色半透明，表示添加人像
    } else if (currentMode === 'erase') {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // 红色半透明，表示移除人像
    }
    
    // 绘制线条
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 更新上一次位置
    lastX = x;
    lastY = y;
}

// 新增：停止绘制
function stopDrawing() {
    isDrawing = false;
}

// 新增：应用编辑
function applyEdit() {
    if (!segmentationMask) return;
    
    // 获取编辑画布的像素数据
    const ctx = editCanvas.getContext('2d');
    const editData = ctx.getImageData(0, 0, editCanvas.width, editCanvas.height).data;
    
    // 更新分割掩码
    for (let i = 0; i < editData.length; i += 4) {
        const pixelIndex = i / 4;
        
        // 检查像素是否被绘制（绿色表示添加人像，红色表示移除人像）
        if (editData[i + 3] > 0) { // 如果有不透明度
            if (editData[i] < editData[i + 1]) { // 绿色分量大于红色分量，表示添加人像
                segmentationMask[pixelIndex] = 1;
            } else if (editData[i] > editData[i + 1]) { // 红色分量大于绿色分量，表示移除人像
                segmentationMask[pixelIndex] = 0;
            }
        }
    }
    
    // 重新应用掩码到图像
    const resultCtx = resultCanvas.getContext('2d');
    const imageData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    
    // 首先填充背景色
    resultCtx.fillStyle = selectedColor;
    resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
    
    // 然后绘制原始图像
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = resultCanvas.width;
    tempCanvas.height = resultCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0, resultCanvas.width, resultCanvas.height);
    const originalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // 应用掩码
    applyMaskToImage(originalImageData, segmentationMask, selectedColor);
    
    // 更新结果画布
    resultCtx.putImageData(originalImageData, 0, 0);
    
    // 清除编辑画布
    ctx.clearRect(0, 0, editCanvas.width, editCanvas.height);
}

// 新增：重置编辑
function resetEdit() {
    if (!originalSegmentationMask) return;
    
    // 恢复原始分割掩码
    segmentationMask = new Uint8Array(originalSegmentationMask);
    
    // 重新应用掩码到图像
    const resultCtx = resultCanvas.getContext('2d');
    
    // 首先填充背景色
    resultCtx.fillStyle = selectedColor;
    resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
    
    // 然后绘制原始图像
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = resultCanvas.width;
    tempCanvas.height = resultCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0, resultCanvas.width, resultCanvas.height);
    const originalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // 应用掩码
    applyMaskToImage(originalImageData, segmentationMask, selectedColor);
    
    // 更新结果画布
    resultCtx.putImageData(originalImageData, 0, 0);
    
    // 清除编辑画布
    const editCtx = editCanvas.getContext('2d');
    editCtx.clearRect(0, 0, editCanvas.width, editCanvas.height);
}

// 新增：显示掩码预览（用于调试）
function showMaskPreview() {
    if (!segmentationMask) return;
    
    const width = resultCanvas.width;
    const height = resultCanvas.height;
    
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    
    const maskImageData = maskCtx.createImageData(width, height);
    const maskData = maskImageData.data;
    
    for (let i = 0; i < segmentationMask.length; i++) {
        const value = segmentationMask[i] ? 255 : 0;
        const index = i * 4;
        maskData[index] = value;     // R
        maskData[index + 1] = value; // G
        maskData[index + 2] = value; // B
        maskData[index + 3] = 255;   // Alpha
    }
    
    maskCtx.putImageData(maskImageData, 0, 0);
    
    // 显示掩码预览（可以添加到页面上的某个元素）
    // 例如：document.body.appendChild(maskCanvas);
    
    // 或者可以将其作为新窗口打开
    const dataURL = maskCanvas.toDataURL();
    const win = window.open();
    win.document.write(`<img src="${dataURL}" alt="Mask Preview">`);
}

// 新增：优化抠图效果
function enhanceSegmentation() {
    if (!segmentationMask) return;
    
    const width = resultCanvas.width;
    const height = resultCanvas.height;
    
    // 创建新的掩码数组
    const enhancedMask = new Uint8Array(segmentationMask);
    
    // 简单的形态学操作：腐蚀然后膨胀（开运算）
    // 这可以去除小的噪点
    
    // 腐蚀操作
    const eroded = new Uint8Array(width * height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            // 3x3 核心检查
            let allForeground = true;
            for (let dy = -1; dy <= 1 && allForeground; dy++) {
                for (let dx = -1; dx <= 1 && allForeground; dx++) {
                    const neighborIdx = (y + dy) * width + (x + dx);
                    if (!segmentationMask[neighborIdx]) {
                        allForeground = false;
                    }
                }
            }
            eroded[idx] = allForeground ? 1 : 0;
        }
    }
    
    // 膨胀操作
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            // 3x3 核心检查
            let anyForeground = false;
            for (let dy = -1; dy <= 1 && !anyForeground; dy++) {
                for (let dx = -1; dx <= 1 && !anyForeground; dx++) {
                    const neighborIdx = (y + dy) * width + (x + dx);
                    if (eroded[neighborIdx]) {
                        anyForeground = true;
                    }
                }
            }
            enhancedMask[idx] = anyForeground ? 1 : 0;
        }
    }
    
    // 更新分割掩码
    segmentationMask = enhancedMask;
    
    // 重新应用掩码
    applyEdit();
}

// 新增：自动检测并修复头发和细节
function autoEnhanceDetails() {
    if (!segmentationMask || !originalImage) return;
    
    const width = resultCanvas.width;
    const height = resultCanvas.height;
    
    // 创建临时画布获取图像数据
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height).data;
    
    // 创建增强的掩码
    const enhancedMask = new Uint8Array(segmentationMask);
    
    // 遍历图像边缘区域
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            
            // 检查是否是边缘像素（人像和背景的交界处）
            let isBoundary = false;
            for (let dy = -1; dy <= 1 && !isBoundary; dy++) {
                for (let dx = -1; dx <= 1 && !isBoundary; dx++) {
                    const neighborIdx = (y + dy) * width + (x + dx);
                    if (segmentationMask[idx] !== segmentationMask[neighborIdx]) {
                        isBoundary = true;
                    }
                }
            }
            
            // 如果是边缘像素，检查颜色特征
            if (isBoundary) {
                const i = idx * 4;
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                
                // 检测可能是头发或细节的像素（例如，暗色调）
                const brightness = (r + g + b) / 3;
                const isDark = brightness < 100; // 调整此阈值以适应不同的图像
                
                // 如果是暗色调，可能是头发，将其包含在人像中
                if (isDark) {
                    enhancedMask[idx] = 1;
                }
            }
        }
    }
    
    // 更新分割掩码
    segmentationMask = enhancedMask;
    
    // 重新应用掩码
    applyEdit();
}

// 新增：边缘平滑处理
function smoothEdges() {
    if (!segmentationMask) return;
    
    const width = resultCanvas.width;
    const height = resultCanvas.height;
    
    // 获取当前结果画布的图像数据
    const resultCtx = resultCanvas.getContext('2d');
    const resultData = resultCtx.getImageData(0, 0, width, height);
    
    // 创建临时画布获取原始图像数据
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(originalImage, 0, 0, width, height);
    const originalData = tempCtx.getImageData(0, 0, width, height).data;
    
    // 转换背景色为RGB
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };
    
    const [bgR, bgG, bgB] = hexToRgb(selectedColor);
    
    // 边缘平滑处理
    const blendRadius = 2; // 混合半径
    
    for (let y = blendRadius; y < height - blendRadius; y++) {
        for (let x = blendRadius; x < width - blendRadius; x++) {
            const idx = y * width + x;
            
            // 检查是否是边缘像素
            let isBoundary = false;
            for (let dy = -1; dy <= 1 && !isBoundary; dy++) {
                for (let dx = -1; dx <= 1 && !isBoundary; dx++) {
                    const neighborIdx = (y + dy) * width + (x + dx);
                    if (segmentationMask[idx] !== segmentationMask[neighborIdx]) {
                        isBoundary = true;
                    }
                }
            }
            
            // 如果是边缘像素，进行颜色混合
            if (isBoundary) {
                const i = idx * 4;
                
                // 计算周围像素的平均颜色
                let sumR = 0, sumG = 0, sumB = 0, count = 0;
                
                for (let dy = -blendRadius; dy <= blendRadius; dy++) {
                    for (let dx = -blendRadius; dx <= blendRadius; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const neighborIdx = ny * width + nx;
                            const ni = neighborIdx * 4;
                            
                            if (segmentationMask[neighborIdx]) {
                                // 人像像素
                                sumR += originalData[ni];
                                sumG += originalData[ni + 1];
                                sumB += originalData[ni + 2];
                            } else {
                                // 背景像素
                                sumR += bgR;
                                sumG += bgG;
                                sumB += bgB;
                            }
                            count++;
                        }
                    }
                }
                
                // 计算平均颜色
                const avgR = Math.round(sumR / count);
                const avgG = Math.round(sumG / count);
                const avgB = Math.round(sumB / count);
                
                // 应用混合颜色
                resultData.data[i] = avgR;
                resultData.data[i + 1] = avgG;
                resultData.data[i + 2] = avgB;
            }
        }
    }
    
    // 更新结果画布
    resultCtx.putImageData(resultData, 0, 0);
}