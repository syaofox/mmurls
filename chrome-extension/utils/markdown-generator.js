// Markdown生成工具 - 统一生成演员信息的Markdown格式
class MarkdownGenerator {
  // 生成演员信息的Markdown格式
  static generateActorMarkdown(data) {
    if (!data) return '';
    
    let markdown = '';
    
    // 添加图片（如果有）
    if (data.image) {
      if (data.image.startsWith('data:image/')) {
        // Base64格式的图片
        markdown += `<img alt="" src="${data.image}" />\n\n`;
      } else if (data.image.startsWith('http')) {
        // URL格式的图片
        markdown += `![演员头像](${data.image})\n\n`;
      }
    }
    
    // 添加演员名称
    markdown += `**${data.name}**\n`;
    markdown += '---\n\n';
    
    // 添加个人信息
    const info = data.info || {};
    if (info.nameChinese) markdown += `- 中文名 ${info.nameChinese}\n`;
    if (info.nameJapanese) markdown += `- 日本名 ${info.nameJapanese}\n`;
    if (info.nameEnglish) markdown += `- 英文名 ${info.nameEnglish}\n`;
    if (info.agency) markdown += `- 事务所 ${info.agency}\n`;
    if (info.gender) markdown += `- 性别 ${info.gender}\n`;
    if (info.hometown) markdown += `- 籍贯 ${info.hometown}\n`;
    if (info.profession) markdown += `- 职业 ${info.profession}\n`;
    if (info.birthday) markdown += `- 生日 ${info.birthday}\n`;
    if (info.bloodType) markdown += `- 血型 ${info.bloodType}\n`;
    if (info.measurements) markdown += `- 三围 ${info.measurements}\n`;
    if (info.cupSize) markdown += `- 罩杯 ${info.cupSize}\n`;
    if (info.height) markdown += `- 身高 ${info.height}\n`;
    if (info.weight) markdown += `- 体重 ${info.weight}\n`;
    if (info.zodiac) markdown += `- 星座 ${info.zodiac}\n`;
    if (info.interests) markdown += `- 兴趣 ${info.interests}\n`;
    if (info.photoStyle) markdown += `- 写真风格 ${info.photoStyle}\n`;
    
    // 添加分隔线
    markdown += '\n---\n';
    
    // 添加描述
    if (data.description) {
      markdown += data.description + '\n';
    }
    
    return markdown;
  }

  // 生成文件名（清理特殊字符）
  static generateActorFilename(actorName) {
    const sanitizeFilename = (name) => {
      let sanitized = name.replace(/[\\/:\*\?"<>\|]/g, '_');
      sanitized = sanitized.trim().replace(/_+/g, '_');
      return sanitized || 'actor';
    };
    
    const sanitizedName = sanitizeFilename(actorName);
    return `${sanitizedName}_info.md`;
  }
}
