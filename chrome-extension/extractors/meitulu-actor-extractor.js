// 美图录(meitulu.me)网站演员/模特信息提取器
// 模特页格式: /t/xxx/
class MeituluActorExtractor {
  async extractActorInfo() {
    try {
      console.log('🎭 开始从美图录提取模特信息...');

      const block = document.querySelector('.my-block-light');
      if (!block) {
        console.warn('⚠️ 未找到模特信息区域');
        return null;
      }

      // 提取名称 - h5 格式: "吉木梨纱|吉木りさ Risa Yoshiki - 吉木梨纱图片_超高清..."
      let actorName = '';
      const h5Element = block.querySelector('h5');
      if (h5Element) {
        const fullText = h5Element.textContent.trim();
        actorName = fullText.includes(' - ') ? fullText.split(' - ')[0].trim() : fullText;
        console.log('✅ 提取到模特名称:', actorName);
      }

      // 提取图片
      let base64Image = '';
      const imgElement = block.querySelector('img[src*="static/img/model"]');
      if (imgElement && imgElement.src) {
        base64Image = await convertImageToBase64(imgElement);
        if (!base64Image || !base64Image.startsWith('data:image/')) {
          base64Image = imgElement.src;
        }
      }

      // 解析资料段落 - 格式: "中文名：xxx；日本名字：xxx；出生日期：xxx；职业：xxx；..."
      const info = {};
      const pElement = block.querySelector('p');
      if (pElement) {
        const text = pElement.textContent;
        // 按 ； 或 \n 分割，提取 "标签：值" 对
        const items = text.split(/[；\n]+/).filter(s => s.trim().includes('：'));
        for (const item of items) {
          const idx = item.indexOf('：');
          if (idx > 0) {
            const label = item.substring(0, idx).trim();
            const value = item.substring(idx + 1).trim();
            if (value) {
              switch (label) {
                case '中文名':
                  info.nameChinese = value;
                  break;
                case '日本名字':
                  info.nameJapanese = value;
                  break;
                case '英文名字':
                  info.nameEnglish = value;
                  break;
                case '出生日期':
                  info.birthday = value;
                  break;
                case '所属事务所':
                  info.agency = value;
                  break;
                case '职业':
                  info.profession = value;
                  break;
                default:
                  if (label.includes('写真风格')) {
                    info.photoStyle = value;
                  }
                  break;
              }
            }
          }
        }
      }

      // 描述：写真风格或完整资料
      let description = info.photoStyle || '';
      if (pElement && pElement.textContent.trim()) {
        const full = pElement.textContent.trim();
        if (full && !description) description = full;
      }

      const result = {
        name: actorName,
        image: base64Image,
        info: info,
        description: description,
        url: window.location.href
      };

      console.log('🎉 美图录信息提取完成:', {
        name: actorName,
        image: base64Image ? '已获取' : '未获取',
        infoKeys: Object.keys(info)
      });

      return result;
    } catch (error) {
      console.error('❌ 从美图录提取信息时出错:', error);
      return null;
    }
  }
}
