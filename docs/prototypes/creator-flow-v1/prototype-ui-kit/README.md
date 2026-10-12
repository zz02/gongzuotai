# Prototype UI Kit

这是一套给 HTML 原型交互项目复用的轻量组件库，不依赖 React、Vue、Ant Design、Element Plus 或构建工具。

它参考了你已下载的 Ant Design、Element Plus、Arco Design、TDesign 及移动端组件库的视觉规律，但实现为纯 HTML/CSS/JS，方便后续所有原型项目复用。具体设计来源见 `DESIGN_NOTES.md`。

适用场景：

- PC 后台管理系统原型
- 政务、运营、审批、配置、报表类页面
- 移动 H5 / App 风格原型
- 需要快速统一按钮、筛选区、表格、弹窗、日期选择器的项目

## 目录结构

```text
prototype-ui-kit/
├── dist/
│   ├── prototype-ui.css
│   ├── prototype-ui-components.css
│   └── prototype-ui.js
├── examples/
│   ├── admin.html
│   ├── catalog.html
│   ├── mobile.html
│   ├── parity-components.html
│   ├── specialized.html
│   └── templates.html
├── templates/
│   ├── list-page.html
│   ├── detail-page.html
│   ├── edit-page.html
│   ├── approval-page.html
│   ├── dashboard-page.html
│   ├── config-page.html
│   └── mobile-list-page.html
├── snippets/
│   ├── admin-list-page.html
│   ├── modal.html
│   └── page-shell.html
├── AI_USAGE_PROMPT.md
├── COMPONENT_INVENTORY.md
├── COMPONENT_MAP.md
├── COMPONENT_PARITY.md
├── REFERENCE_SOURCES.md
├── scripts/
│   └── build-parity-report.js
├── components.html
├── create-project.sh
├── DESIGN_NOTES.md
├── VALIDATION.md
└── README.md
```

## 最方便的使用方式

新 HTML 页面只需要这一行：

```html
<script defer src="./prototype-ui-kit/dist/prototype-ui.js"></script>
```

`prototype-ui.js` 会自动加载同目录的 `prototype-ui.css`，同时提供弹窗、抽屉、日期选择、Tab、Toast 等原型交互。

页面 `body` 建议使用：

```html
<body class="pui-page">
```

## 一键创建新项目

在任意目录运行。第二个参数用于选择入口页面模板：

```bash
bash /你的路径/prototype-ui-kit/create-project.sh 新项目名称 list
```

可选模板：`list`、`detail`、`edit`、`approval`、`dashboard`、`config`、`mobile`。不填写时默认使用 `list`。

脚本会创建：

```text
新项目名称/
├── index.html
├── list-page.html
├── detail-page.html
├── edit-page.html
├── approval-page.html
├── dashboard-page.html
├── config-page.html
├── mobile-list-page.html
├── README.md
└── prototype-ui-kit/
```

生成后直接打开 `index.html` 即可查看原型，七类模板会同时复制到项目根目录，页面之间可以直接跳转。

## 兼容使用方式

把 `prototype-ui-kit/` 整个目录复制到新原型项目根目录，然后在 HTML 里引入：

```html
<link rel="stylesheet" href="./prototype-ui-kit/dist/prototype-ui.css">
<script defer src="./prototype-ui-kit/dist/prototype-ui.js"></script>
```

如果页面在子目录里，需要按实际目录调整相对路径，例如：

```html
<link rel="stylesheet" href="../prototype-ui-kit/dist/prototype-ui.css">
<script defer src="../prototype-ui-kit/dist/prototype-ui.js"></script>
```

如果希望 AI 以后生成 HTML 原型时自动调用这套组件库，把 `AI_USAGE_PROMPT.md` 里的规则放到项目提示、AGENTS.md 或本次需求开头。

## 常用组件

当前覆盖 100+ 项归一化原型能力，并对本机 12 套依赖的 1034 个组件目录逐项登记。归一化状态见 `COMPONENT_INVENTORY.md`，逐包对齐结果见 `COMPONENT_PARITY.md`：

- 页面骨架：后台布局、侧边栏、顶部栏、内容区、移动端容器
- 基础操作：按钮、图标按钮、链接、标签、分段控件
- 表单输入：输入框、数字输入、验证码、自动完成、级联、树、穿梭框、颜色、评分、上传
- 日期时间：日期、日期范围、时间、时间范围、日期时间、日期时间范围、日历
- 数据展示：筛选区、统计卡、表格、分页、详情描述、列表
- 弹层反馈：弹窗、抽屉、Toast、Notification、Alert、Popover、Popconfirm、Tooltip、Tour
- 流程状态：Tab、步骤条、进度条、时间线
- 移动端：单元格、宫格、通知栏、步进器、滑动操作、动作面板、选择器、数字键盘、底部导航
- 专项组件：评论、索引列表、瀑布流、签名、媒体、价格、优惠券、二维码、水印
- 逐项补充：滚动区、虚拟列表、头像裁剪、图片预览、弹幕、边框动效、圆形进度、拖拽排序、浮动面板、地址和联系人

