// 美图录(meitulu.me)网站解析器
// 支持模特页(/t/xxx/)和分类页(/rihan/等)
class MeituluParser extends BaseParser {
  constructor() {
    super('https://meitulu.me');
  }

  // 判断当前页面类型：模特页 /t/xxx/ 或 /t/xxx/index_N.html 或 分类页 /rihan/ 等
  isModelPage() {
    return /\/t\/[^/]+\/?$/.test(window.location.pathname) ||
           /\/t\/[^/]+\/index_\d+\.html$/.test(window.location.pathname);
  }

  extractCurrentPageURLs() {
    const urls = [];
    // 美图录相册链接：每个 .my-card 包含一个 /item/ 链接
    const albumLinks = document.querySelectorAll('.my-card a[href*="/item/"]');

    albumLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('/item/')) {
        const normalizedURL = this.normalizeURL(href);
        if (normalizedURL) {
          urls.push(normalizedURL);
        }
      }
    });

    console.log(`第${this.getCurrentPageNumber()}页找到 ${urls.length} 个相册链接`);
    return urls;
  }

  hasNextPage() {
    // 查找"下一页"链接
    const nextLink = Array.from(document.querySelectorAll('a')).find(
      a => a.textContent.trim() === '下一页' || a.textContent.trim() === '下一頁'
    );
    if (!nextLink) return false;

    const href = nextLink.getAttribute('href');
    if (!href || href === '#' || href === 'javascript:;') return false;

    // 相对路径 index_2.html 等表示有下一页
    const currentPath = window.location.pathname;
    let normalizedHref = href;
    if (!href.startsWith('http') && !href.startsWith('/')) {
      const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      normalizedHref = currentDir + href;
    }
    // 避免与当前页相同
    if (normalizedHref === currentPath) return false;

    return true;
  }

  getCurrentPageNumber() {
    const pathname = window.location.pathname;

    if (this.isModelPage()) {
      // 模特页: /t/Winnie/index_2.html -> 2，第一页 /t/Winnie/ -> 1
      const indexMatch = pathname.match(/\/t\/[^/]+\/index_(\d+)\.html$/);
      if (indexMatch) return parseInt(indexMatch[1]);
      return 1;
    }

    // 分类页: /rihan/index_2.html -> 2
    const categoryMatch = pathname.match(/index_(\d+)\.html$/);
    if (categoryMatch) return parseInt(categoryMatch[1]);
    return 1;
  }

  async navigateToPage(pageNumber) {
    const pathname = window.location.pathname;
    let newURL;

    if (this.isModelPage()) {
      // 模特页: /t/Winnie/ 或 /t/Winnie/index_2.html，正确格式为 index_N.html 而非 /N/
      const modelMatch = pathname.match(/^(\/t\/[^/]+)\/?(index_\d+\.html)?$/);
      const basePath = modelMatch ? modelMatch[1] : pathname.replace(/\/index_\d+\.html$/, '').replace(/\/$/, '');

      if (pageNumber === 1) {
        newURL = `${this.baseURL}${basePath}/`;
      } else {
        newURL = `${this.baseURL}${basePath}/index_${pageNumber}.html`;
      }
    } else {
      // 分类页: /rihan/ 或 /rihan/index_2.html
      const categoryMatch = pathname.match(/^(\/[^/]+)\/?(index_\d+\.html)?$/);
      const basePath = categoryMatch ? categoryMatch[1] : pathname.replace(/\/index_\d+\.html$/, '').replace(/\/$/, '');

      if (pageNumber === 1) {
        newURL = `${this.baseURL}${basePath}/`;
      } else {
        newURL = `${this.baseURL}${basePath}/index_${pageNumber}.html`;
      }
    }

    try {
      console.log(`正在导航到: ${newURL}`);

      const html = await this.fetchPageContentWithRetry(newURL);

      const updateSelectors = [
        {
          selector: '.row.my-gutters-b',
          updateContent: (current, newElement) => {
            current.innerHTML = newElement.innerHTML;
            const count = newElement.querySelectorAll('.my-card a[href*="/item/"]').length;
            console.log(`更新相册列表，新页面包含 ${count} 个相册链接`);
          }
        }
      ];

      // 分页区域（分类页有，模特页可能无）
      const paginationSelector = 'div.pt-1.pb-3';
      updateSelectors.push({
        selector: paginationSelector,
        updateContent: (current, newElement) => {
          current.innerHTML = newElement.innerHTML;
        }
      });

      this.updatePageContent(html, updateSelectors, newURL);
    } catch (error) {
      console.error('导航到第' + pageNumber + '页失败:', error);
      throw error;
    }
  }

  async waitForPageLoad() {
    return new Promise(resolve => {
      setTimeout(resolve, 1200); // 美图录等待1.2秒
    });
  }

  // 带 Referer 和重试的 fetch，减少 404 等间歇性错误
  async fetchPageContentWithRetry(url, maxRetries = 3) {
    const headers = {
      'Referer': `${this.baseURL}/`,
      'User-Agent': navigator.userAgent
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const html = await this.fetchPageContent(url, headers);
        return html;
      } catch (error) {
        const isRetryable = error.message.includes('404') || error.message.includes('status: 5');
        if (attempt < maxRetries && isRetryable) {
          const delay = attempt * 1500; // 递增延迟：1.5s, 3s
          console.warn(`第${attempt}次请求失败，${delay}ms 后重试:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }
}
