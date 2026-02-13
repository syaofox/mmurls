// 合并的Chrome插件 - 弹窗脚本
// 整合了相册URL获取器和演员信息提取器功能

// 支持的相册 URL 提取站点（与 manifest content_scripts.matches 保持一致）
function isAlbumExtractSupported(url) {
  return url?.includes('v2ph.com') || url?.includes('junmeitu.com') || url?.includes('meitulu.me');
}

function getSiteDisplayName(site) {
  if (!site) return 'V2PH.com';
  if (site.includes('junmeitu.com')) return '俊美图.com';
  if (site.includes('meitulu.me')) return '美图录.me';
  return 'V2PH.com';
}

class PopupController {
  constructor() {
    this.currentTab = 'urls';
    this.urlManager = new URLManager();
    this.actorManager = new ActorManager();
    this.init();
  }

  init() {
    this.setupTabNavigation();
    this.urlManager.init();
    this.actorManager.init();
    this.checkCurrentPage();
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabName) {
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 更新面板显示
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    this.currentTab = tabName;
  }

  async checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 根据当前页面类型自动切换到对应标签页
      if (tab.url.includes('/actor/') || tab.url.includes('/model/')) {
        this.switchTab('info');
      } else if (isAlbumExtractSupported(tab.url)) {
        this.switchTab('urls');
      }
    } catch (error) {
      console.error('检查当前页面失败:', error);
    }
  }
}

// ==================== URL管理器 ====================
const DEFAULT_SERVER_URL = 'http://10.10.10.2:9102';
const STORAGE_KEY_SERVER_URL = 'downloadServerUrl';

class URLManager {
  constructor() {
    this.urls = [];
    this.isExtracting = false;
    this.serverUrl = DEFAULT_SERVER_URL;
    this.extractionProgress = {
      currentPage: 0,
      totalPages: 0,
      urlsFound: 0
    };
  }

  init() {
    this.setupEventListeners();
    this.loadStoredData();
    this.loadServerUrlSettings();
    this.checkCurrentStatus();
    this.updateUI();
    this.startDataCheckInterval();
  }

