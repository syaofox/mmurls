// 图片处理模块 - 专门处理图片转base64的成功方法

class ImageProcessor {
    constructor() {
        this.timeout = 10000; // 10秒超时
    }

    // 主要的图片转换方法 - 智能路由到对应的方法
    async convertToBase64(img) {
        console.log('🖼️ 开始处理图片:', img.src);
        
        // 检查图片状态
        if (!this.isImageReady(img)) {
            console.warn('⚠️ 图片尚未准备就绪');
            return '';
        }

        // 优先尝试直接使用页面已加载的图片（零网络请求）
        const directResult = await this.tryDirectCanvasFromExistingImg(img);
        if (directResult) {
            console.log('✅ 使用页面已加载图片，零请求完成');
            return directResult;
        }

        // 检测网站类型并选择对应的方法
        const siteType = this.detectSiteType();
        console.log(`🌐 检测到网站类型: ${siteType}`);
        
        try {
            let result;
            
            if (siteType === 'v2ph') {
                console.log('🔄 使用V2PH专用方法 (CrossOrigin)...');
                result = await Promise.race([
                    this.crossOriginMethod(img.src),
                    this.createTimeout()
                ]);
            } else if (siteType === 'junmeitu' || siteType === 'meitulu') {
                console.log(`🔄 使用${siteType === 'junmeitu' ? '俊美图' : '美图录'}专用方法 (Background Script)...`);
                result = await Promise.race([
                    this.backgroundScriptMethod(img.src),
                    this.createTimeout()
                ]);
            } else {
                // 未知网站类型，先尝试CrossOrigin方法
                console.log('🔄 未知网站类型，尝试CrossOrigin方法...');
                result = await Promise.race([
                    this.crossOriginMethod(img.src),
                    this.createTimeout()
                ]);
            }
            
            if (result) {
                console.log(`✅ ${siteType} 专用方法成功!`);
                return result;
            }
            
        } catch (error) {
            console.warn(`❌ ${siteType} 专用方法失败:`, error.message);
            
            // 如果专用方法失败，尝试备用方法
            if (siteType === 'v2ph') {
                console.log('🔄 尝试备用方法 (Background Script)...');
                try {
                    const result = await Promise.race([
                        this.backgroundScriptMethod(img.src),
                        this.createTimeout()
                    ]);
                    if (result) {
                        console.log('✅ 备用方法成功!');
                        return result;
                    }
                } catch (e) {
                    console.warn('❌ 备用方法也失败:', e.message);
                }
            } else if (siteType === 'junmeitu' || siteType === 'meitulu') {
                console.log('🔄 尝试备用方法 (CrossOrigin)...');
                try {
                    const result = await Promise.race([
                        this.crossOriginMethod(img.src),
                        this.createTimeout()
                    ]);
                    if (result) {
                        console.log('✅ 备用方法成功!');
                        return result;
                    }
                } catch (e) {
                    console.warn('❌ 备用方法也失败:', e.message);
                }
            }
        }

        console.error('❌ 所有图片转换方法都失败了，返回原始URL');
        return img.src; // 失败后返回原始URL
    }

    // 检测网站类型
    detectSiteType() {
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('v2ph.com/actor/')) {
            return 'v2ph';
        } else if (currentUrl.includes('junmeitu.com/model/')) {
            return 'junmeitu';
        } else if (currentUrl.includes('meitulu.me/t/')) {
            return 'meitulu';
        } else {
            return 'unknown';
        }
    }

    // 检查图片是否准备就绪
    isImageReady(img) {
        return img.complete && 
               img.naturalWidth > 0 && 
               img.naturalHeight > 0;
    }

    // 尝试直接使用页面已加载的img元素绘制到canvas（零网络请求）
    // 若图片跨域且未带CORS，会触发tainted canvas，返回null后走fallback
    tryDirectCanvasFromExistingImg(img) {
        return new Promise((resolve) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataURL);
            } catch (e) {
                // tainted canvas 或其它错误，返回null走fallback
                console.log('🔄 直接绘制失败，使用fallback:', e.message);
                resolve(null);
            }
        });
    }

    // CrossOrigin方法 (V2PH专用方法)
    async crossOriginMethod(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataURL);
                } catch (e) {
                    reject(new Error(`Canvas转换失败: ${e.message}`));
                }
            };
            
            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };
            
            // 直接使用原始URL，允许浏览器从缓存加载
            img.src = imageUrl;
        });
    }

    // Background Script方法 (俊美图专用方法)
    async backgroundScriptMethod(imageUrl) {
        try {
            console.log('🔄 尝试通过background script转换...');
            const response = await chrome.runtime.sendMessage({
                action: 'convertImageToBase64',
                imageUrl: imageUrl
            });
            
            if (response && response.success) {
                console.log('✅ Background script转换成功');
                return response.data;
            } else {
                throw new Error(response ? response.error : 'No response');
            }
        } catch (error) {
            throw new Error(`Background script转换失败: ${error.message}`);
        }
    }


    // 创建超时Promise
    createTimeout() {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('操作超时'));
            }, this.timeout);
        });
    }

    // 获取图片信息
    getImageInfo(img) {
        return {
            src: img.src,
            alt: img.alt,
            width: img.naturalWidth,
            height: img.naturalHeight,
            complete: img.complete,
            crossOrigin: img.crossOrigin
        };
    }

    // 验证base64字符串
    isValidBase64(base64) {
        if (!base64) return false;
        return base64.startsWith('data:image/') && base64.length > 100;
    }
}

// 创建全局实例
window.imageProcessor = new ImageProcessor();
