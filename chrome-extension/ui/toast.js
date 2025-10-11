// Toast提示组件 - 统一的用户提示界面
class Toast {
  static show(message, type = 'success') {
    // 移除已存在的toast
    const existingToast = document.querySelector('.mmurls-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = 'mmurls-toast';
    
    // 设置样式
    let backgroundColor = '#4CAF50'; // 默认成功绿色
    if (type === 'error') backgroundColor = '#f44336';
    if (type === 'info') backgroundColor = '#2196F3';
    if (type === 'warning') backgroundColor = '#ff9800';
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${backgroundColor};
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  static success(message) {
    this.show(message, 'success');
  }

  static error(message) {
    this.show(message, 'error');
  }

  static info(message) {
    this.show(message, 'info');
  }

  static warning(message) {
    this.show(message, 'warning');
  }
}
