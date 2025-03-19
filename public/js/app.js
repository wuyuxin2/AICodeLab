// 证件照背景色替换工具主要脚本

// 全局变量
let originalImage = null;
let bodypixModel = null;
let selectedColor = '#FFFFFF';
let isProcessing = false;
let webGLSupported = false;

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

// 处理图像 - 更换背景色
async function processImage() {
    if (!originalImage || isProcessing) return;
    
    isProcessing = true;
    processBtn.disabled = true;
    uploadArea.classList.add('loading');
    
    try {
        // 设置画布尺寸
        let width = originalImage.width;
        let height = originalImage.height;
        
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
        
        // 设置画布尺寸
        resultCanvas.width = width;
        resultCanvas.height = height;
        
        const ctx = resultCanvas.getContext('2d');
        
        if (webGLSupported && bodypixModel) {
            // WebGL模式：使用BodyPix进行人像分割
            
            // 绘制背景色
            ctx.fillStyle = selectedColor;
            ctx.fillRect(0, 0, width, height);
            
            // 使用 BodyPix 进行人像分割
            const segmentation = await bodypixModel.segmentPerson(originalImage, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7
            });
            
            // 创建临时画布用于调整原图尺寸
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // 在临时画布上绘制调整大小后的原图
            tempCtx.drawImage(originalImage, 0, 0, width, height);
            
            // 获取图像数据
            const imageData = tempCtx.getImageData(0, 0, width, height);
            
            // 调整分割掩码以匹配调整后的尺寸
            const resizedMask = resizeSegmentation(segmentation.data, segmentation.width, segmentation.height, width, height);
            
            // 应用掩码：保留人像，替换背景
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const pixelIndex = i / 4;
                if (!resizedMask[pixelIndex]) {
                    // 背景像素 - 设置为选定的颜色
                    const hexToRgb = (hex) => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        return [r, g, b];
                    };
                    
                    const [r, g, b] = hexToRgb(selectedColor);
                    data[i] = r;     // R
                    data[i + 1] = g; // G
                    data[i + 2] = b; // B
                    // 保持原始 alpha 值
                }
            }
            
            // 将处理后的图像数据绘制到结果画布上
            ctx.putImageData(imageData, 0, 0);
        } else {
            // 基本模式：使用简单的颜色检测和替换
            // 这种方法不如AI分割准确，但不需要WebGL支持
            
            // 绘制背景色
            ctx.fillStyle = selectedColor;
            ctx.fillRect(0, 0, width, height);
            
            // 绘制原始图像
            ctx.drawImage(originalImage, 0, 0, width, height);
            
            // 获取图像数据
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // 转换选定的背景色为RGB
            const hexToRgb = (hex) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return [r, g, b];
            };
            
            const [bgR, bgG, bgB] = hexToRgb(selectedColor);
            
            // 提示用户正在使用基本模式
            alert('由于您的设备不支持WebGL，将使用基本模式处理图像。请在处理后手动调整不满意的区域。');
            
            // 简单地将图像绘制在背景色上
            ctx.drawImage(originalImage, 0, 0, width, height);
        }
        
        // 显示结果
        resultContainer.classList.remove('d-none');
        
    } catch (error) {
        console.error('处理图像时出错:', error);
        alert('处理图像时出错，请重试。');
    } finally {
        isProcessing = false;
        processBtn.disabled = false;
        uploadArea.classList.remove('loading');
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