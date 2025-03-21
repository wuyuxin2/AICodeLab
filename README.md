# 证件照背景色替换工具

一个简单易用的在线工具，可以快速替换证件照的背景颜色，无需专业的图像编辑技能。

![证件照背景色替换工具](/mainpage.png)

## 功能特点

- **一键替换背景色**：自动识别人像，替换背景为任意颜色
- **AI人像分割**：使用TensorFlow.js和BodyPix模型进行智能人像分割
- **手动调整功能**：提供绘制和擦除工具，精确调整分割效果
- **多种证件照规格**：支持1寸、2寸等标准证件照尺寸
- **自定义背景颜色**：内置多种常用背景色，也支持自定义颜色选择
- **无需上传服务器**：所有处理在浏览器本地完成，保护隐私安全
- **兼容多种设备**：支持PC和移动设备，自动适应不同屏幕尺寸
- **降级处理**：对不支持WebGL的设备提供基本模式支持

## 使用方法

1. **上传照片**：点击上传区域或拖拽照片到指定区域
2. **选择背景色**：从预设颜色中选择或使用颜色选择器自定义背景色
3. **选择照片尺寸**：选择需要的证件照规格（1寸、2寸或自定义）
4. **处理照片**：点击"处理照片"按钮，等待AI处理完成
5. **微调结果（可选）**：
   - 点击"绘制人像"按钮，在需要保留的区域上绘制
   - 点击"擦除人像"按钮，在需要移除的区域上绘制
   - 调整笔刷大小以获得更精确的效果
   - 点击"应用编辑"保存调整结果
6. **下载照片**：点击"下载照片"按钮保存处理后的图片

## 技术要求

- **支持WebGL的浏览器**：Chrome、Firefox、Edge等现代浏览器
- **设备要求**：对于AI人像分割模式，建议使用性能较好的设备
- **网络要求**：首次使用需下载AI模型（约10MB），建议在WiFi环境下使用

## 常见问题

### 为什么提示"使用基本模式"？
您的设备或浏览器可能不支持WebGL，无法运行AI人像分割模型。此时工具会自动切换到基本模式，您可以使用手动绘制和擦除工具来调整分割效果。

### 为什么人像边缘不够精确？
AI模型可能无法完美处理所有图像，特别是对于复杂背景或头发细节。您可以使用绘制和擦除工具手动调整边缘区域。

### 如何获得最佳效果？
- 使用正面免冠照片，背景尽量简单
- 确保光线充足，避免过暗或过曝
- 上传较高分辨率的原始照片
- 使用手动编辑工具精细调整边缘区域

### 照片会上传到服务器吗？
不会。所有处理都在您的浏览器本地完成，照片不会上传到任何服务器，保证您的隐私安全。

## 浏览器兼容性

- Chrome 80+
- Firefox 76+
- Edge 80+
- Safari 14+
- iOS Safari 14+
- Android Chrome 80+

## 本地部署

如果您想在本地或自己的服务器上部署此工具：

1. 克隆或下载本仓库
2. 确保所有文件在同一目录结构下
3. 使用任何HTTP服务器提供这些文件
   - 例如：`python -m http.server 8000`
4. 在浏览器中访问对应地址（如 http://localhost:8000）

## 开源协议

本项目基于MIT协议开源，欢迎使用和贡献代码。

## 致谢

- [TensorFlow.js](https://www.tensorflow.org/js) - 用于在浏览器中运行机器学习模型
- [BodyPix](https://github.com/tensorflow/tfjs-models/tree/master/body-pix) - 用于人像分割的预训练模型
- [Bootstrap](https://getbootstrap.com/) - 用于UI界面设计