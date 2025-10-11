// 合并的Chrome插件 - 内容脚本
// 整合了相册URL获取器和演员信息提取器功能

// ==================== 相册URL获取器部分 ====================

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
    // 移除已存在的按钮
    const existingBtn = document.getElementById('album-extractor-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    if (!this.currentParser) return;

    // 创建状态显示按钮
    const button = document.createElement('button');
    button.id = 'album-extractor-btn';
    button.textContent = '相册URL获取器';
    button.className = 'album-extractor-btn';
    button.disabled = false;
    
    // 添加点击事件 - 直接开始提取
    button.addEventListener('click', () => {
      this.extractAlbumURLs();
    });

    // 插入按钮到页面
    const targetElement = document.querySelector('body');
    if (targetElement) {
      targetElement.appendChild(button);
    }
    
    // 更新按钮状态
    this.updateButtonStatus();
  }

  async extractAlbumURLs() {
    if (!this.currentParser) {
      this.showErrorToast('当前网站暂不支持');
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
        const yamlContent = this.generateYAMLFormat(Array.from(urls));
        await navigator.clipboard.writeText(yamlContent);
        console.log('YAML格式URL已复制到剪贴板');
        
        // 显示复制成功提示
        this.showCopySuccessToast(urls.size);
      } catch (error) {
        console.error('复制到剪贴板失败:', error);
      }

    } catch (error) {
      console.error('获取相册URL失败:', error);
      this.showErrorToast('获取失败: ' + error.message);
      
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
    const button = document.getElementById('album-extractor-btn');
    if (!button) return;

    if (this.isExtracting) {
      button.textContent = `正在获取... (第${this.extractionProgress.currentPage}页)`;
      button.className = 'album-extractor-btn extracting';
      button.disabled = true;
    } else {
      button.textContent = '相册URL获取器';
      button.className = 'album-extractor-btn';
      button.disabled = false;
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
      this.showToast(`正在获取第${this.extractionProgress.currentPage}页，已找到${this.extractionProgress.urlsFound}个URL`, 'info');
    } else {
      this.showToast('请使用插件弹窗开始获取URL', 'info');
    }
  }

  showErrorToast(message) {
    this.showToast(message, 'error');
  }

  showToast(message, type = 'success') {
    // 创建toast提示
    const toast = document.createElement('div');
    
    let backgroundColor = '#4CAF50'; // 默认成功绿色
    if (type === 'error') backgroundColor = '#f44336';
    if (type === 'info') backgroundColor = '#2196F3';
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  showCopySuccessToast(count) {
    this.showToast(`已复制 ${count} 个URL到剪贴板`, 'success');
  }

  generateYAMLFormat(urls) {
    const yamlContent = [
      'global_settings:',
      '  download_dir: \'\'',
      '  skip_existing: false',
      '  delay_min: 2.0  # 测试配置：最小延迟2秒',
      '  delay_max: 4.0  # 测试配置：最大延迟4秒',
      '',
      'albums:'
    ];

    urls.forEach(url => {
      yamlContent.push(`  - url: '${url}'`);
    });

    return yamlContent.join('\n');
  }
}

// V2PH网站解析器
class V2PHParser {
  constructor() {
    this.baseURL = 'https://www.v2ph.com';
    this.extractedURLs = new Set();
  }

  async extractAllPages(extractor = null) {
    this.extractedURLs.clear();
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`正在获取第${currentPage}页...`);
      
      // 更新进度
      if (extractor) {
        extractor.updateProgress(currentPage, this.extractedURLs.size);
      }
      
      // 获取当前页的URLs
      const pageURLs = this.extractCurrentPageURLs();
      pageURLs.forEach(url => this.extractedURLs.add(url));

      // 实时保存当前URL列表到存储
      if (extractor) {
        chrome.storage.local.set({
          albumUrls: Array.from(this.extractedURLs),
          lastProgressUpdate: new Date().toISOString()
        });
      }

      // 检查是否有下一页
      hasNextPage = this.hasNextPage();
      console.log(`第${currentPage}页是否有下一页:`, hasNextPage);
      
