// 基础解析器 - 提供通用的翻页和URL提取逻辑
class BaseParser {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.extractedURLs = new Set();
  }

  // 通用的翻页提取流程
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

  // 抽象方法 - 子类必须实现
  extractCurrentPageURLs() {
    throw new Error('extractCurrentPageURLs方法必须在子类中实现');
  }

  hasNextPage() {
    throw new Error('hasNextPage方法必须在子类中实现');
  }

  getCurrentPageNumber() {
    throw new Error('getCurrentPageNumber方法必须在子类中实现');
  }

  async navigateToPage(pageNumber) {
    throw new Error('navigateToPage方法必须在子类中实现');
  }

  async waitForPageLoad() {
    // 随机延迟 800-2000ms，模拟真人浏览节奏
    const delay = 800 + Math.floor(Math.random() * 1200);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // 通用的URL处理逻辑
  normalizeURL(href) {
    if (!href) return null;
    
    // 过滤无效链接
    if (href.includes('#') || href.includes('javascript:') || href.includes('void(0)')) {
      return null;
    }

    // 转换为绝对路径
    return href.startsWith('http') ? href : this.baseURL + href;
  }

  // 通用的fetch导航逻辑 - 允许缓存，添加Referer模拟真人浏览
  async fetchPageContent(url, headers = {}) {
    const defaultHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': this.baseURL + '/',
      ...headers
    };

    const response = await fetch(url, {
      headers: defaultHeaders,
      cache: 'default'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.text();
  }

  // 通用的页面内容更新逻辑
  updatePageContent(html, selectors, newURL = null) {
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');
    
    // 更新指定的元素
    selectors.forEach(({ selector, updateContent }) => {
      const newElement = newDoc.querySelector(selector);
      const currentElement = document.querySelector(selector);
      
      if (newElement && currentElement) {
        updateContent(currentElement, newElement);
        console.log(`更新元素: ${selector}`);
      }
    });

    // 更新URL（如果提供了新URL）
    if (newURL) {
      window.history.pushState({}, '', newURL);
    }
  }
}
