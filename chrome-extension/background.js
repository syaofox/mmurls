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
  
  // YAML文件下载处理
  if (request.action === 'downloadYAML') {
    console.log('📥 Background: 收到下载YAML请求:', request.filename);
    downloadYAMLFile(request.filename, request.content)
      .then(() => {
        console.log('✅ Background: YAML下载成功');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Background: YAML下载失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }
  
  // Markdown文件下载处理
  if (request.action === 'downloadMarkdown') {
    console.log('📥 Background: 收到下载Markdown请求:', request.filename);
    downloadMarkdownFile(request.filename, request.content)
      .then(() => {
        console.log('✅ Background: Markdown下载成功');
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('❌ Background: Markdown下载失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 保持消息通道开放
  }

  // 发送到下载服务器
  if (request.action === 'sendToDownloadServer') {
    handleSendToDownloadServer(request)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 处理插件图标点击
chrome.action.onClicked.addListener((tab) => {
  // 这个事件通常不会触发，因为我们设置了popup
  console.log('插件图标被点击');
});

// ==================== 发送到下载服务器 ====================
const STORAGE_KEY_SERVER_URL = 'downloadServerUrl';
const DEFAULT_SERVER_URL = 'http://10.10.10.2:9102';

async function handleSendToDownloadServer(request) {
  const { type, url, urls } = request;
  const result = await chrome.storage.local.get([STORAGE_KEY_SERVER_URL]);
  const serverUrl = (result[STORAGE_KEY_SERVER_URL] || DEFAULT_SERVER_URL).trim();

  if (type === 'currentPage' && url) {
    const endpoint = `${serverUrl}/albums/add`;
    const body = `url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { success: true };
  }

  if (type === 'albumUrls' && Array.isArray(urls) && urls.length > 0) {
    const endpoint = `${serverUrl}/albums/add-batch`;
    const body = `urls=${encodeURIComponent(urls.join('\n'))}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { success: true };
  }

  throw new Error('无效的请求参数');
}

// ==================== 图片转换功能 ====================
// 使用Chrome扩展权限转换图片
async function convertImageToBase64(imageUrl) {
  try {
    console.log('🖼️ Background: 开始转换图片:', imageUrl);
    
    const headers = { 'Accept': 'image/*' };
    if (imageUrl.includes('meitulu.me')) {
      headers['Referer'] = 'https://meitulu.me/';
    }
    
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers
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

// ==================== YAML文件下载功能 ====================
// 在background script中处理文件下载
async function downloadYAMLFile(filename, content) {
  try {
    console.log('📁 Background: 开始下载YAML文件:', filename);
    
    // 在Service Worker中，我们需要使用data URL而不是Blob URL
    const dataUrl = `data:text/yaml;charset=utf-8,${encodeURIComponent(content)}`;
    
    // 使用Chrome Downloads API下载文件
    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });
    
    console.log('✅ Background: YAML文件下载成功:', filename);
    
  } catch (error) {
    console.error('❌ Background: YAML文件下载失败:', error);
    throw error;
  }
}

// ==================== Markdown文件下载功能 ====================
// 在background script中处理Markdown文件下载
async function downloadMarkdownFile(filename, content) {
  try {
    console.log('📁 Background: 开始下载Markdown文件:', filename);
    
    // 在Service Worker中，我们需要使用data URL而不是Blob URL
    const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(content)}`;
    
    // 使用Chrome Downloads API下载文件
    await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });
    
    console.log('✅ Background: Markdown文件下载成功:', filename);
    
  } catch (error) {
    console.error('❌ Background: Markdown文件下载失败:', error);
    throw error;
  }
}
