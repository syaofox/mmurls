// 统一消息处理器 - 处理所有消息通信
class MessageHandler {
  constructor() {
    this.albumExtractor = null;
    this.actorExtractor = new ActorInfoExtractor();
    this.init();
  }

  init() {
    // 只在支持的网站初始化相册URL提取器
    if (window.location.hostname.includes('v2ph.com') || window.location.hostname.includes('junmeitu.com')) {
      this.albumExtractor = new AlbumURLExtractor();
    }

    // 设置统一的消息监听器
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        // 相册URL获取器消息
        if (this.handleAlbumURLMessages(request, sendResponse)) {
          return;
        }
        
        // 演员信息提取器消息
        if (this.handleActorInfoMessages(request, sendResponse)) {
          return true; // 保持消息通道开放以支持异步响应
        }
        
        console.warn('⚠️ 未处理的消息类型:', request);
      } catch (error) {
        console.error('❌ 消息处理出错:', error);
        sendResponse({ error: error.message });
      }
    });
  }

  // 处理相册URL相关消息
  handleAlbumURLMessages(request, sendResponse) {
    const { type } = request;

    switch (type) {
      case 'GET_CURRENT_URLS':
        if (this.albumExtractor) {
          sendResponse({
            urls: Array.from(this.albumExtractor.extractedURLs || []),
            site: window.location.hostname
          });
        } else {
          sendResponse({
            urls: [],
            site: window.location.hostname
          });
        }
        return true;

      case 'START_EXTRACTION':
        if (this.albumExtractor) {
          this.albumExtractor.extractAlbumURLs();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: '相册提取器未初始化' });
        }
        return true;

      case 'GET_EXTRACTION_STATUS':
        if (this.albumExtractor) {
          sendResponse({
            isExtracting: this.albumExtractor.isExtracting || false,
            progress: this.albumExtractor.extractionProgress || {},
            urls: Array.from(this.albumExtractor.extractedURLs || [])
          });
        } else {
          sendResponse({
            isExtracting: false,
            progress: {},
            urls: []
          });
        }
        return true;

      default:
        return false;
    }
  }

  // 处理演员信息相关消息
  async handleActorInfoMessages(request, sendResponse) {
    const { action } = request;

    if (action === 'extractActorInfo') {
      try {
        const result = await this.actorExtractor.extractActorInfo();
        sendResponse(result);
        return true;
      } catch (error) {
        console.error('❌ 演员信息提取失败:', error);
        sendResponse(null);
        return true;
      }
    }

    return false;
  }

  // 清理资源
  cleanup() {
    if (this.albumExtractor) {
      this.albumExtractor.cleanup();
    }
  }
}