      if (hasNextPage) {
        currentPage++;
        console.log(`准备翻到第${currentPage}页`);
        await this.navigateToPage(currentPage);
        // 等待页面加载
        await this.waitForPageLoad();
      } else {
        console.log('没有下一页，翻页完成');
      }
    }

    console.log(`总共获取到 ${this.extractedURLs.size} 个相册URL`);
    return this.extractedURLs;
  }

  extractCurrentPageURLs() {
    const urls = [];
    // 修正选择器：相册链接在 .albums-list 下的 .card 中的 .card-cover .media-cover
    const albumLinks = document.querySelectorAll('.albums-list .card .card-cover .media-cover');
    
    albumLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('/album/')) {
        // 如果是相对路径，转换为绝对路径
        const fullURL = href.startsWith('http') ? href : this.baseURL + href;
        urls.push(fullURL);
      }
    });

    console.log(`第${this.getCurrentPageNumber()}页找到 ${urls.length} 个相册链接`);
    return urls;
  }

  hasNextPage() {
    const pagination = document.querySelector('nav.py-2 ul.pagination');
    if (!pagination) return false;

    // 查找"下一页"链接
    const nextLinks = pagination.querySelectorAll('a[href*="page="]');
    
    for (let link of nextLinks) {
      const linkText = link.textContent.trim();
      // 检查是否包含"下一页"文本，并且链接不是禁用的
      if (linkText === '下一页' && !link.classList.contains('disabled')) {
        return true;
      }
    }
    
    // 检查是否有"末页"链接且当前不是最后一页
    const lastPageLink = pagination.querySelector('a[href*="page="]');
    if (lastPageLink && lastPageLink.textContent.trim() === '末页') {
      const currentPage = this.getCurrentPageNumber();
      const lastPageHref = lastPageLink.getAttribute('href');
      const lastPageMatch = lastPageHref.match(/page=(\d+)/);
      if (lastPageMatch) {
        const lastPageNumber = parseInt(lastPageMatch[1]);
        return currentPage < lastPageNumber;
      }
    }
    
    return false;
  }

  getCurrentPageNumber() {
    const activePage = document.querySelector('nav.py-2 ul.pagination li.page-item.active');
    if (activePage) {
      const pageLink = activePage.querySelector('a');
      if (pageLink) {
        const pageText = pageLink.textContent.trim();
        return parseInt(pageText) || 1;
      }
    }
    return 1;
  }

  async navigateToPage(pageNumber) {
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('page', pageNumber);
    
    const newURL = `${this.baseURL}${currentPath}?${searchParams.toString()}`;
    
    try {
      console.log(`正在导航到: ${newURL}`);
      
      // 使用fetch获取新页面内容
      const response = await fetch(newURL, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      // 解析HTML并更新当前页面
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, 'text/html');
      
      // 更新相册列表部分
      const newAlbumsList = newDoc.querySelector('.albums-list');
      const currentAlbumsList = document.querySelector('.albums-list');
      if (newAlbumsList && currentAlbumsList) {
        currentAlbumsList.innerHTML = newAlbumsList.innerHTML;
        console.log(`更新相册列表，新页面包含 ${newAlbumsList.querySelectorAll('.card').length} 个相册`);
      }

      // 更新分页部分
      const newPagination = newDoc.querySelector('nav.py-2');
      const currentPagination = document.querySelector('nav.py-2');
      if (newPagination && currentPagination) {
        currentPagination.innerHTML = newPagination.innerHTML;
      }

      // 更新URL
      window.history.pushState({}, '', newURL);
      
    } catch (error) {
      console.error('导航到第' + pageNumber + '页失败:', error);
      throw error;
    }
  }

  async waitForPageLoad() {
    return new Promise(resolve => {
      setTimeout(resolve, 1000); // 等待1秒确保页面加载完成
    });
  }
}

// 俊美图网站解析器
class JunMeituParser {
  constructor() {
    this.baseURL = 'https://www.junmeitu.com';
    this.extractedURLs = new Set();
  }

  async extractAllPages(extractor = null) {
    this.extractedURLs.clear();
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`正在获取第${currentPage}页...`);
      
      // 更新进度
      if (extractor) {
        extractor.updateProgress(currentPage, this.extractedURLs.size);
      }
      
      // 获取当前页的URLs
      const pageURLs = this.extractCurrentPageURLs();
      pageURLs.forEach(url => this.extractedURLs.add(url));

