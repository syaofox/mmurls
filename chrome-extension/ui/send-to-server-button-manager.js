// 发送到下载服务器按钮 - 点击弹出选择菜单
class SendToServerButtonManager {
  constructor() {
    this.button = null;
    this.menu = null;
    this.init();
  }

  init() {
    this.createButton();
    this.createMenu();
    console.log('✅ 发送到服务器按钮已初始化');
  }

  createButton() {
    const existingBtn = document.getElementById('send-to-server-btn');
    if (existingBtn) existingBtn.remove();

    const button = document.createElement('button');
    button.id = 'send-to-server-btn';
    button.innerHTML = '📤';
    button.title = '发送到下载服务器';
    button.className = 'send-to-server-btn';

    button.style.cssText = `
      position: fixed;
      bottom: 128px;
      right: 24px;
      z-index: 10001;
      width: 44px;
      height: 44px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 152, 0, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.4);
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    button.addEventListener('mouseenter', () => {
      if (!button.disabled) {
        button.style.background = 'rgba(245, 124, 0, 0.95)';
        button.style.transform = 'scale(1.08)';
        button.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.5)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.disabled) {
        button.style.background = 'rgba(255, 152, 0, 0.9)';
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 2px 8px rgba(255, 152, 0, 0.4)';
      }
    });

    document.body.appendChild(button);
    this.button = button;
  }

  createMenu() {
    const existingMenu = document.getElementById('send-to-server-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.id = 'send-to-server-menu';
    menu.className = 'send-to-server-menu';
    menu.style.cssText = `
      display: none;
      position: fixed;
      bottom: 180px;
      right: 24px;
      z-index: 10002;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 8px 0;
      min-width: 200px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    `;

    const opt1 = document.createElement('button');
    opt1.textContent = '1. 发送当前页到下载服务器';
    opt1.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
      color: #333;
    `;
    opt1.addEventListener('mouseenter', () => { opt1.style.background = '#f5f5f5'; });
    opt1.addEventListener('mouseleave', () => { opt1.style.background = 'none'; });
    opt1.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sendCurrentPage();
      this.hideMenu();
    });

    const opt2 = document.createElement('button');
    opt2.textContent = '2. 发送已获取的相册链接到下载服务器';
    opt2.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;
      color: #333;
    `;
    opt2.addEventListener('mouseenter', () => { opt2.style.background = '#f5f5f5'; });
    opt2.addEventListener('mouseleave', () => { opt2.style.background = 'none'; });
    opt2.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sendAlbumUrls();
      this.hideMenu();
    });

    menu.appendChild(opt1);
    menu.appendChild(opt2);
    document.body.appendChild(menu);
    this.menu = menu;

    this.boundHideMenu = (e) => {
      if (!this.menu?.contains(e.target) && !this.button?.contains(e.target)) {
        this.hideMenu();
      }
    };
    document.addEventListener('click', this.boundHideMenu);
  }

  toggleMenu() {
    if (this.menu.style.display === 'block') {
      this.hideMenu();
    } else {
      this.menu.style.display = 'block';
    }
  }

  hideMenu() {
    if (this.menu) this.menu.style.display = 'none';
  }

  async sendCurrentPage() {
    const url = window.location.href;
    Toast.info('正在发送当前页面...');
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'sendToDownloadServer',
        type: 'currentPage',
        url
      });
      if (result?.success) {
        Toast.success('当前页面已发送到下载服务器');
      } else {
        Toast.error(result?.error || '发送失败');
      }
    } catch (error) {
      console.error('发送失败:', error);
      Toast.error('发送失败: ' + (error?.message || '未知错误'));
    }
  }

  async sendAlbumUrls() {
    try {
      const result = await chrome.storage.local.get(['albumUrls']);
      const urls = result.albumUrls || [];
      if (urls.length === 0) {
        Toast.error('暂无已获取的相册链接，请先使用相册URL获取器');
        return;
      }
      Toast.info(`正在发送 ${urls.length} 个相册到服务器...`);
      const response = await chrome.runtime.sendMessage({
        action: 'sendToDownloadServer',
        type: 'albumUrls',
        urls
      });
      if (response?.success) {
        Toast.success(`已发送 ${urls.length} 个相册到下载服务器`);
      } else {
        Toast.error(response?.error || '发送失败');
      }
    } catch (error) {
      console.error('发送失败:', error);
      Toast.error('发送失败: ' + (error?.message || '未知错误'));
    }
  }

  cleanup() {
    this.hideMenu();
    if (this.boundHideMenu) {
      document.removeEventListener('click', this.boundHideMenu);
    }
    const btn = document.getElementById('send-to-server-btn');
    if (btn && document.body.contains(btn)) document.body.removeChild(btn);
    const menu = document.getElementById('send-to-server-menu');
    if (menu && document.body.contains(menu)) document.body.removeChild(menu);
  }
}
