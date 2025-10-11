// 合并的Chrome插件 - 后台脚本
// 整合了相册URL获取器和演员信息提取器的后台功能

// 插件安装监听器
chrome.runtime.onInstalled.addListener(() => {
  console.log('美女相册信息提取器已安装');
});

// 监听来自content script和popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 相册URL获取器消息处理
  if (request.type === 'ALBUM_URLS_EXTRACTED') {
    // 将消息转发给popup
    chrome.runtime.sendMessage(request).catch(() => {
      // popup可能未打开，忽略错误
    });
  } else if (request.type === 'OPEN_POPUP') {
    // 打开popup界面
    chrome.action.openPopup().catch(() => {
      // 如果无法打开popup，尝试通过action点击
      console.log('无法直接打开popup，请手动点击工具栏图标');
    });
  }
  
  // 演员信息提取器消息处理 - 图片转换功能
  if (request.action === 'convertImageToBase64') {
    convertImageToBase64(request.imageUrl)
      .then(base64 => {
        sendResponse({ success: true, data: base64 });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }
});

// 处理插件图标点击
chrome.action.onClicked.addListener((tab) => {
  // 这个事件通常不会触发，因为我们设置了popup
  console.log('插件图标被点击');
});

// ==================== 图片转换功能 ====================
// 使用Chrome扩展权限转换图片
async function convertImageToBase64(imageUrl) {
  try {
    console.log('🖼️ Background: 开始转换图片:', imageUrl);
    
    // 使用fetch获取图片数据
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('✅ Background: 图片blob获取成功');
    
    // 转换为base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log('✅ Background: Base64转换成功');
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(new Error('FileReader转换失败'));
      };
      reader.readAsDataURL(blob);
    });
    
  } catch (error) {
    console.error('❌ Background: 图片转换失败:', error);
    throw error;
  }
}