完整样式预览见 `components.html`，页面模板入口见 `examples/templates.html`。

## 页面模板

| 模板 | 适用场景 | 已包含的完整状态 |
|---|---|---|
| 列表页 | 查询、批量处理、分页 | 高级筛选、全选、新建弹窗、导出反馈 |
| 详情页 | 对象详情、办理记录 | Tab、处理进度、时限提醒、转派抽屉 |
| 编辑页 | 新建与编辑业务对象 | 分组表单、错误校验、附件上传、草稿保存 |
| 审批页 | 审核、退回、确认 | 流程步骤、材料核验、审批意见、二次确认 |
| 看板页 | 运营数据与趋势 | 指标、趋势、排行、分类分析、异常提醒 |
| 配置页 | 规则、通知、权限 | 分类导航、开关状态、角色弹窗、保存反馈 |
| 移动端列表页 | App、H5、小程序列表 | 搜索、横向筛选、业务卡片、筛选抽屉、底部导航 |

组件名称的快速对应关系见 `COMPONENT_MAP.md`；12 套本机依赖的原始组件目录见 `REFERENCE_SOURCES.md`；归一化能力见 `COMPONENT_INVENTORY.md`；每个本机源组件的最终去向见 `COMPONENT_PARITY.md`。

重新扫描参考源：

```bash
node prototype-ui-kit/scripts/build-parity-report.js
```

命令返回 `missing: 0` 才能宣称逐项对齐完成。

### 按钮

```html
<button class="pui-btn">重置</button>
<button class="pui-btn pui-btn-primary">查询</button>
<button class="pui-btn pui-btn-danger">删除</button>
```

按钮文案建议控制在 2-6 个汉字，例如：查询、重置、导出、新建、删除、保存、取消、确定。

### 筛选区

```html
<form class="pui-filter">
  <label class="pui-field">
    <span class="pui-label">对象名称</span>
    <input class="pui-control" placeholder="请输入名称">
  </label>
  <button class="pui-btn pui-btn-primary" type="button">查询</button>
  <button class="pui-btn" type="button">重置</button>
</form>
```

### 表格

```html
<div class="pui-table-wrap">
  <table class="pui-table">
    <thead>
      <tr><th>对象名称</th><th>创建日期</th><th class="is-center">状态</th><th class="is-action">操作</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>示例对象</td>
        <td>2026-07-01</td>
        <td class="is-center"><span class="pui-tag pui-tag-success">正常</span></td>
        <td class="is-action"><a class="pui-link">查看</a></td>
      </tr>
    </tbody>
  </table>
</div>
```

### 弹窗

```html
<button class="pui-btn pui-btn-primary" data-pui-modal-open="demoModal">打开弹窗</button>
```

弹窗完整结构见 `snippets/modal.html`。

### 日期时间选择器

PUI 提供 `DatePicker`、`DateRangePicker`、`TimePicker`、`TimeRangePicker`、`DateTimePicker`、`DateTimeRangePicker` 的统一外观和选择交互，示例见 `examples/catalog.html#datetime`。它们用于高保真原型表达，不承担生产级日期合法性、时区、国际化或禁用日期计算。

## 设计系统结构

`prototype-ui.css` 使用三层设计令牌：

1. 基础令牌：颜色、字号、间距、圆角、阴影、动效时长。
2. 语义令牌：主色、成功、预警、危险、页面、表面、边框、文本。
3. 组件令牌：按钮、输入框、表格、面板、导航和遮罩。

业务页面只使用组件类名和必要的数值变量，不重新定义按钮、表格、弹窗等控件样式。

## 设计规范

- 日期：`YYYY-MM-DD`
- 日期时间：`YYYY-MM-DD HH:mm`
- 时间范围：`开始时间 ~ 结束时间`
- 字段名称：优先 4-8 个汉字
- 按钮文案：优先 2-6 个汉字
- 状态文案：全项目统一，例如正常 / 预警 / 停用

## 组件命名规则

统一使用 `pui-` 前缀，避免和不同项目里的业务类名冲突。

不要在新项目里继续使用旧项目兼容类名，例如 `.btn`、`.module-search`、`.module-field`。这些只适合旧原型迁移。

## 推荐工作流

1. 新建原型项目。
2. 复制 `prototype-ui-kit/`。
3. 从 `templates/` 选择最接近的完整业务页面。
4. 从 `snippets/` 复制局部组件。
5. 只改业务字段和页面文案，不改组件结构。
6. 每个项目确定一种状态命名，不要同义词混用。

## 验收清单

- 按钮、输入框、表格、弹窗、日期选择器是否都来自 `pui-*`。
- 筛选区是否统一使用 `pui-filter`。
- 表格是否统一使用 `pui-table`。
- 弹窗是否统一使用 `pui-modal-*`。
- 移动端是否没有页面级横向溢出。
- 控制台是否没有 JavaScript 报错。
- 弹窗和抽屉是否支持遮罩、关闭按钮与 `Esc` 关闭。
- 保存、提交、导出、筛选等操作是否有明确反馈。
- 页面在 375px、768px、1440px 宽度下是否保持可读和可操作。
