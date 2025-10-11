// 重构后的Chrome扩展内容脚本 - 主入口
// 整合了相册URL获取器和演员信息提取器功能

// 全局消息处理器实例
let messageHandler = null;

// 清除旧数据 - 只清除特定键，避免影响其他扩展
async function clearOldData() {
  try {
    console.log('🧹 清除旧版本数据...');
    // 只清除特定键，而不是全部清除
    await chrome.storage.local.remove([
      'albumUrls', 
      'lastExtraction', 
      'isExtracting', 
      'extractionStartTime',
      'extractionProgress',
      'lastProgressUpdate',
      'extractionComplete',
      'site'
    ]);
    console.log('✅ 旧数据清除完成');
  } catch (error) {
    console.error('❌ 清除旧数据失败:', error);
  }
}

// 初始化扩展
async function initializeExtension() {
  try {
    // 清除旧数据
    await clearOldData();
    
    // 等待所有模块加载完成
    if (typeof MessageHandler === 'undefined') {
      console.error('❌ MessageHandler未定义，模块加载失败');
      return;
    }
    
    // 初始化消息处理器
    messageHandler = new MessageHandler();
    console.log('✅ 美女相册信息提取器初始化完成');
    
  } catch (error) {
    console.error('❌ 扩展初始化失败:', error);
  }
}

// 页面卸载时清理资源
function cleanup() {
  if (messageHandler) {
    messageHandler.cleanup();
    messageHandler = null;
  }
}

// 监听页面卸载事件
window.addEventListener('beforeunload', cleanup);

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}