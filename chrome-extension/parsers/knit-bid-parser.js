// xx.knit.bid (爱妹子) 网站解析器
// 支持搜索页 /search/?s=keyword、分类页 /type/{id}/、标签页 /tag/{id}/
class KnitBidParser extends BaseParser {
  constructor() {
    super('https://xx.knit.bid');
  }

  // 判断页面类型
  isSearchPage() {
    return window.location.pathname.includes('/search/');
  }

  isTypeOrTagPage() {
    return /\/type\/\d+\//.test(window.location.pathname) ||
           /\/tag\/\d+\//.test(window.location.pathname);
  }

  extractCurrentPageURLs() {
    const urls = [];
    const albumLinks = document.querySelectorAll('a[href*="/article/"]');

    albumLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes('/article/')) {
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
    if (this.isSearchPage()) {
      const nextLi = document.querySelector('#search-results > nav > div > ul > li.next-page');
      if (!nextLi) return false;
      if (nextLi.classList.contains('disabled')) return false;
      const nextLink = nextLi.querySelector('a');
      return !!nextLink;
    }
    const nextLink = Array.from(document.querySelectorAll('a')).find(
      a => a.textContent.trim() === '下一页' || a.textContent.trim() === '下一頁'
    );
    if (!nextLink) return false;
    const href = nextLink.getAttribute('href');
    if (href === '#' || href === 'javascript:;') {
      const currentPage = this.getCurrentPageNumber();
      const totalPages = this.getLastPageNumber();
      return totalPages > 0 && currentPage < totalPages;
    }
    return true;
  }

  getLastPageNumber() {
    const spinbutton = document.querySelector('input[type="number"]');
    if (spinbutton) {
      const max = parseInt(spinbutton.getAttribute('max') || spinbutton.getAttribute('valuemax'), 10);
      if (!isNaN(max)) return max;
    }
    const match = document.body.textContent.match(/共\s*(\d+)\s*頁/);
    return match ? parseInt(match[1], 10) : 0;
  }

  getCurrentPageNumber() {
    if (this.isSearchPage()) {
      const activeLi = document.querySelector('#search-results nav li.active, #search-results nav li.current');
      if (activeLi) {
        const p = parseInt(activeLi.textContent.trim(), 10);
        if (!isNaN(p)) return p;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');
    if (pageParam) {
      const p = parseInt(pageParam, 10);
      if (!isNaN(p)) return p;
    }

    const pathMatch = window.location.pathname.match(/\/page\/(\d+)\//);
    if (pathMatch) {
      return parseInt(pathMatch[1], 10);
    }

    return 1;
  }

  async navigateToPage(pageNumber) {
    if (this.isSearchPage()) {
      return this.navigateSearchPageByClick();
    }

    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    let newURL;

    if (this.isTypeOrTagPage()) {
      if (pageNumber === 1) {
        const basePath = pathname.replace(/\/page\/\d+\/?$/, '').replace(/\/$/, '') + '/';
        newURL = `${this.baseURL}${basePath}`;
      } else {
        const basePath = pathname.replace(/\/page\/\d+\/?$/, '').replace(/\/$/, '');
        newURL = `${this.baseURL}${basePath}/page/${pageNumber}/`;
      }
    } else {
      searchParams.set('page', pageNumber);
      newURL = `${this.baseURL}${pathname}?${searchParams.toString()}`;
    }

    try {
      console.log(`正在导航到: ${newURL}`);
      const html = await this.fetchPageContent(newURL);
      const updateSelectors = [
        {
          selector: '.excerpts.image-container',
          updateContent: (current, newElement) => {
            current.innerHTML = newElement.innerHTML;
            const count = newElement.querySelectorAll('a[href*="/article/"]').length;
            console.log(`更新相册列表，新页面包含 ${count} 个相册链接`);
          }
        },
        {
          selector: 'nav.pagination-nav',
          updateContent: (current, newElement) => {
            current.innerHTML = newElement.innerHTML;
          }
        }
      ];
      this.updatePageContent(html, updateSelectors, newURL);
    } catch (error) {
      console.error('导航到第' + pageNumber + '页失败:', error);
      throw error;
    }
  }

  async navigateSearchPageByClick() {
    const nextLink = document.querySelector('#search-results > nav > div > ul > li.next-page > a');
    if (!nextLink) {
      throw new Error('未找到下一页链接');
    }
    if (nextLink.closest('li').classList.contains('disabled')) {
      throw new Error('已到最后一页');
    }
    console.log('点击下一页链接...');
    nextLink.click();
  }

  async waitForPageLoad() {
    const base = this.isSearchPage() ? 1200 : 800;
    const delay = base + Math.floor(Math.random() * 1000); // 随机偏移
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
