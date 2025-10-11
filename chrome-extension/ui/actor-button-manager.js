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
    return url.includes('/actor/') || url.includes('/model/');
  }

  // 创建演员信息提取按钮
  createButton() {
    // 移除已存在的按钮
    const existingBtn = document.getElementById('actor-info-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    // 创建按钮
    const button = document.createElement('button');
    button.id = 'actor-info-btn';
    button.textContent = '🎭 获取演员信息';
    button.className = 'actor-info-btn';
    
    // 设置样式 - 与相册按钮区分，使用紫色系
    button.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      z-index: 10000;
      padding: 12px 20px;
      background: #9c27b0;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // 添加悬停效果
    button.addEventListener('mouseenter', () => {
      if (!button.disabled) {
        button.style.background = '#7b1fa2';
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 16px rgba(156, 39, 176, 0.4)';
      }
    });

    button.addEventListener('mouseleave', () => {
      if (!button.disabled) {
        button.style.background = '#9c27b0';
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.3)';
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
      this.button.textContent = '⏳ 提取中...';
      this.button.disabled = true;
      this.button.style.background = '#4caf50';
      this.button.style.animation = 'pulse 2s infinite';
    } else {
      this.button.textContent = '🎭 获取演员信息';
      this.button.disabled = false;
      this.button.style.background = '#9c27b0';
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
