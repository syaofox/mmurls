// 相册URL提取器 - 重构后的核心提取逻辑
class AlbumURLExtractor {
  constructor() {
    this.parsers = {
      'v2ph.com': new V2PHParser(),
      'junmeitu.com': new JunMeituParser()
    };
    this.currentParser = null;
    this.extractedURLs = new Set();
    this.isExtracting = false;
    this.extractionProgress = {
      currentPage: 0,
      totalPages: 0,
      urlsFound: 0
    };
    this.buttonManager = new ButtonManager();
    this.init();
  }

  init() {
    // 检测当前网站并设置对应的解析器
    this.detectSite();
    
    // 创建UI按钮
    this.createUI();
    
    // 监听消息
    this.setupMessageListener();
  }

  detectSite() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('v2ph.com')) {
      this.currentParser = this.parsers['v2ph.com'];
      console.log('检测到V2PH网站，使用V2PH解析器');
    } else if (hostname.includes('junmeitu.com')) {
      this.currentParser = this.parsers['junmeitu.com'];
      console.log('检测到俊美图网站，使用俊美图解析器');
    } else {
      console.log('未支持的网站:', hostname);
    }
  }

  createUI() {
    if (!this.currentParser) return;

    // 创建状态显示按钮
    const button = this.buttonManager.createButton('album-extractor-btn', '相册URL获取器');
    
    // 添加点击事件 - 直接开始提取
    this.buttonManager.addClickListener('album-extractor-btn', () => {
      this.extractAlbumURLs();
    });
    
    // 更新按钮状态
    this.updateButtonStatus();
  }

  async extractAlbumURLs() {
    if (!this.currentParser) {
      Toast.error('当前网站暂不支持');
      return;
    }

    if (this.isExtracting) {
      this.showStatusMessage();
      return;
    }

    this.isExtracting = true;
    this.extractionProgress = {
      currentPage: 0,
      totalPages: 0,
      urlsFound: 0
    };

    this.updateButtonStatus();

    try {
      // 发送开始提取消息
      chrome.runtime.sendMessage({
        type: 'EXTRACTION_STARTED',
        site: window.location.hostname
      });

      const urls = await this.currentParser.extractAllPages(this);
      
      // 保存结果到本地存储
      await chrome.storage.local.set({ 
        albumUrls: Array.from(urls),
        lastExtraction: new Date().toISOString(),
        site: window.location.hostname,
        extractionComplete: true
      });

      // 发送结果到popup
      chrome.runtime.sendMessage({
        type: 'ALBUM_URLS_EXTRACTED',
        urls: Array.from(urls),
        site: window.location.hostname
      });

      // 自动复制YAML格式到剪贴板
      try {
        const yamlContent = generateYAMLFormat(Array.from(urls));
        await navigator.clipboard.writeText(yamlContent);
        console.log('YAML格式URL已复制到剪贴板');
        
        // 显示复制成功提示
        Toast.success(`已复制 ${urls.size} 个URL到剪贴板`);
      } catch (error) {
        console.error('复制到剪贴板失败:', error);
      }

    } catch (error) {
      console.error('获取相册URL失败:', error);
      Toast.error('获取失败: ' + error.message);
      
      // 发送错误消息
      chrome.runtime.sendMessage({
        type: 'EXTRACTION_ERROR',
        error: error.message,
        site: window.location.hostname
      });
    } finally {
      this.isExtracting = false;
      this.updateButtonStatus();
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'GET_CURRENT_URLS') {
        sendResponse({
          urls: Array.from(this.extractedURLs),
          site: window.location.hostname
        });
      } else if (request.type === 'START_EXTRACTION') {
        // 处理来自popup的提取请求
        this.extractAlbumURLs();
        sendResponse({ success: true });
      } else if (request.type === 'GET_EXTRACTION_STATUS') {
        sendResponse({
          isExtracting: this.isExtracting,
          progress: this.extractionProgress,
          urls: Array.from(this.extractedURLs)
        });
      }
    });
  }

  updateButtonStatus() {
    const button = this.buttonManager.getButton('album-extractor-btn');
    if (!button) return;

    if (this.isExtracting) {
      this.buttonManager.updateButton('album-extractor-btn', {
        text: `正在获取... (第${this.extractionProgress.currentPage}页)`,
        extracting: true,
        disabled: true
      });
    } else {
      this.buttonManager.updateButton('album-extractor-btn', {
        text: '相册URL获取器',
        extracting: false,
        disabled: false
      });
    }
  }

  updateProgress(currentPage, urlsFound) {
    this.extractionProgress.currentPage = currentPage;
    this.extractionProgress.urlsFound = urlsFound;
    this.updateButtonStatus();

    // 发送进度更新消息
    chrome.runtime.sendMessage({
      type: 'EXTRACTION_PROGRESS',
      progress: this.extractionProgress,
      site: window.location.hostname
    });

    // 同时更新存储，确保popup能获取到最新状态
    chrome.storage.local.set({
      extractionProgress: this.extractionProgress,
      lastProgressUpdate: new Date().toISOString()
    });
  }

  showStatusMessage() {
    if (this.isExtracting) {
      Toast.info(`正在获取第${this.extractionProgress.currentPage}页，已找到${this.extractionProgress.urlsFound}个URL`);
    } else {
      Toast.info('请使用插件弹窗开始获取URL');
    }
  }

  // 清理资源
  cleanup() {
    this.buttonManager.cleanup();
  }
}
