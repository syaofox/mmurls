// 图片转换工具 - 统一的图片转base64处理
async function convertImageToBase64(img) {
  try {
    // 使用重构后的ImageProcessor（包含两种成功的方法）
    if (window.imageProcessor) {
      const result = await window.imageProcessor.convertToBase64(img);
      if (result) {
        console.log('✅ ImageProcessor转换成功');
        return result;
      }
    }
    
    // 如果ImageProcessor不可用，直接返回图片URL
    console.warn('⚠️ ImageProcessor不可用，返回原始URL');
    return img.src;
    
  } catch (error) {
    console.error('❌ 图片转换失败:', error);
    return img.src; // 失败后返回原始URL
  }
}
