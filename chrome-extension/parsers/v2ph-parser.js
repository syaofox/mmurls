// V2PH网站解析器
class V2PHParser extends BaseParser {
  constructor() {
    super('https://www.v2ph.com');
  }

  extractCurrentPageURLs() {
    const urls = [];
    // V2PH网站的相册链接选择器
    const albumLinks = document.querySelectorAll('.albums-list .card .card-cover .media-cover');
    
    albumLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('/album/')) {
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
      
      // 获取页面内容
      const html = await this.fetchPageContent(newURL);
      
      // 更新页面内容
      this.updatePageContent(html, [
        {
          selector: '.albums-list',
          updateContent: (current, newElement) => {
            current.innerHTML = newElement.innerHTML;
            console.log(`更新相册列表，新页面包含 ${newElement.querySelectorAll('.card').length} 个相册`);
          }
        },
        {
          selector: 'nav.py-2',
          updateContent: (current, newElement) => {
            current.innerHTML = newElement.innerHTML;
          }
        }
      ]);
      
    } catch (error) {
      console.error('导航到第' + pageNumber + '页失败:', error);
      throw error;
    }
  }

  async waitForPageLoad() {
    return new Promise(resolve => {
      setTimeout(resolve, 1000); // V2PH等待1秒
    });
  }
}
