// YAML格式生成工具
function generateYAMLFormat(urls) {
  const yamlContent = [
    'global_settings:',
    '  download_dir: \'\'',
    '  skip_existing: false',
    '  delay_min: 2.0  # 测试配置：最小延迟2秒',
    '  delay_max: 4.0  # 测试配置：最大延迟4秒',
    '',
    'albums:'
  ];

  urls.forEach(url => {
    yamlContent.push(`  - url: '${url}'`);
  });

  return yamlContent.join('\n');
}
