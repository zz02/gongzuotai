#!/usr/bin/env bash
set -euo pipefail

project_name="${1:-html-prototype}"
template_name="${2:-list}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target_dir="$(pwd)/$project_name"

if [ "$project_name" = "-h" ] || [ "$project_name" = "--help" ]; then
  echo "用法：bash create-project.sh 项目名称 [list|detail|edit|approval|dashboard|config|mobile]"
  exit 0
fi

case "$template_name" in
  list|列表) template_file="list-page.html" ;;
  detail|详情) template_file="detail-page.html" ;;
  edit|编辑) template_file="edit-page.html" ;;
  approval|审批) template_file="approval-page.html" ;;
  dashboard|看板) template_file="dashboard-page.html" ;;
  config|配置) template_file="config-page.html" ;;
  mobile|移动端) template_file="mobile-list-page.html" ;;
  -h|--help)
    echo "用法：bash create-project.sh 项目名称 [list|detail|edit|approval|dashboard|config|mobile]"
    exit 0
    ;;
  *)
    echo "未知模板：$template_name" >&2
    echo "可选模板：list、detail、edit、approval、dashboard、config、mobile" >&2
    exit 1
    ;;
esac

if [ -e "$target_dir" ]; then
  echo "目录已存在：$target_dir" >&2
  exit 1
fi

mkdir -p "$target_dir"
cp -R "$script_dir" "$target_dir/prototype-ui-kit"

for source_file in "$script_dir"/templates/*.html; do
  target_file="$target_dir/$(basename "$source_file")"
  sed 's#../dist/#./prototype-ui-kit/dist/#g' "$source_file" > "$target_file"
done

cp "$target_dir/$template_file" "$target_dir/index.html"

cat > "$target_dir/README.md" <<EOF
# $project_name

这是一个使用 Prototype UI Kit 创建的 HTML 原型项目。

## 打开方式

直接打开 \`index.html\` 即可查看。

## 组件库调用

页面只需要引入：

\`\`\`html
<script defer src="./prototype-ui-kit/dist/prototype-ui.js"></script>
\`\`\`

\`prototype-ui.js\` 会自动加载同目录的 \`prototype-ui.css\`。

## 生成页面规则

后续新增页面时，优先复制项目根目录中的页面模板，并使用 \`pui-*\` 组件类名。

当前入口模板：\`$template_name\`
EOF

echo "已创建：$target_dir"
echo "入口文件：$target_dir/index.html"
echo "入口模板：$template_file"
