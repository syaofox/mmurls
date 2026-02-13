// 演员信息提取器 - 协调不同网站的演员信息提取
class ActorInfoExtractor {
  constructor() {
    this.extractors = {
      'v2ph': new V2PHActorExtractor(),
      'junmeitu': new JunMeituActorExtractor(),
      'meitulu': new MeituluActorExtractor()
    };
  }

  // 提取演员信息
  async extractActorInfo() {
    try {
      console.log('🎭 开始提取演员信息...');
      
      // 检查当前网站类型
      const currentUrl = window.location.href;
      
      if (currentUrl.includes('junmeitu.com/model/')) {
        console.log('🌐 检测到俊美图网站，使用俊美图提取逻辑');
        return await this.extractors.junmeitu.extractActorInfo();
      } else if (currentUrl.includes('v2ph.com/actor/')) {
        console.log('🌐 检测到V2PH网站，使用V2PH提取逻辑');
        return await this.extractors.v2ph.extractActorInfo();
      } else if (currentUrl.includes('meitulu.me/t/')) {
        console.log('🌐 检测到美图录网站，使用美图录提取逻辑');
        return await this.extractors.meitulu.extractActorInfo();
      } else {
        console.warn('⚠️ 不支持的网站类型');
        return null;
      }
      
    } catch (error) {
      console.error('❌ 提取演员信息时出错:', error);
      return null;
    }
  }
}
