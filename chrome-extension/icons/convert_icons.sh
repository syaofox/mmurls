#!/bin/bash

# SVG到PNG图标转换脚本 (Shell版本)
# 用于将SVG图标转换为Chrome插件所需的PNG格式

set -e  # 遇到错误时退出

echo "🔧 V2PH插件图标转换工具"
echo "=================================================="

# 检查SVG文件是否存在
SVG_FILE="icon.svg"
if [ ! -f "$SVG_FILE" ]; then
    echo "❌ 找不到SVG文件: $SVG_FILE"
    echo "请确保icon.svg文件存在于当前目录"
    exit 1
fi

echo "🎨 开始转换SVG图标..."
echo "📁 源文件: $SVG_FILE"
echo "--------------------------------------------------"

# 检查是否有必要的工具
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ 找不到工具: $1"
        return 1
    fi
    return 0
}

# Chrome插件所需的图标尺寸
declare -a SIZES=("16:icon16.png" "48:icon48.png" "128:icon128.png")

success_count=0
total_count=${#SIZES[@]}

# 尝试使用不同的工具进行转换
convert_with_tool() {
    local size=$1
    local output=$2
    local tool=$3
    
    case $tool in
        "inkscape")
            if check_tool "inkscape"; then
                inkscape "$SVG_FILE" -w "$size" -h "$size" -o "$output" 2>/dev/null
                return $?
            fi
            ;;
        "convert")
            if check_tool "convert"; then
                convert "$SVG_FILE" -resize "${size}x${size}" "$output" 2>/dev/null
                return $?
            fi
            ;;
        "rsvg-convert")
            if check_tool "rsvg-convert"; then
                rsvg-convert -w "$size" -h "$size" "$SVG_FILE" -o "$output" 2>/dev/null
                return $?
            fi
            ;;
    esac
    return 1
}

# 转换每个尺寸的图标
for size_info in "${SIZES[@]}"; do
    IFS=':' read -r size output <<< "$size_info"
    
    echo "🔄 转换 $output (${size}x${size})..."
    
    # 尝试不同的转换工具
    converted=false
    for tool in "inkscape" "convert" "rsvg-convert"; do
        if convert_with_tool "$size" "$output" "$tool"; then
            echo "✅ 成功转换: $output (${size}x${size}) - 使用 $tool"
            success_count=$((success_count + 1))
            converted=true
            break
        fi
    done
    
    if [ "$converted" = false ]; then
        echo "❌ 转换失败: $output"
        echo "   请安装以下工具之一:"
        echo "   - Inkscape: apt-get install inkscape (Ubuntu/Debian)"
        echo "   - ImageMagick: apt-get install imagemagick (Ubuntu/Debian)"
        echo "   - librsvg: apt-get install librsvg2-bin (Ubuntu/Debian)"
        echo "   - 或使用在线转换工具"
    fi
done

echo "--------------------------------------------------"
echo "📊 转换完成: $success_count/$total_count 个文件成功"

if [ $success_count -eq $total_count ]; then
    echo "🎉 所有图标转换成功！"
    echo ""
    echo "📋 生成的文件:"
    for size_info in "${SIZES[@]}"; do
        IFS=':' read -r size output <<< "$size_info"
        if [ -f "$output" ]; then
            file_size=$(stat -c%s "$output" 2>/dev/null || stat -f%z "$output" 2>/dev/null || echo "unknown")
            echo "   - $output ($file_size bytes)"
        fi
    done
    exit 0
else
    echo "⚠️  部分图标转换失败，请检查错误信息"
    exit 1
fi