      // 实时保存当前URL列表到存储
      if (extractor) {
        chrome.storage.local.set({
          albumUrls: Array.from(this.extractedURLs),
          lastProgressUpdate: new Date().toISOString()
        });
      }

      // 检查是否有下一页
      hasNextPage = this.hasNextPage();
      console.log(`第${currentPage}页是否有下一页:`, hasNextPage);
      
      if (hasNextPage) {
        currentPage++;
        console.log(`准备翻到第${currentPage}页`);
        await this.navigateToPage(currentPage);
        // 等待页面加载
        await this.waitForPageLoad();
      } else {
        console.log('没有下一页，翻页完成');
      }
    }

    console.log(`总共获取到 ${this.extractedURLs.size} 个相册URL`);
    return this.extractedURLs;
  }

  extractCurrentPageURLs() {
    const urls = [];
    // 俊美图网站的相册链接使用更精确的CSS选择器
    const albumLinks = document.querySelectorAll('div.main > div.list > div.pic-list > ul > li > a');
    
    albumLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.includes('#') && !href.includes('javascript:') && !href.includes('void(0)')) {
        // 如果是相对路径，转换为绝对路径
        const fullURL = href.startsWith('http') ? href : this.baseURL + href;
        urls.push(fullURL);
      }
    });

    console.log(`第${this.getCurrentPageNumber()}页找到 ${urls.length} 个相册链接`);
    return urls;
  }

  hasNextPage() {
    // 俊美图网站的分页在 .pages 类中
    const paginationDiv = document.querySelector('.pages');
    if (!paginationDiv) return false;

    // 查找"下一頁"链接
    const nextLink = Array.from(paginationDiv.querySelectorAll('a')).find(a => a.textContent.trim() === '下一頁');
    if (!nextLink) return false;

    // 检查链接是否有效（不是指向当前页）
    const href = nextLink.getAttribute('href');
    const currentPath = window.location.pathname;
    
    // 如果下一页链接和当前页路径相同，说明没有下一页
    if (href === currentPath) return false;
    
    // 检查是否有更高页码的链接存在
    const currentPage = this.getCurrentPageNumber();
    const allLinks = paginationDiv.querySelectorAll('a[href*=".html"]');
    
    for (let link of allLinks) {
      const linkHref = link.getAttribute('href');
      if (linkHref && linkHref !== currentPath) {
        // 尝试从链接中提取页码
        const pageMatch = linkHref.match(/-(\d+)\.html$/);
        if (pageMatch) {
          const linkPage = parseInt(pageMatch[1]);
          if (linkPage > currentPage) {
            return true;
          }
        }
      }
    }
    
    // 如果下一页链接存在且指向不同页面，说明有下一页
    return href !== currentPath;
  }

  getCurrentPageNumber() {
    // 从URL路径中提取页码
    const pathname = window.location.pathname;
    const match = pathname.match(/-(\d+)\.html$/);
    if (match) {
      return parseInt(match[1]);
    }
    return 1; // 默认第一页
  }

  async navigateToPage(pageNumber) {
    let newURL;
    
    if (pageNumber === 1) {
      // 第一页的URL格式：/model/name.html
      const basePath = window.location.pathname.replace(/-\d+\.html$/, '.html');
      newURL = `${this.baseURL}${basePath}`;
    } else {
      // 其他页面的URL格式：/model/name-page.html
      const basePath = window.location.pathname.replace(/-\d+\.html$/, '.html');
      const newPath = basePath.replace('.html', `-${pageNumber}.html`);
      newURL = `${this.baseURL}${newPath}`;
    }
    
    try {
      console.log(`正在导航到: ${newURL}`);
      
      // 使用fetch获取新页面内容
      const response = await fetch(newURL, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      // 解析HTML并更新当前页面
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, 'text/html');
      
      // 更新相册列表部分 - 俊美图网站的主要内容区域
      const newContentArea = newDoc.querySelector('div.main > div.list > div.pic-list');
      const currentContentArea = document.querySelector('div.main > div.list > div.pic-list');
      if (newContentArea && currentContentArea) {
        currentContentArea.innerHTML = newContentArea.innerHTML;
        console.log(`更新相册列表区域，新页面包含 ${newContentArea.querySelectorAll('ul > li > a').length} 个相册链接`);
      }

      // 更新分页部分
      const newPagination = newDoc.querySelector('.pages');
      const currentPagination = document.querySelector('.pages');
      if (newPagination && currentPagination) {
        currentPagination.innerHTML = newPagination.innerHTML;
      }

      // 更新URL
      window.history.pushState({}, '', newURL);
      
    } catch (error) {
      console.error('导航到第' + pageNumber + '页失败:', error);
      throw error;
    }
  }

  async waitForPageLoad() {
    return new Promise(resolve => {
      setTimeout(resolve, 1500); // 等待1.5秒确保页面加载完成
    });
  }
}

