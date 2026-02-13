// 按钮状态管理组件 - 管理页面上的功能按钮
class ButtonManager {
  constructor() {
    this.buttons = new Map();
  }

  // 创建或获取按钮
  createButton(id, text, className = 'album-extractor-btn') {
    // 移除已存在的按钮
    const existingBtn = document.getElementById(id);
    if (existingBtn) {
      existingBtn.remove();
    }

    // 创建按钮 - 圆形图标形式
    const button = document.createElement('button');
    button.id = id;
    button.innerHTML = '📁';
    button.title = text;
    button.className = className;
    button.disabled = false;
    
    // 圆形图标样式，减少遮挡
    button.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      width: 44px;
      height: 44px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 123, 255, 0.9);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.4);
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // 插入到页面
    const targetElement = document.querySelector('body');
    if (targetElement) {
      targetElement.appendChild(button);
    }

    // 注册按钮
    this.buttons.set(id, button);
    return button;
  }

  // 更新按钮状态
  updateButton(id, options = {}) {
    const button = this.buttons.get(id);
    if (!button) return;

    const {
      text,
      disabled,
      className,
      extracting = false
    } = options;

    if (text !== undefined) {
      button.title = text;
    }
    if (extracting !== undefined) {
      button.innerHTML = extracting ? '⏳' : '📁';
    }

    if (disabled !== undefined) {
      button.disabled = disabled;
    }

    if (className !== undefined) {
      button.className = className;
    }

    // 处理提取状态的特殊样式
    if (extracting) {
      button.style.background = 'rgba(40, 167, 69, 0.9)';
      button.style.animation = 'mmurls-pulse 2s infinite';
    } else {
      button.style.background = 'rgba(0, 123, 255, 0.9)';
      button.style.animation = 'none';
    }
  }

  // 添加点击事件监听器
  addClickListener(id, callback) {
    const button = this.buttons.get(id);
    if (button) {
      button.addEventListener('click', callback);
    }
  }

  // 移除按钮
  removeButton(id) {
    const button = this.buttons.get(id);
    if (button && document.body.contains(button)) {
      document.body.removeChild(button);
    }
    this.buttons.delete(id);
  }

  // 获取按钮元素
  getButton(id) {
    return this.buttons.get(id);
  }

  // 清理所有按钮
  cleanup() {
    this.buttons.forEach((button, id) => {
      this.removeButton(id);
    });
  }
}
