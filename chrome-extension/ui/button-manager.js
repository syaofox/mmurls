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

    // 创建按钮
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.className = className;
    button.disabled = false;
    
    // 添加样式
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      padding: 12px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
      transition: all 0.3s ease;
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
      button.textContent = text;
    }

    if (disabled !== undefined) {
      button.disabled = disabled;
    }

    if (className !== undefined) {
      button.className = className;
    }

    // 处理提取状态的特殊样式
    if (extracting) {
      button.style.background = '#28a745';
      button.style.animation = 'pulse 2s infinite';
    } else {
      button.style.background = '#007bff';
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