// ==================== 演员信息提取器部分 ====================

// 简化的图片转换函数 - 使用重构后的ImageProcessor
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

// 提取演员信息
async function extractActorInfo() {
    try {
        console.log('🎭 开始提取演员信息...');
        
        // 检查当前网站类型
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('junmeitu.com/model/')) {
            console.log('🌐 检测到俊美图网站，使用俊美图提取逻辑');
            return await extractFromJunmeitu();
        } else if (currentUrl.includes('v2ph.com/actor/')) {
            console.log('🌐 检测到V2PH网站，使用V2PH提取逻辑');
            return await extractFromV2PH();
        } else {
            console.warn('⚠️ 不支持的网站类型');
            return null;
        }
        
    } catch (error) {
        console.error('❌ 提取演员信息时出错:', error);
        return null;
    }
}

// 从俊美图网站提取信息
async function extractFromJunmeitu() {
    try {
        console.log('🎭 开始从俊美图提取演员信息...');
        
        // 提取演员名称 - 使用指定的CSS选择器
        let actorName = '';
        const h1Element = document.querySelector('body > div.main > div.list > div.doujin_album_info.mini > div.album_info > h1');
        if (h1Element) {
            actorName = h1Element.textContent.trim();
            console.log('✅ 提取到演员名称:', actorName);
        }
        
        // 提取演员图片 - 使用指定的CSS选择器
        let actorImage = null;
        let base64Image = '';
        
        const imgElement = document.querySelector('body > div.main > div.list > div.doujin_album_info.mini > div.thumb > img');
        if (imgElement && imgElement.src) {
            actorImage = imgElement;
            console.log('✅ 找到演员图片:', actorImage.src);
        }
        
        if (actorImage) {
            // 使用统一的强大图片转换方法
            base64Image = await convertImageToBase64(actorImage);
            
            if (base64Image) {
                console.log('✅ 图片转换成功');
            } else {
                console.warn('⚠️ 图片转换失败，保存图片URL');
                // 如果转换失败，保存图片URL作为备用
                base64Image = actorImage.src;
            }
        } else {
            console.warn('⚠️ 未找到演员图片');
        }
        
        // 提取详细信息 - 使用指定的CSS选择器
        const info = {};
        const infoElement = document.querySelector('body > div.main > div.list > div.doujin_album_info.mini > div.album_info > div.people-info');
        
        if (infoElement) {
            const infoText = infoElement.textContent;
            console.log('📊 找到信息元素:', infoText);
            
            // 解析信息文本
            const infoItems = infoText.split(/\s+/).filter(item => item.includes('：'));
            
            for (let item of infoItems) {
                const parts = item.split('：');
                if (parts.length === 2) {
                    const label = parts[0].trim();
                    const value = parts[1].trim();
                    console.log(`📝 ${label}: ${value}`);
                    
                    // 映射到标准字段名
                    switch (label) {
                        case '性別':
                            info.gender = value;
                            break;
                        case '籍貫':
                            info.hometown = value;
                            break;
                        case '職業':
                            info.profession = value;
                            break;
                        case '生日':
                            info.birthday = value;
                            break;
                        case '血型':
                            info.bloodType = value;
                            break;
                        case '三圍':
                            info.measurements = value.replace(/\s+/g, ' '); // 清理多余空格
                            break;
                        case '罩杯':
                            info.cupSize = value;
                            break;
                        case '身高':
                            info.height = value;
                            break;
                        case '體重':
                            info.weight = value;
                            break;
                    }
                }
            }
        }
        
        // 提取描述信息 - 使用指定的CSS选择器
        let description = '';
        const descElement = document.querySelector('body > div.main > div.list > div.doujin_album_info.mini > div.album_info > div.album_description');
        
        if (descElement) {
            description = descElement.textContent.trim();
            console.log('✅ 提取到描述:', description.substring(0, 50) + '...');
        }
        
        const result = {
            name: actorName,
            image: base64Image,
            info: info,
            description: description,
            url: window.location.href
        };
        
        console.log('🎉 信息提取完成:', {
            name: actorName,
            image: base64Image ? '已获取' : '未获取',
            infoKeys: Object.keys(info),
            description: description ? '已获取' : '未获取'
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ 从俊美图提取信息时出错:', error);
        return null;
    }
}

// 从V2PH网站提取信息
async function extractFromV2PH() {
    try {
        console.log('🎭 开始从V2PH提取演员信息...');
        
        // 查找主要容器 - 根据实际DOM结构
        const mainContainer = document.querySelector('body > div > div.card.mt-2.px-2');
        if (!mainContainer) {
            console.warn('⚠️ 未找到主要容器，尝试备用选择器');
            // 备用选择器
            const altSelectors = [
                'div.card.mt-2.px-2',
                '.card.mt-2.px-2',
                'div[class*="card"][class*="mt-2"]',
                '.card-body'
            ];
            
            for (let selector of altSelectors) {
                const container = document.querySelector(selector);
                if (container) {
                    console.log(`✅ 使用备用选择器找到容器: ${selector}`);
                    return await extractFromContainer(container);
                }
            }
            
            console.error('❌ 无法找到演员信息容器');
            return null;
        }
        
        console.log('✅ 找到主要容器');
        return await extractFromContainer(mainContainer);
        
    } catch (error) {
        console.error('❌ 提取演员信息时出错:', error);
        return null;
    }
}

// 从容器中提取信息的辅助函数
async function extractFromContainer(container) {
    try {
        // 提取演员名称
        let actorName = '';
        const h1Element = container.querySelector('h1.h5');
        if (h1Element) {
            actorName = h1Element.textContent.trim();
            console.log('✅ 提取到演员名称:', actorName);
        }
        
        if (!actorName) {
            const nameSelectors = [
                'h1', '.actor-name', '.profile-name'
            ];
            for (let selector of nameSelectors) {
                const elem = container.querySelector(selector);
                if (elem && elem.textContent.trim()) {
                    actorName = elem.textContent.trim();
                    break;
                }
            }
        }
        
        if (!actorName) {
            actorName = document.title.split(' - ')[0] || document.title;
            console.log('⚠️ 从页面标题提取名称:', actorName);
        }
        
        // 提取演员图片
        let actorImage = null;
        let base64Image = '';
        
        const actorCoverImg = container.querySelector('.actor-cover img');
        if (actorCoverImg && actorCoverImg.src) {
            actorImage = actorCoverImg;
            console.log('✅ 找到演员图片:', actorImage.src);
        }
        
        if (!actorImage) {
            const imgSelectors = [
                '.actor-cover img',
                '.img-fluid.rounded.img-thumbnail',
                'img[alt*="' + actorName.split(' ')[0] + '"]',
                'img[src*="cdn.v2ph.com/actor"]'
            ];
            
            for (let selector of imgSelectors) {
                const img = container.querySelector(selector);
                if (img && img.src && !img.src.includes('data:')) {
                    actorImage = img;
                    console.log('✅ 通过备用选择器找到图片:', selector);
                    break;
                }
            }
        }
        
        if (actorImage) {
            // 使用统一的强大图片转换方法
            base64Image = await convertImageToBase64(actorImage);
            
            if (base64Image) {
                console.log('✅ 图片转换成功');
            } else {
                console.warn('⚠️ 图片转换失败，保存图片URL');
                // 如果转换失败，保存图片URL作为备用
                base64Image = actorImage.src;
            }
        } else {
            console.warn('⚠️ 未找到演员图片');
        }
        
        // 提取详细信息 - 使用精确的选择器
        const info = {};
        
        // 查找所有dt元素
        const dtElements = container.querySelectorAll('dt');
        console.log(`📊 找到 ${dtElements.length} 个信息字段`);
        
        for (let dt of dtElements) {
            const label = dt.textContent.trim();
            const dd = dt.nextElementSibling;
            
            if (dd && dd.tagName === 'DD') {
                const value = dd.textContent.trim();
                console.log(`📝 ${label}: ${value}`);
                
                // 根据标签提取对应信息
                switch (label) {
                    case '生日':
                        info.birthday = value;
                        break;
                    case '身高':
                        info.height = value;
                        break;
                    case '三围':
                        info.measurements = value.replace(/\s+/g, ' '); // 清理多余空格
                        break;
                    case '来自':
                        info.hometown = value;
                        break;
                    case '星座':
                        info.zodiac = value;
                        break;
                    case '血型':
                        info.bloodType = value;
                        break;
                    case '职业':
                        info.profession = value;
                        break;
                    case '兴趣':
                        info.interests = value;
                        break;
                    default:
                        console.log(`⚠️ 未识别的标签: ${label}`);
                }
            }
        }
        
        // 提取描述信息
        let description = '';
        
        // 方法1: 查找.col-md-9中的文本节点
        const colMd9 = container.querySelector('.col-md-9');
        if (colMd9) {
            const textNodes = Array.from(colMd9.childNodes).filter(node => 
                node.nodeType === Node.TEXT_NODE && 
                node.textContent.trim().length > 20
            );
            
            if (textNodes.length > 0) {
                description = textNodes[textNodes.length - 1].textContent.trim();
                console.log('✅ 提取到描述:', description.substring(0, 50) + '...');
            }
        }
        
        // 方法2: 如果没找到，查找.card-body中的文本节点
        if (!description) {
            const cardBody = container.querySelector('.card-body');
            if (cardBody) {
                const textNodes = Array.from(cardBody.childNodes).filter(node => 
                    node.nodeType === Node.TEXT_NODE && 
                    node.textContent.trim().length > 50
                );
                
                if (textNodes.length > 0) {
                    description = textNodes[0].textContent.trim();
                    console.log('✅ 通过备用方法提取到描述:', description.substring(0, 50) + '...');
                }
            }
        }
        
        // 方法3: 如果还是没找到，使用文本内容搜索
        if (!description) {
            const allText = container.textContent;
            const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 20);
            
            // 查找包含"别名"或"日本"或"出道"的文本
            for (let line of lines) {
                if (line.includes('别名') || line.includes('日本') || line.includes('出道')) {
                    description = line;
                    console.log('✅ 通过文本搜索提取到描述:', description.substring(0, 50) + '...');
                    break;
                }
            }
        }
        
        const result = {
            name: actorName,
            image: base64Image,
            info: info,
            description: description,
            url: window.location.href
        };
        
        console.log('🎉 V2PH信息提取完成:', {
            name: actorName,
            image: base64Image ? '已获取' : '未获取',
            infoKeys: Object.keys(info),
            description: description ? '已获取' : '未获取'
        });
        
        return result;
        
    } catch (error) {
        console.error('❌ 从容器提取信息时出错:', error);
        return null;
    }
}

// ==================== 统一消息监听器 ====================

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 相册URL获取器消息
    if (request.type === 'GET_CURRENT_URLS') {
        sendResponse({
            urls: Array.from(albumExtractor?.extractedURLs || []),
            site: window.location.hostname
        });
    } else if (request.type === 'START_EXTRACTION') {
        // 处理来自popup的提取请求
        if (albumExtractor) {
            albumExtractor.extractAlbumURLs();
        }
        sendResponse({ success: true });
    } else if (request.type === 'GET_EXTRACTION_STATUS') {
        sendResponse({
            isExtracting: albumExtractor?.isExtracting || false,
            progress: albumExtractor?.extractionProgress || {},
            urls: Array.from(albumExtractor?.extractedURLs || [])
        });
    }
    
    // 演员信息提取器消息
    if (request.action === 'extractActorInfo') {
        extractActorInfo().then(result => {
            sendResponse(result);
        });
        return true; // 保持消息通道开放以支持异步响应
    }
});

// ==================== 初始化 ====================

let albumExtractor = null;

// 初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // 只在支持的网站初始化相册URL提取器
        if (window.location.hostname.includes('v2ph.com') || window.location.hostname.includes('junmeitu.com')) {
            albumExtractor = new AlbumURLExtractor();
        }
    });
} else {
    // 只在支持的网站初始化相册URL提取器
    if (window.location.hostname.includes('v2ph.com') || window.location.hostname.includes('junmeitu.com')) {
        albumExtractor = new AlbumURLExtractor();
    }
}
