// 演员信息按钮管理器 - 专门管理演员信息提取的悬浮按钮
class ActorButtonManager {
  constructor() {
    this.button = null;
    this.isExtracting = false;
    this.init();
  }

  init() {
    // 检查当前页面是否为演员详情页
    if (this.isActorPage()) {
      this.createButton();
      console.log('🎭 演员信息按钮已初始化');
    }
  }

  // 检查是否为演员详情页
  isActorPage() {
    const url = window.location.href;
    return url.includes('/actor/') || url.includes('/model/') || url.includes('meitulu.me/t/');
  }

  // 创建演员信息提取按钮
  createButton() {
    // 移除已存在的按钮
    const existingBtn = document.getElementById('actor-info-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    // 创建按钮 - 圆形图标形式
    const button = document.createElement('button');
    button.id = 'actor-info-btn';
    button.innerHTML = '🎭';
    button.title = '获取演员信息';
    button.className = 'actor-info-btn';
    
    // 圆形图标样式，与相册按钮并排于右下角
    button.style.cssText = `
      position: fixed;
      bottom: 76px;
      right: 24px;
      z-index: 10000;
      width: 44px;
      height: 44px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(156, 39, 176, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(156, 39, 176, 0.4);
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // 添加悬停效果
    button.addEventListener('mouseenter', () => {
      if (!button.disabled) {
        button.style.background = 'rgba(123, 31, 162, 0.95)';
        button.style.transform = 'scale(1.08)';
        button.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.5)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.disabled) {
        button.style.background = 'rgba(156, 39, 176, 0.9)';
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 2px 8px rgba(156, 39, 176, 0.4)';
      }
    });

    // 添加点击事件
    button.addEventListener('click', () => this.handleClick());

    // 插入到页面
    document.body.appendChild(button);
    this.button = button;

    console.log('✅ 演员信息按钮已创建');
  }

  // 处理按钮点击
  async handleClick() {
    if (this.isExtracting) return;

    try {
      this.isExtracting = true;
      this.updateButtonState(true);

      console.log('🎭 开始提取演员信息...');
      Toast.info('正在提取演员信息...');

      // 使用现有的ActorInfoExtractor
      const actorExtractor = new ActorInfoExtractor();
      const actorData = await actorExtractor.extractActorInfo();

      if (!actorData) {
        throw new Error('未能提取到演员信息');
      }

      console.log('✅ 演员信息提取完成:', actorData);

      // 生成Markdown内容
      const markdownContent = MarkdownGenerator.generateActorMarkdown(actorData);
      
      // 生成文件名
      const filename = MarkdownGenerator.generateActorFilename(actorData.name);
      
      // 发送下载请求到background script
      await this.downloadMarkdown(markdownContent, filename);

      Toast.success(`演员信息已保存: ${filename}`);
      console.log('🎉 演员信息下载完成');

    } catch (error) {
      console.error('❌ 提取演员信息失败:', error);
      Toast.error('提取失败: ' + error.message);
    } finally {
      this.isExtracting = false;
      this.updateButtonState(false);
    }
  }


  // 下载Markdown文件
  async downloadMarkdown(content, filename) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'downloadMarkdown',
        content: content,
        filename: filename
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || '下载失败'));
        }
      });
    });
  }

  // 更新按钮状态
  updateButtonState(extracting) {
    if (!this.button) return;

    if (extracting) {
      this.button.innerHTML = '⏳';
      this.button.title = '提取中...';
      this.button.disabled = true;
      this.button.style.background = 'rgba(76, 175, 80, 0.9)';
      this.button.style.animation = 'mmurls-pulse 2s infinite';
    } else {
      this.button.innerHTML = '🎭';
      this.button.title = '获取演员信息';
      this.button.disabled = false;
      this.button.style.background = 'rgba(156, 39, 176, 0.9)';
      this.button.style.animation = 'none';
    }
  }

  // 移除按钮
  removeButton() {
    if (this.button && document.body.contains(this.button)) {
      document.body.removeChild(this.button);
      this.button = null;
    }
  }

  // 清理资源
  cleanup() {
    this.removeButton();
  }
}