  setupEventListeners() {
    // 开始获取按钮
    document.getElementById('extractBtn').addEventListener('click', () => {
      this.startExtraction();
    });

    // 清空结果按钮
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearResults();
    });

    // 复制全部按钮
    document.getElementById('copyAllBtn').addEventListener('click', () => {
      this.copyAllURLs();
    });

    // 复制YAML按钮
    document.getElementById('copyYamlBtn').addEventListener('click', () => {
      this.copyYAMLFormat();
    });

    // 下载YAML按钮
    document.getElementById('downloadYamlBtn').addEventListener('click', () => {
      this.downloadYAML();
    });

    // 下载列表按钮
    document.getElementById('downloadBtn').addEventListener('click', () => {
      this.downloadURLs();
    });

    // 发送到服务器按钮
    document.getElementById('sendToServerBtn').addEventListener('click', () => {
      this.sendToServer();
    });

    // 发送当前页面按钮
    document.getElementById('sendCurrentPageBtn').addEventListener('click', () => {
      this.sendCurrentPageToServer();
    });

    // 服务器设置
    document.getElementById('saveServerUrlBtn').addEventListener('click', () => {
      this.saveServerUrlSettings();
    });
    document.getElementById('resetServerUrlBtn').addEventListener('click', () => {
      this.resetServerUrlSettings();
    });

    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'ALBUM_URLS_EXTRACTED') {
        this.handleExtractionComplete(request.urls, request.site);
      } else if (request.type === 'EXTRACTION_STARTED') {
        this.handleExtractionStarted();
      } else if (request.type === 'EXTRACTION_PROGRESS') {
        this.handleExtractionProgress(request.progress);
      } else if (request.type === 'EXTRACTION_ERROR') {
        this.handleExtractionError(request.error);
      }
    });
  }

  async startExtraction() {
    if (this.isExtracting) {
      this.showToast('正在获取中，请稍候...', 'info');
      return;
    }

    // 先检查当前状态
    await this.checkCurrentStatus();
    
    if (this.isExtracting) {
      this.showToast('检测到正在进行的提取任务', 'info');
      return;
    }

    const extractBtn = document.getElementById('extractBtn');
    const status = document.getElementById('status');
    
    this.isExtracting = true;
    extractBtn.disabled = true;
    extractBtn.textContent = '正在获取...';
    status.textContent = '正在获取相册URL...';
    status.className = 'status processing';

    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 检查是否在支持的网站上
      if (!isAlbumExtractSupported(tab.url)) {
        this.handleError('请在支持的网站上使用此功能（V2PH.com、俊美图.com 或 美图录.me）');
        return;
      }
      
      // 向content script发送消息开始提取
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'START_EXTRACTION' });
        console.log('Content script响应:', response);
      } catch (error) {
        console.error('❌ 无法连接到content script:', error.message);
        this.handleError('无法连接到页面脚本，请刷新页面后重试');
        return;
      }
      
      // 保存提取状态到存储，支持后台工作
      await chrome.storage.local.set({ 
        isExtracting: true,
        extractionStartTime: new Date().toISOString()
      });
      
      // 设置超时检测
      setTimeout(() => {
        if (this.isExtracting) {
          this.handleError('获取超时，请检查网络连接');
        }
      }, 300000); // 5分钟超时
      
    } catch (error) {
      console.error('启动提取失败:', error);
      this.handleError('启动提取失败: ' + error.message);
    }
  }

  handleExtractionStarted() {
    console.log('提取已开始');
  }

  handleExtractionProgress(progress) {
    this.extractionProgress = progress;
    this.updateProgressDisplay();
    this.updateExtractButton();
  }

  handleExtractionComplete(urls, site) {
    this.urls = urls;
    this.isExtracting = false;
    this.saveData();
    this.updateUI();
    
    const extractBtn = document.getElementById('extractBtn');
    const status = document.getElementById('status');
    
    extractBtn.disabled = false;
    extractBtn.textContent = '开始获取';
    status.textContent = `获取完成 - ${site}`;
    status.className = 'status success';
    
    // 清除提取状态
    chrome.storage.local.remove(['isExtracting', 'extractionStartTime']);
  }

  handleExtractionError(error) {
    this.isExtracting = false;
    this.handleError(error);
    
    // 清除提取状态
    chrome.storage.local.remove(['isExtracting', 'extractionStartTime']);
  }

  handleError(message) {
    this.isExtracting = false;
    const extractBtn = document.getElementById('extractBtn');
    const status = document.getElementById('status');
    
    extractBtn.disabled = false;
    extractBtn.textContent = '开始获取';
    status.textContent = message;
    status.className = 'status error';
    
    // 清除提取状态
    chrome.storage.local.remove(['isExtracting', 'extractionStartTime']);
  }

  clearResults() {
    this.urls = [];
    this.saveData();
    this.updateUI();
    
    const status = document.getElementById('status');
    status.textContent = '已清空结果';
    status.className = 'status';
  }

  updateUI() {
    this.updateURLList();
    this.updateCount();
    this.updateButtons();
    this.updateProgressDisplay();
    this.updateExtractButton();
  }

  updateExtractButton() {
    const extractBtn = document.getElementById('extractBtn');
    const status = document.getElementById('status');
    
    if (this.isExtracting) {
      extractBtn.disabled = true;
      extractBtn.textContent = '正在获取...';
      status.textContent = '正在获取相册URL...';
      status.className = 'status processing';
    } else {
      extractBtn.disabled = false;
      extractBtn.textContent = '开始获取';
      if (this.urls.length > 0) {
        status.textContent = `已获取 ${this.urls.length} 个URL`;
        status.className = 'status success';
      } else {
        status.textContent = '就绪';
        status.className = 'status';
      }
    }
  }

  updateProgressDisplay() {
    const status = document.getElementById('status');
    if (this.isExtracting && this.extractionProgress.currentPage > 0) {
      status.textContent = `正在获取第${this.extractionProgress.currentPage}页，已找到${this.extractionProgress.urlsFound}个URL`;
      status.className = 'status processing';
    } else if (this.isExtracting) {
      status.textContent = '正在获取相册URL...';
      status.className = 'status processing';
    }
  }

  updateURLList() {
    const urlList = document.getElementById('urlList');
    
    if (this.urls.length === 0) {
      urlList.innerHTML = '<div class="empty-state">暂无结果</div>';
      return;
    }

    urlList.innerHTML = '';
    this.urls.forEach((url, index) => {
      const urlItem = document.createElement('div');
      urlItem.className = 'url-item';
      
      urlItem.innerHTML = `
        <div class="url-info">
          <span class="url-index">${index + 1}</span>
          <span class="url-text" title="${url}">${this.truncateURL(url)}</span>
        </div>
        <div class="url-actions">
          <button class="copy-single-btn" data-url="${url}">复制</button>
        </div>
      `;
      
      // 添加单个复制按钮事件
      const copyBtn = urlItem.querySelector('.copy-single-btn');
      copyBtn.addEventListener('click', () => {
        this.copySingleURL(url);
      });
      
      urlList.appendChild(urlItem);
    });
  }

  updateCount() {
    const urlCount = document.getElementById('urlCount');
    urlCount.textContent = `${this.urls.length} 个URL`;
  }

  updateButtons() {
    const copyAllBtn = document.getElementById('copyAllBtn');
    const copyYamlBtn = document.getElementById('copyYamlBtn');
    const downloadYamlBtn = document.getElementById('downloadYamlBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const sendToServerBtn = document.getElementById('sendToServerBtn');
    
    const hasUrls = this.urls.length > 0;
    copyAllBtn.disabled = !hasUrls;
    copyYamlBtn.disabled = !hasUrls;
    downloadYamlBtn.disabled = !hasUrls;
    downloadBtn.disabled = !hasUrls;
    sendToServerBtn.disabled = !hasUrls;
  }

  truncateURL(url, maxLength = 60) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  }

  async copySingleURL(url) {
    try {
      await navigator.clipboard.writeText(url);
      this.showToast('已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      this.showToast('复制失败', 'error');
    }
  }

  async copyAllURLs() {
    if (this.urls.length === 0) return;
    
    try {
      const urlText = this.urls.join('\n');
      await navigator.clipboard.writeText(urlText);
      this.showToast(`已复制 ${this.urls.length} 个URL到剪贴板`);
    } catch (error) {
      console.error('复制失败:', error);
      this.showToast('复制失败', 'error');
    }
  }

  async copyYAMLFormat() {
    if (this.urls.length === 0) return;
    
    try {
      const yamlContent = this.generateYAMLFormat();
      await navigator.clipboard.writeText(yamlContent);
      this.showToast(`已复制 ${this.urls.length} 个URL的YAML格式到剪贴板`);
    } catch (error) {
      console.error('复制YAML失败:', error);
      this.showToast('复制YAML失败', 'error');
    }
  }

  generateYAMLFormat() {
    const yamlContent = [
      'global_settings:',
      '  download_dir: \'\'',
      '  skip_existing: false',
      '  delay_min: 2.0  # 测试配置：最小延迟2秒',
      '  delay_max: 4.0  # 测试配置：最大延迟4秒',
      '',
      'albums:'
    ];

    this.urls.forEach(url => {
      yamlContent.push(`  - url: '${url}'`);
    });

    return yamlContent.join('\n');
  }

  downloadYAML() {
    if (this.urls.length === 0) return;
    
    const yamlContent = this.generateYAMLFormat();
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'albums.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    this.showToast('YAML下载完成');
  }

  downloadURLs() {
    if (this.urls.length === 0) return;
    
    const urlText = this.urls.join('\n');
    const blob = new Blob([urlText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `album_urls_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    this.showToast('下载完成');
  }

  async sendToServer() {
    if (this.urls.length === 0) return;

    const sendToServerBtn = document.getElementById('sendToServerBtn');
    const originalText = sendToServerBtn.textContent;
    sendToServerBtn.disabled = true;
    sendToServerBtn.textContent = '发送中...';

    const serverUrl = this.serverUrl || DEFAULT_SERVER_URL;
    const endpoint = `${serverUrl}/albums/add-batch`;
    const body = `urls=${encodeURIComponent(this.urls.join('\n'))}`;

    try {
      // 自定义服务器需请求权限
      const origin = `${serverUrl}/*`;
      const hasPermission = await chrome.permissions.contains({ origins: [origin] });
      if (!hasPermission) {
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) {
          throw new Error('需要授予访问该服务器的权限');
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.showToast(`已发送 ${this.urls.length} 个相册到下载服务器`);
    } catch (error) {
      console.error('发送到服务器失败:', error);
      this.showToast('发送失败: ' + error.message, 'error');
    } finally {
      sendToServerBtn.disabled = this.urls.length === 0;
      sendToServerBtn.textContent = originalText;
    }
  }

  async sendCurrentPageToServer() {
    const btn = document.getElementById('sendCurrentPageBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '发送中...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) {
        throw new Error('无法获取当前页面');
      }
      const pageUrl = tab.url;

      const serverUrl = this.serverUrl || DEFAULT_SERVER_URL;
      const endpoint = `${serverUrl}/albums/add`;
      const body = `url=${encodeURIComponent(pageUrl)}`;

      const origin = `${serverUrl}/*`;
      const hasPermission = await chrome.permissions.contains({ origins: [origin] });
      if (!hasPermission) {
        const granted = await chrome.permissions.request({ origins: [origin] });
        if (!granted) {
          throw new Error('需要授予访问该服务器的权限');
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.showToast('当前页面已发送到下载服务器');
    } catch (error) {
      console.error('发送当前页面失败:', error);
      this.showToast('发送失败: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  async saveData() {
    try {
      await chrome.storage.local.set({ albumUrls: this.urls });
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  }

  async loadServerUrlSettings() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY_SERVER_URL]);
      if (result[STORAGE_KEY_SERVER_URL]) {
        this.serverUrl = result[STORAGE_KEY_SERVER_URL].trim();
      }
      const input = document.getElementById('serverUrlInput');
      if (input) input.value = this.serverUrl;
    } catch (error) {
      console.error('加载服务器设置失败:', error);
    }
  }

  async saveServerUrlSettings() {
    const input = document.getElementById('serverUrlInput');
    const url = input?.value?.trim() || '';
    if (!url) {
      this.showToast('请输入服务器地址', 'error');
      return;
    }
    try {
      // 校验 URL 格式
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        this.showToast('请输入有效的 http 或 https 地址', 'error');
        return;
      }
      const serverUrl = `${parsed.protocol}//${parsed.host}`;
      await chrome.storage.local.set({ [STORAGE_KEY_SERVER_URL]: serverUrl });
      this.serverUrl = serverUrl;
      this.showToast('服务器地址已保存');
    } catch (error) {
      this.showToast('请输入有效的 URL 格式', 'error');
    }
  }

  async resetServerUrlSettings() {
    this.serverUrl = DEFAULT_SERVER_URL;
    await chrome.storage.local.remove([STORAGE_KEY_SERVER_URL]);
    const input = document.getElementById('serverUrlInput');
    if (input) input.value = DEFAULT_SERVER_URL;
    this.showToast('已恢复默认地址');
  }

  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get(['albumUrls', 'lastExtraction', 'isExtracting', 'extractionStartTime', STORAGE_KEY_SERVER_URL]);
      
      // 检查是否有正在进行的提取
      if (result.isExtracting && result.extractionStartTime) {
        const startTime = new Date(result.extractionStartTime);
        const now = new Date();
        const elapsedMinutes = (now - startTime) / (1000 * 60);
        
        // 如果提取开始时间超过5分钟，认为已超时
        if (elapsedMinutes > 5) {
          console.log('检测到超时的提取任务，清除状态');
          chrome.storage.local.remove(['isExtracting', 'extractionStartTime']);
        } else {
          this.isExtracting = true;
          console.log('检测到正在进行的提取任务');
        }
      }
      
      if (result.albumUrls) {
        this.urls = result.albumUrls;
        
        // 显示最后提取时间
        if (result.lastExtraction) {
          const extractTime = new Date(result.lastExtraction).toLocaleString();
          console.log('最后提取时间:', extractTime);
        }
      }
      if (result[STORAGE_KEY_SERVER_URL]) {
        this.serverUrl = result[STORAGE_KEY_SERVER_URL].trim();
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }

  async checkCurrentStatus() {
    try {
      // 先从存储中获取进度信息
      const storageResult = await chrome.storage.local.get(['extractionProgress', 'lastProgressUpdate']);
      if (storageResult.extractionProgress) {
        this.extractionProgress = storageResult.extractionProgress;
        console.log('从存储获取进度:', this.extractionProgress);
      }

      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && isAlbumExtractSupported(tab.url)) {
        // 向content script查询当前状态
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_EXTRACTION_STATUS' });
          
          if (response) {
            this.isExtracting = response.isExtracting;
            this.extractionProgress = response.progress;
            
            if (response.urls && response.urls.length > 0) {
              this.urls = response.urls;
            }
            
            console.log('同步状态:', {
              isExtracting: this.isExtracting,
              progress: this.extractionProgress,
              urlsCount: this.urls.length
            });
            
            // 更新界面显示
            this.updateUI();
          } else {
            console.warn('⚠️ Content script未响应，可能正在加载中');
          }
        } catch (error) {
          console.warn('⚠️ 无法连接到content script:', error.message);
          // 如果content script未加载，尝试从存储中获取数据
          await this.loadStoredData();
        }
      }
    } catch (error) {
      console.error('检查当前状态失败:', error);
    }
  }

  startDataCheckInterval() {
    // 每2秒检查一次存储数据更新
    this.dataCheckInterval = setInterval(async () => {
      // 检查是否有正在进行的提取
      if (this.isExtracting) {
        // 实时检查当前状态
        await this.checkCurrentStatus();
        
        // 检查存储中的数据更新
        const result = await chrome.storage.local.get(['albumUrls', 'lastExtraction', 'extractionComplete', 'extractionProgress']);
        
        // 如果有进度更新，更新界面
        if (result.extractionProgress) {
          this.extractionProgress = result.extractionProgress;
          this.updateProgressDisplay();
        }
        
        // 如果有新的URL数据，更新列表
        if (result.albumUrls && result.albumUrls.length > this.urls.length) {
          console.log(`URL列表更新: ${this.urls.length} -> ${result.albumUrls.length}`);
          this.urls = result.albumUrls;
          this.updateURLList();
          this.updateCount();
          this.updateButtons();
        }
        
        // 检查是否有完成的数据
        if (result.albumUrls && result.lastExtraction && result.extractionComplete) {
          const lastTime = new Date(result.lastExtraction);
          const now = new Date();
          
          // 如果数据是最近30秒内更新的，说明提取完成
          if (now - lastTime < 30000 && result.albumUrls.length > 0) {
            const siteName = getSiteDisplayName(result.site);
            this.handleExtractionComplete(result.albumUrls, siteName);
          }
        }
      }
    }, 1000);
  }

  stopDataCheckInterval() {
    if (this.dataCheckInterval) {
      clearInterval(this.dataCheckInterval);
      this.dataCheckInterval = null;
    }
  }

  showToast(message, type = 'success') {
    // 创建toast提示
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }
}

// ==================== 演员信息管理器 ====================
class ActorManager {
  constructor() {
    this.extractedData = null;
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 提取演员信息按钮
    document.getElementById('extractActorBtn').addEventListener('click', () => {
      this.extractActorInfo();
    });

    // 下载Markdown文件按钮
    document.getElementById('downloadActorBtn').addEventListener('click', () => {
      this.downloadMarkdownFile();
    });

    // 监听来自content script的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'actorInfoExtracted') {
        this.extractedData = request.data;
        this.handleActorInfoExtracted(request.data);
      }
    });
  }

  // 显示状态消息
  showStatus(message, type = 'success') {
    const status = document.getElementById('actorStatus');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }

  // 显示/隐藏加载状态
  showLoading(show) {
    const loading = document.getElementById('actorLoading');
    const extractBtn = document.getElementById('extractActorBtn');
    loading.style.display = show ? 'block' : 'none';
    extractBtn.disabled = show;
  }

  // 生成Markdown格式的内容（使用统一的MarkdownGenerator）
  generateMarkdown(data) {
    return MarkdownGenerator.generateActorMarkdown(data);
  }

  // 提取演员信息
  async extractActorInfo() {
    this.showLoading(true);
    
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('v2ph.com/actor/') && !tab.url.includes('junmeitu.com/model/')) {
        this.showStatus('请在V2PH演员页面或俊美图模特页面使用此功能', 'error');
        this.showLoading(false);
        return;
      }
      
      // 向content script发送消息
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractActorInfo'
      });
      
      if (response) {
        this.extractedData = response;
        this.handleActorInfoExtracted(response);
      } else {
        this.showStatus('提取失败，请重试', 'error');
      }
      
    } catch (error) {
      console.error('提取演员信息时出错:', error);
      this.showStatus('提取失败: ' + error.message, 'error');
    }
    
    this.showLoading(false);
  }

  handleActorInfoExtracted(data) {
    // 生成Markdown预览
    const markdown = this.generateMarkdown(data);
    const previewContent = document.getElementById('previewContent');
    previewContent.textContent = markdown;
    
    const preview = document.getElementById('preview');
    preview.style.display = 'block';
    
    // 显示下载按钮
    const downloadBtn = document.getElementById('downloadActorBtn');
    downloadBtn.style.display = 'block';
    
    this.showStatus('演员信息提取成功！', 'success');
  }

  // 清理文件名，移除无效字符
  sanitizeFilename(name) {
    if (!name || typeof name !== 'string') {
      return 'unknown_actor';
    }
    
    // 移除或替换无效字符
    let cleanName = name
      .replace(/[<>:"/\\|?*]/g, '')  // 移除Windows不允许的字符
      .replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff-]/g, '')  // 保留字母、数字、中文、日文、空格、连字符
      .replace(/\s+/g, '_')  // 将空格替换为下划线
      .replace(/_{2,}/g, '_')  // 将多个连续下划线替换为单个
      .replace(/^_+|_+$/g, '')  // 移除开头和结尾的下划线
      .trim();
    
    // 如果清理后的名称为空或太短，使用默认名称
    if (!cleanName || cleanName.length < 1) {
      cleanName = 'unknown_actor';
    }
    
    // 限制文件名长度（Windows文件名限制）
    if (cleanName.length > 100) {
      cleanName = cleanName.substring(0, 100);
    }
    
    return cleanName;
  }

  // 下载Markdown文件
  downloadMarkdownFile() {
    if (!this.extractedData) {
      this.showStatus('没有可下载的数据', 'error');
      return;
    }
    
    const markdown = this.generateMarkdown(this.extractedData);
    const filename = MarkdownGenerator.generateActorFilename(this.extractedData.name);
    
    console.log('📁 生成文件名:', filename);
    this.downloadMarkdown(markdown, filename);
  }

  // 下载文件（通过background script）
  downloadMarkdown(content, filename) {
    try {
      console.log('📥 开始下载文件:', filename);
      console.log('📄 文件内容长度:', content.length);
      
      // 发送下载请求到background script
      chrome.runtime.sendMessage({
        action: 'downloadMarkdown',
        content: content,
        filename: filename
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ 下载失败:', chrome.runtime.lastError);
          this.showStatus('下载失败: ' + chrome.runtime.lastError.message, 'error');
        } else if (response && response.success) {
          console.log('✅ 下载成功');
          this.showStatus('文件下载成功！', 'success');
        } else {
          console.error('❌ 下载失败:', response?.error);
          this.showStatus('下载失败: ' + (response?.error || '未知错误'), 'error');
        }
      });
    } catch (error) {
      console.error('❌ 下载过程出错:', error);
      this.showStatus('下载失败: ' + error.message, 'error');
    }
  }
}

// ==================== 初始化 ====================

// 初始化弹窗
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
