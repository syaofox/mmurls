// V2PH网站演员信息提取器
class V2PHActorExtractor {
  async extractActorInfo() {
    try {
      console.log('🎭 开始从V2PH提取演员信息...');
      
      // 查找主要容器 - 根据实际DOM结构
      const mainContainer = document.querySelector('body > div > div.card.mt-2.px-2');
      if (!mainContainer) {
        console.warn('⚠️ 未找到主要容器，尝试备用选择器');
        // 备用选择器
        const altSelectors = [
          'div.card.mt-2.px-2',
          '.card.mt-2.px-2',
          'div[class*="card"][class*="mt-2"]',
          '.card-body'
        ];
        
        for (let selector of altSelectors) {
          const container = document.querySelector(selector);
          if (container) {
            console.log(`✅ 使用备用选择器找到容器: ${selector}`);
            return await this.extractFromContainer(container);
          }
        }
        
        console.error('❌ 无法找到演员信息容器');
        return null;
      }
      
      console.log('✅ 找到主要容器');
      return await this.extractFromContainer(mainContainer);
      
    } catch (error) {
      console.error('❌ 提取演员信息时出错:', error);
      return null;
    }
  }

  // 从容器中提取信息的辅助函数
  async extractFromContainer(container) {
    try {
      // 提取演员名称
      let actorName = '';
      const h1Element = container.querySelector('h1.h5');
      if (h1Element) {
        actorName = h1Element.textContent.trim();
        console.log('✅ 提取到演员名称:', actorName);
      }
      
      if (!actorName) {
        const nameSelectors = [
          'h1', '.actor-name', '.profile-name'
        ];
        for (let selector of nameSelectors) {
          const elem = container.querySelector(selector);
          if (elem && elem.textContent.trim()) {
            actorName = elem.textContent.trim();
            break;
          }
        }
      }
      
      if (!actorName) {
        actorName = document.title.split(' - ')[0] || document.title;
        console.log('⚠️ 从页面标题提取名称:', actorName);
      }
      
      // 提取演员图片
      let actorImage = null;
      let base64Image = '';
      
      const actorCoverImg = container.querySelector('.actor-cover img');
      if (actorCoverImg && actorCoverImg.src) {
        actorImage = actorCoverImg;
        console.log('✅ 找到演员图片:', actorImage.src);
      }
      
      if (!actorImage) {
        const imgSelectors = [
          '.actor-cover img',
          '.img-fluid.rounded.img-thumbnail',
          'img[alt*="' + actorName.split(' ')[0] + '"]',
          'img[src*="cdn.v2ph.com/actor"]'
        ];
        
        for (let selector of imgSelectors) {
          const img = container.querySelector(selector);
          if (img && img.src && !img.src.includes('data:')) {
            actorImage = img;
            console.log('✅ 通过备用选择器找到图片:', selector);
            break;
          }
        }
      }
      
      if (actorImage) {
        // 使用统一的强大图片转换方法
        base64Image = await convertImageToBase64(actorImage);
        
        if (base64Image) {
          console.log('✅ 图片转换成功');
        } else {
          console.warn('⚠️ 图片转换失败，保存图片URL');
          // 如果转换失败，保存图片URL作为备用
          base64Image = actorImage.src;
        }
      } else {
        console.warn('⚠️ 未找到演员图片');
      }
      
      // 提取详细信息 - 使用精确的选择器
      const info = {};
      
      // 查找所有dt元素
      const dtElements = container.querySelectorAll('dt');
      console.log(`📊 找到 ${dtElements.length} 个信息字段`);
      
      for (let dt of dtElements) {
        const label = dt.textContent.trim();
        const dd = dt.nextElementSibling;
        
        if (dd && dd.tagName === 'DD') {
          const value = dd.textContent.trim();
          console.log(`📝 ${label}: ${value}`);
          
          // 根据标签提取对应信息
          switch (label) {
            case '生日':
              info.birthday = value;
              break;
            case '身高':
              info.height = value;
              break;
            case '三围':
              info.measurements = value.replace(/\s+/g, ' '); // 清理多余空格
              break;
            case '来自':
              info.hometown = value;
              break;
            case '星座':
              info.zodiac = value;
              break;
            case '血型':
              info.bloodType = value;
              break;
            case '职业':
              info.profession = value;
              break;
            case '兴趣':
              info.interests = value;
              break;
            default:
              console.log(`⚠️ 未识别的标签: ${label}`);
          }
        }
      }
      
      // 提取描述信息
      let description = '';
      
      // 方法1: 查找.col-md-9中的文本节点
      const colMd9 = container.querySelector('.col-md-9');
      if (colMd9) {
        const textNodes = Array.from(colMd9.childNodes).filter(node => 
          node.nodeType === Node.TEXT_NODE && 
          node.textContent.trim().length > 20
        );
        
        if (textNodes.length > 0) {
          description = textNodes[textNodes.length - 1].textContent.trim();
          console.log('✅ 提取到描述:', description.substring(0, 50) + '...');
        }
      }
      
      // 方法2: 如果没找到，查找.card-body中的文本节点
      if (!description) {
        const cardBody = container.querySelector('.card-body');
        if (cardBody) {
          const textNodes = Array.from(cardBody.childNodes).filter(node => 
            node.nodeType === Node.TEXT_NODE && 
            node.textContent.trim().length > 50
          );
          
          if (textNodes.length > 0) {
            description = textNodes[0].textContent.trim();
            console.log('✅ 通过备用方法提取到描述:', description.substring(0, 50) + '...');
          }
        }
      }
      
      // 方法3: 如果还是没找到，使用文本内容搜索
      if (!description) {
        const allText = container.textContent;
        const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 20);
        
        // 查找包含"别名"或"日本"或"出道"的文本
        for (let line of lines) {
          if (line.includes('别名') || line.includes('日本') || line.includes('出道')) {
            description = line;
            console.log('✅ 通过文本搜索提取到描述:', description.substring(0, 50) + '...');
            break;
          }
        }
      }
      
      const result = {
        name: actorName,
        image: base64Image,
        info: info,
        description: description,
        url: window.location.href
      };
      
      console.log('🎉 V2PH信息提取完成:', {
        name: actorName,
        image: base64Image ? '已获取' : '未获取',
        infoKeys: Object.keys(info),
        description: description ? '已获取' : '未获取'
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ 从容器提取信息时出错:', error);
      return null;
    }
  }
}
