// 俊美图网站演员信息提取器
class JunMeituActorExtractor {
  async extractActorInfo() {
    try {
      console.log('🎭 开始从俊美图提取演员信息...');
      
      // 提取演员名称 - 使用指定的CSS选择器
      let actorName = '';
      const h1Element = document.querySelector('body > div.main > div.list > div.doujin_album_info.mini > div.album_info > h1');
      if (h1Element) {
        actorName = h1Element.textContent.trim();
        console.log('✅ 提取到演员名称:', actorName);
      }
      
      // 提取演员图片 - 使用指定的CSS选择器
      let actorImage = null;
      let base64Image = '';
      
      const imgElement = document.querySelector('body > div.main > div.list > div.doujin_album_info.mini > div.thumb > img');
      if (imgElement && imgElement.src) {
        actorImage = imgElement;
        console.log('✅ 找到演员图片:', actorImage.src);
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
      
      // 提取详细信息 - 使用指定的CSS选择器
      const info = {};
      const infoElement = document.querySelector('body > div.main > div.list > div.doujin_album_info.mini > div.album_info > div.people-info');
      
      if (infoElement) {
        const infoText = infoElement.textContent;
        console.log('📊 找到信息元素:', infoText);
        
        // 解析信息文本
        const infoItems = infoText.split(/\s+/).filter(item => item.includes('：'));
        
        for (let item of infoItems) {
          const parts = item.split('：');
          if (parts.length === 2) {
            const label = parts[0].trim();
            const value = parts[1].trim();
            console.log(`📝 ${label}: ${value}`);
            
            // 映射到标准字段名
            switch (label) {
              case '性別':
                info.gender = value;
                break;
              case '籍貫':
                info.hometown = value;
                break;
              case '職業':
                info.profession = value;
                break;
              case '生日':
                info.birthday = value;
                break;
              case '血型':
                info.bloodType = value;
                break;
              case '三圍':
                info.measurements = value.replace(/\s+/g, ' '); // 清理多余空格
                break;
              case '罩杯':
                info.cupSize = value;
                break;
              case '身高':
                info.height = value;
                break;
              case '體重':
                info.weight = value;
                break;
            }
          }
        }
      }
      
      // 提取描述信息 - 使用指定的CSS选择器
      let description = '';
      const descElement = document.querySelector('body > div.main > div.list > div.doujin_album_info.mini > div.album_info > div.album_description');
      
      if (descElement) {
        description = descElement.textContent.trim();
        console.log('✅ 提取到描述:', description.substring(0, 50) + '...');
      }
      
      const result = {
        name: actorName,
        image: base64Image,
        info: info,
        description: description,
        url: window.location.href
      };
      
      console.log('🎉 信息提取完成:', {
        name: actorName,
        image: base64Image ? '已获取' : '未获取',
        infoKeys: Object.keys(info),
        description: description ? '已获取' : '未获取'
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ 从俊美图提取信息时出错:', error);
      return null;
    }
  }
}
