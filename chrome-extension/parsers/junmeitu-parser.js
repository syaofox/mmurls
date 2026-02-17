// 俊美图网站解析器
class JunMeituParser extends BaseParser {
  constructor() {
    super('https://www.junmeitu.com');
  }

  extractCurrentPageURLs() {
    const urls = [];
    // 俊美图网站的相册链接选择器
    const albumLinks = document.querySelectorAll('div.main > div.list > div.pic-list > ul > li > a');
    
    albumLinks.forEach(link => {
      const href = link.getAttribute('href');
      const normalizedURL = this.normalizeURL(href);
      if (normalizedURL) {
        urls.push(normalizedURL);
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
    
    // 标准化路径比较
    // 处理相对路径和绝对路径的情况
    let normalizedHref = href;
    let normalizedCurrentPath = currentPath;
    
    // 如果href是相对路径，转换为绝对路径进行比较
    if (href && !href.startsWith('http') && !href.startsWith('/')) {
      // 相对路径，基于当前目录
      const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      normalizedHref = currentDir + href;
    } else if (href && href.startsWith('/')) {
      // 绝对路径，直接使用
      normalizedHref = href;
    }
    
    // 如果下一页链接和当前页路径相同，说明没有下一页
    if (normalizedHref === normalizedCurrentPath) {
      console.log('下一页链接指向当前页，已到最后一页');
      return false;
    }
    
    // 如果下一页链接存在且指向不同页面，说明有下一页
    return true;
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
      
      // 获取页面内容
      const html = await this.fetchPageContent(newURL);
      
      // 更新页面内容
      this.updatePageContent(html, [
        {
          selector: 'div.main > div.list > div.pic-list',
          updateContent: (current, newElement) => {
            current.innerHTML = newElement.innerHTML;
            console.log(`更新相册列表区域，新页面包含 ${newElement.querySelectorAll('ul > li > a').length} 个相册链接`);
          }
        },
        {
          selector: '.pages',
          updateContent: (current, newElement) => {
            current.innerHTML = newElement.innerHTML;
          }
        }
      ], newURL);
      
    } catch (error) {
      console.error('导航到第' + pageNumber + '页失败:', error);
      throw error;
    }
  }

  async waitForPageLoad() {
    const delay = 1200 + Math.floor(Math.random() * 1200); // 1200-2400ms 随机
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
