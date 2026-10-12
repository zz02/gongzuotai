# PUI 逐项对齐矩阵

生成日期：2026-07-31

扫描本机组件目录 **1034** 项，其中公开可见或可表达能力 **963** 项，框架内部能力 **71** 项，未映射 **0** 项。

> 验收规则：公开组件必须对应独立 PUI 组件、组合方案、页面模板或明确的原型展示型实现；框架运行时允许标记为内部能力。

## Ant Design 6.5.0

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| _util | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| affix | 吸附 | 独立 | `pui-sticky` |
| alert | 警告提示 | 独立 | `pui-alert` |
| anchor | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| app | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| auto-complete | 自动完成 | 独立 | `pui-autocomplete` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| back-top | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| badge | 徽标 | 独立 | `pui-badge` |
| border-beam | 边框动效 | 独立 | `pui-border-beam` |
| breadcrumb | 面包屑 | 独立 | `pui-breadcrumb` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| card | 卡片 | 独立 | `pui-card` |
| carousel | 轮播 | 独立 | `pui-carousel` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| col | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| color-picker | 颜色选择 | 独立 | `pui-color-picker` |
| config-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| date-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| descriptions | 描述列表 | 独立 | `pui-desc` |
| divider | 分隔线 | 独立 | `pui-divider` |
| drawer | 抽屉 | 独立 | `pui-drawer` |
| dropdown | 下拉菜单 | 独立 | `pui-dropdown` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| flex | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| float-button | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| input-number | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| layout | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| list | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| locale | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| masonry | 瀑布流 | 独立 | `pui-masonry` |
| mentions | 自动完成 | 独立 | `pui-autocomplete` |
| menu | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| message | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| modal | 弹窗 | 独立 | `pui-modal` |
| notification | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| pagination | 分页 | 独立 | `pui-pagination` |
| popconfirm | 确认气泡 | 组合 | `pui-popover` + `pui-popconfirm-actions` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| qr-code | 二维码 | 展示型 | `pui-qrcode` |
| qrcode | 二维码 | 展示型 | `pui-qrcode` |
| radio | 单选 | 独立 | `pui-radio` |
| rate | 评分 | 独立 | `pui-rate` |
| result | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| row | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| segmented | 分段选择 | 独立 | `pui-segmented` |
| select | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| space | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| spin | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| splitter | 分割面板 | 独立 | `pui-splitter` |
| statistic | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| steps | 步骤 | 独立 | `pui-steps` |
| style | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| switch | 开关 | 独立 | `pui-switch` |
| table | 表格 | 独立 | `pui-table` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| theme | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| time-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| timeline | 时间线 | 独立 | `pui-timeline` |
| tooltip | 提示 | 独立 | `pui-tooltip` |
| tour | 引导 | 独立 | `pui-tour` |
| transfer | 穿梭框 | 独立 | `pui-transfer` |
| tree | 树与树选择 | 独立 | `pui-tree` |
| tree-select | 树与树选择 | 独立 | `pui-tree` |
| typography | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| upload | 上传 | 展示型 | `pui-upload` |
| version | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| watermark | 水印 | 独立 | `pui-watermark` |

## Element Plus 2.14.2

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| affix | 吸附 | 独立 | `pui-sticky` |
| alert | 警告提示 | 独立 | `pui-alert` |
| anchor | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| anchor-link | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| aside | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| autocomplete | 自动完成 | 独立 | `pui-autocomplete` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| avatar-group | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| backtop | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| badge | 徽标 | 独立 | `pui-badge` |
| base | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| breadcrumb | 面包屑 | 独立 | `pui-breadcrumb` |
| breadcrumb-item | 面包屑 | 独立 | `pui-breadcrumb` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| button-group | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| card | 卡片 | 独立 | `pui-card` |
| carousel | 轮播 | 独立 | `pui-carousel` |
| carousel-item | 轮播 | 独立 | `pui-carousel` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| cascader-panel | 级联选择 | 独立 | `pui-cascader` |
| check-tag | 复选 | 独立 | `pui-checkbox` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| checkbox-button | 复选 | 独立 | `pui-checkbox` |
| checkbox-group | 复选 | 独立 | `pui-checkbox` |
| col | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| collapse-item | 折叠面板 | 独立 | `pui-collapse` |
| collapse-transition | 折叠面板 | 独立 | `pui-collapse` |
| collection | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| color-picker | 颜色选择 | 独立 | `pui-color-picker` |
| color-picker-panel | 颜色选择 | 独立 | `pui-color-picker` |
| config-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| container | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| countdown | 倒计时 | 独立 | `pui-countdown` |
| date-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| date-picker-panel | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| descriptions | 描述列表 | 独立 | `pui-desc` |
| descriptions-item | 描述列表 | 独立 | `pui-desc` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| drawer | 抽屉 | 独立 | `pui-drawer` |
| dropdown | 下拉菜单 | 独立 | `pui-dropdown` |
| dropdown-item | 下拉菜单 | 独立 | `pui-dropdown` |
| dropdown-menu | 下拉菜单 | 独立 | `pui-dropdown` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| focus-trap | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| footer | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| form-item | 表单 | 独立 | `pui-form` / `pui-field` |
| header | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| icon | 图标 | 独立 | `pui-icon` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| image-viewer | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| infinite-scroll | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| input-number | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| input-otp | 验证码输入 | 独立 | `pui-otp` |
| input-tag | 标签输入 | 独立 | `pui-tag-input` |
| link | 链接 | 独立 | `pui-link` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| main | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| mention | 自动完成 | 独立 | `pui-autocomplete` |
| menu | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| menu-item | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| menu-item-group | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| message | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| message-box | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| notification | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| option | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| option-group | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| overlay | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| page-header | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| pagination | 分页 | 独立 | `pui-pagination` |
| popconfirm | 确认气泡 | 组合 | `pui-popover` + `pui-popconfirm-actions` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| popper | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| radio | 单选 | 独立 | `pui-radio` |
| radio-button | 单选 | 独立 | `pui-radio` |
| radio-group | 单选 | 独立 | `pui-radio` |
| rate | 评分 | 独立 | `pui-rate` |
| result | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| roving-focus-group | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| row | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| scrollbar | 滚动区 | 独立 | `pui-scroll-area` |
| segmented | 分段选择 | 独立 | `pui-segmented` |
| select | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| select-v2 | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| skeleton-item | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| slot | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| space | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| splitter | 分割面板 | 独立 | `pui-splitter` |
| splitter-panel | 分割面板 | 独立 | `pui-splitter` |
| statistic | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| step | 步骤 | 独立 | `pui-steps` |
| steps | 步骤 | 独立 | `pui-steps` |
| sub-menu | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| switch | 开关 | 独立 | `pui-switch` |
| tab-pane | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| table | 表格 | 独立 | `pui-table` |
| table-column | 表格 | 独立 | `pui-table` |
| table-v2 | 表格 | 独立 | `pui-table` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| text | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| time-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| time-select | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| timeline | 时间线 | 独立 | `pui-timeline` |
| timeline-item | 时间线 | 独立 | `pui-timeline` |
| tooltip | 提示 | 独立 | `pui-tooltip` |
| tour | 引导 | 独立 | `pui-tour` |
| tour-step | 引导 | 独立 | `pui-tour` |
| transfer | 穿梭框 | 独立 | `pui-transfer` |
| tree | 树与树选择 | 独立 | `pui-tree` |
| tree-select | 树与树选择 | 独立 | `pui-tree` |
| tree-v2 | 树与树选择 | 独立 | `pui-tree` |
| upload | 上传 | 展示型 | `pui-upload` |
| virtual-list | 虚拟列表 | 展示型 | `pui-virtual-list` |
| watermark | 水印 | 独立 | `pui-watermark` |

## Arco Design React 2.66.15

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| _class | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| _hooks | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| _util | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| Affix | 吸附 | 独立 | `pui-sticky` |
| Alert | 警告提示 | 独立 | `pui-alert` |
| Anchor | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| AutoComplete | 自动完成 | 独立 | `pui-autocomplete` |
| Avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| BackTop | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| Badge | 徽标 | 独立 | `pui-badge` |
| Breadcrumb | 面包屑 | 独立 | `pui-breadcrumb` |
| Button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| Calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| Card | 卡片 | 独立 | `pui-card` |
| Carousel | 轮播 | 独立 | `pui-carousel` |
| Cascader | 级联选择 | 独立 | `pui-cascader` |
| Checkbox | 复选 | 独立 | `pui-checkbox` |
| Collapse | 折叠面板 | 独立 | `pui-collapse` |
| ColorPicker | 颜色选择 | 独立 | `pui-color-picker` |
| Comment | 评论 | 独立 | `pui-comment` |
| ConfigProvider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| DatePicker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| Descriptions | 描述列表 | 独立 | `pui-desc` |
| Divider | 分隔线 | 独立 | `pui-divider` |
| Drawer | 抽屉 | 独立 | `pui-drawer` |
| Dropdown | 下拉菜单 | 独立 | `pui-dropdown` |
| Empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| Form | 表单 | 独立 | `pui-form` / `pui-field` |
| Grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| Icon | 图标 | 独立 | `pui-icon` |
| Image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| Input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| InputNumber | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| InputTag | 标签输入 | 独立 | `pui-tag-input` |
| Layout | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| Link | 链接 | 独立 | `pui-link` |
| List | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| locale | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| Mentions | 自动完成 | 独立 | `pui-autocomplete` |
| Menu | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| Message | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| Modal | 弹窗 | 独立 | `pui-modal` |
| Notification | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| PageHeader | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| Pagination | 分页 | 独立 | `pui-pagination` |
| Popconfirm | 确认气泡 | 组合 | `pui-popover` + `pui-popconfirm-actions` |
| Popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| Portal | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| Progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| Radio | 单选 | 独立 | `pui-radio` |
| Rate | 评分 | 独立 | `pui-rate` |
| ResizeBox | 分割面板 | 独立 | `pui-splitter` |
| Result | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| Select | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| Skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| Slider | 滑块 | 独立 | `pui-slider` |
| Space | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| Spin | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| Statistic | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| Steps | 步骤 | 独立 | `pui-steps` |
| style | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| Switch | 开关 | 独立 | `pui-switch` |
| Table | 表格 | 独立 | `pui-table` |
| Tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| Tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| Timeline | 时间线 | 独立 | `pui-timeline` |
| TimePicker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| Tooltip | 提示 | 独立 | `pui-tooltip` |
| Transfer | 穿梭框 | 独立 | `pui-transfer` |
| Tree | 树与树选择 | 独立 | `pui-tree` |
| TreeSelect | 树与树选择 | 独立 | `pui-tree` |
| Trigger | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| Typography | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| Upload | 上传 | 展示型 | `pui-upload` |
| VerificationCode | 验证码输入 | 独立 | `pui-otp` |
| Watermark | 水印 | 独立 | `pui-watermark` |

## TDesign React 1.18.0

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| _chunks | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| _util | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| affix | 吸附 | 独立 | `pui-sticky` |
| alert | 警告提示 | 独立 | `pui-alert` |
| anchor | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| auto-complete | 自动完成 | 独立 | `pui-autocomplete` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| back-top | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| badge | 徽标 | 独立 | `pui-badge` |
| breadcrumb | 面包屑 | 独立 | `pui-breadcrumb` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| card | 卡片 | 独立 | `pui-card` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| color-picker | 颜色选择 | 独立 | `pui-color-picker` |
| comment | 评论 | 独立 | `pui-comment` |
| common | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| config-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| date-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| descriptions | 描述列表 | 独立 | `pui-desc` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| drawer | 抽屉 | 独立 | `pui-drawer` |
| dropdown | 下拉菜单 | 独立 | `pui-dropdown` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| guide | 引导 | 独立 | `pui-tour` |
| hooks | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| image-viewer | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| input-adornment | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| input-number | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| layout | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| link | 链接 | 独立 | `pui-link` |
| list | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| locale | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| menu | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| message | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| notification | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| pagination | 分页 | 独立 | `pui-pagination` |
| popconfirm | 确认气泡 | 组合 | `pui-popover` + `pui-popconfirm-actions` |
| popup | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| qrcode | 二维码 | 展示型 | `pui-qrcode` |
| radio | 单选 | 独立 | `pui-radio` |
| range-input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| rate | 评分 | 独立 | `pui-rate` |
| search | 搜索 | 独立 | `pui-mobile-search` |
| select | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| select-input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| space | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| statistic | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| steps | 步骤 | 独立 | `pui-steps` |
| sticky-tool | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| style | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| swiper | 轮播 | 独立 | `pui-carousel` |
| switch | 开关 | 独立 | `pui-switch` |
| table | 表格 | 独立 | `pui-table` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| tag-input | 标签输入 | 独立 | `pui-tag-input` |
| textarea | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| time-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| timeline | 时间线 | 独立 | `pui-timeline` |
| tooltip | 提示 | 独立 | `pui-tooltip` |
| transfer | 穿梭框 | 独立 | `pui-transfer` |
| tree | 树与树选择 | 独立 | `pui-tree` |
| tree-select | 树与树选择 | 独立 | `pui-tree` |
| typography | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| upload | 上传 | 展示型 | `pui-upload` |
| watermark | 水印 | 独立 | `pui-watermark` |

## TDesign Vue Next 1.20.3

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| _chunks | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| affix | 吸附 | 独立 | `pui-sticky` |
| alert | 警告提示 | 独立 | `pui-alert` |
| anchor | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| auto-complete | 自动完成 | 独立 | `pui-autocomplete` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| back-top | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| badge | 徽标 | 独立 | `pui-badge` |
| breadcrumb | 面包屑 | 独立 | `pui-breadcrumb` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| card | 卡片 | 独立 | `pui-card` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| color-picker | 颜色选择 | 独立 | `pui-color-picker` |
| comment | 评论 | 独立 | `pui-comment` |
| common | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| common-components | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| config-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| date-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| descriptions | 描述列表 | 独立 | `pui-desc` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| drawer | 抽屉 | 独立 | `pui-drawer` |
| dropdown | 下拉菜单 | 独立 | `pui-dropdown` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| guide | 引导 | 独立 | `pui-tour` |
| icon | 图标 | 独立 | `pui-icon` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| image-viewer | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| input-adornment | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| input-number | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| layout | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| link | 链接 | 独立 | `pui-link` |
| list | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| locale | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| menu | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| message | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| notification | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| pagination | 分页 | 独立 | `pui-pagination` |
| popconfirm | 确认气泡 | 组合 | `pui-popover` + `pui-popconfirm-actions` |
| popup | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| qrcode | 二维码 | 展示型 | `pui-qrcode` |
| radio | 单选 | 独立 | `pui-radio` |
| range-input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| rate | 评分 | 独立 | `pui-rate` |
| select | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| select-input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| space | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| statistic | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| steps | 步骤 | 独立 | `pui-steps` |
| sticky-tool | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| style | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| swiper | 轮播 | 独立 | `pui-carousel` |
| switch | 开关 | 独立 | `pui-switch` |
| table | 表格 | 独立 | `pui-table` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| tag-input | 标签输入 | 独立 | `pui-tag-input` |
| textarea | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| time-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| timeline | 时间线 | 独立 | `pui-timeline` |
| tooltip | 提示 | 独立 | `pui-tooltip` |
| transfer | 穿梭框 | 独立 | `pui-transfer` |
| tree | 树与树选择 | 独立 | `pui-tree` |
| tree-select | 树与树选择 | 独立 | `pui-tree` |
| typography | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| upload | 上传 | 展示型 | `pui-upload` |
| watermark | 水印 | 独立 | `pui-watermark` |

## Ant Design Mobile 5.42.3

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| action-sheet | 动作面板 | 独立 | `pui-mobile-sheet` |
| auto-center | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| badge | 徽标 | 独立 | `pui-badge` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| calendar-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| calendar-picker-view | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| capsule-tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| card | 卡片 | 独立 | `pui-card` |
| cascade-picker | 级联选择 | 独立 | `pui-cascader` |
| cascade-picker-view | 级联选择 | 独立 | `pui-cascader` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| cascader-view | 级联选择 | 独立 | `pui-cascader` |
| center-popup | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| check-list | 复选 | 独立 | `pui-checkbox` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| config-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| date-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| date-picker-view | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| dot-loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| dropdown | 下拉菜单 | 独立 | `pui-dropdown` |
| ellipsis | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| error-block | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| floating-bubble | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| floating-panel | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| footer | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| image-uploader | 上传 | 展示型 | `pui-upload` |
| image-viewer | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| index-bar | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| infinite-scroll | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| jumbo-tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| list | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| mask | 遮罩 | 独立 | `pui-modal-mask` / `pui-mobile-sheet-mask` |
| modal | 弹窗 | 独立 | `pui-modal` |
| nav-bar | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| notice-bar | 警告提示 | 独立 | `pui-alert` |
| number-keyboard | 数字键盘 | 独立 | `pui-number-keyboard` |
| page-indicator | 页面指示 | 独立 | `pui-page-indicator` |
| passcode-input | 验证码输入 | 独立 | `pui-otp` |
| picker | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| picker-view | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| popup | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| progress-bar | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| progress-circle | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| pull-to-refresh | 下拉刷新 | 展示型 | `pui-pull-refresh` |
| radio | 单选 | 独立 | `pui-radio` |
| rate | 评分 | 独立 | `pui-rate` |
| result | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| result-page | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| safe-area | 安全区 | 独立 | `--pui-mobile-safe-bottom` |
| scroll-mask | 遮罩 | 独立 | `pui-modal-mask` / `pui-mobile-sheet-mask` |
| search-bar | 搜索 | 独立 | `pui-mobile-search` |
| segmented | 分段选择 | 独立 | `pui-segmented` |
| selector | 分段选择 | 独立 | `pui-segmented` |
| side-bar | 侧边导航 | 独立 | `pui-side-nav` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| space | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| spin-loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| stepper | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| steps | 步骤 | 独立 | `pui-steps` |
| swipe-action | 滑动操作 | 独立 | `pui-mobile-swipe` |
| swiper | 轮播 | 独立 | `pui-carousel` |
| switch | 开关 | 独立 | `pui-switch` |
| tab-bar | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| text-area | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| toast | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| tree-select | 树与树选择 | 独立 | `pui-tree` |
| virtual-input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| water-mark | 水印 | 独立 | `pui-watermark` |

## Vant 4.10.0

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| action-bar | 动作栏 | 独立 | `pui-mobile-bottom` |
| action-bar-button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| action-bar-icon | 动作栏 | 独立 | `pui-mobile-bottom` |
| action-sheet | 动作面板 | 独立 | `pui-mobile-sheet` |
| address-edit | 地址与联系人 | 模板 | `pui-address` / `pui-contact` |
| address-list | 地址与联系人 | 模板 | `pui-address` / `pui-contact` |
| area | 级联选择 | 独立 | `pui-cascader` |
| back-top | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| badge | 徽标 | 独立 | `pui-badge` |
| barrage | 弹幕 | 独立 | `pui-barrage` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| card | 卡片 | 独立 | `pui-card` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| cell | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| cell-group | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| checkbox-group | 复选 | 独立 | `pui-checkbox` |
| circle | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| col | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| collapse-item | 折叠面板 | 独立 | `pui-collapse` |
| composables | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| config-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| contact-card | 地址与联系人 | 模板 | `pui-address` / `pui-contact` |
| contact-edit | 地址与联系人 | 模板 | `pui-address` / `pui-contact` |
| contact-list | 地址与联系人 | 模板 | `pui-address` / `pui-contact` |
| count-down | 倒计时 | 独立 | `pui-countdown` |
| coupon | 价格与优惠券 | 独立 | `pui-price` / `pui-coupon` |
| coupon-cell | 价格与优惠券 | 独立 | `pui-price` / `pui-coupon` |
| coupon-list | 价格与优惠券 | 独立 | `pui-price` / `pui-coupon` |
| date-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| dropdown-item | 下拉菜单 | 独立 | `pui-dropdown` |
| dropdown-menu | 下拉菜单 | 独立 | `pui-dropdown` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| field | 表单 | 独立 | `pui-form` / `pui-field` |
| floating-bubble | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| floating-panel | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| grid-item | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| highlight | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| icon | 图标 | 独立 | `pui-icon` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| image-preview | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| index-anchor | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| index-bar | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| lazyload | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| list | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| locale | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| nav-bar | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| notice-bar | 警告提示 | 独立 | `pui-alert` |
| notify | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| number-keyboard | 数字键盘 | 独立 | `pui-number-keyboard` |
| overlay | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| pagination | 分页 | 独立 | `pui-pagination` |
| password-input | 验证码输入 | 独立 | `pui-otp` |
| picker | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| picker-group | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| popup | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| pull-refresh | 下拉刷新 | 展示型 | `pui-pull-refresh` |
| radio | 单选 | 独立 | `pui-radio` |
| radio-group | 单选 | 独立 | `pui-radio` |
| rate | 评分 | 独立 | `pui-rate` |
| rolling-text | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| row | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| search | 搜索 | 独立 | `pui-mobile-search` |
| share-sheet | 动作面板 | 独立 | `pui-mobile-sheet` |
| sidebar | 侧边导航 | 独立 | `pui-side-nav` |
| sidebar-item | 侧边导航 | 独立 | `pui-side-nav` |
| signature | 签名 | 展示型 | `pui-signature` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| skeleton-avatar | 骨架屏 | 独立 | `pui-skeleton` |
| skeleton-image | 骨架屏 | 独立 | `pui-skeleton` |
| skeleton-paragraph | 骨架屏 | 独立 | `pui-skeleton` |
| skeleton-title | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| space | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| step | 步骤 | 独立 | `pui-steps` |
| stepper | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| steps | 步骤 | 独立 | `pui-steps` |
| sticky | 吸附 | 独立 | `pui-sticky` |
| style | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| submit-bar | 动作栏 | 独立 | `pui-mobile-bottom` |
| swipe | 轮播 | 独立 | `pui-carousel` |
| swipe-cell | 滑动操作 | 独立 | `pui-mobile-swipe` |
| swipe-item | 轮播 | 独立 | `pui-carousel` |
| switch | 开关 | 独立 | `pui-switch` |
| tab | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tabbar | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tabbar-item | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| text-ellipsis | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| time-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| toast | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| tree-select | 树与树选择 | 独立 | `pui-tree` |
| uploader | 上传 | 展示型 | `pui-upload` |
| utils | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| watermark | 水印 | 独立 | `pui-watermark` |

## TDesign Mobile React 0.23.1

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| _chunks | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| _common | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| _util | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| action-sheet | 动作面板 | 独立 | `pui-mobile-sheet` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| back-top | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| badge | 徽标 | 独立 | `pui-badge` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| cell | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| color-picker | 颜色选择 | 独立 | `pui-color-picker` |
| common | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| config-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| count-down | 倒计时 | 独立 | `pui-countdown` |
| date-time-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| drawer | 抽屉 | 独立 | `pui-drawer` |
| dropdown-menu | 下拉菜单 | 独立 | `pui-dropdown` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| fab | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| footer | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| guide | 引导 | 独立 | `pui-tour` |
| hooks | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| icon | 图标 | 独立 | `pui-icon` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| image-viewer | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| indexes | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| layout | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| link | 链接 | 独立 | `pui-link` |
| list | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| locale | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| message | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| navbar | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| notice-bar | 警告提示 | 独立 | `pui-alert` |
| overlay | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| picker | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| popup | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| pull-down-refresh | 下拉刷新 | 展示型 | `pui-pull-refresh` |
| qrcode | 二维码 | 展示型 | `pui-qrcode` |
| radio | 单选 | 独立 | `pui-radio` |
| rate | 评分 | 独立 | `pui-rate` |
| result | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| search | 搜索 | 独立 | `pui-mobile-search` |
| segmented | 分段选择 | 独立 | `pui-segmented` |
| side-bar | 侧边导航 | 独立 | `pui-side-nav` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| stepper | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| steps | 步骤 | 独立 | `pui-steps` |
| sticky | 吸附 | 独立 | `pui-sticky` |
| style | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| swipe-cell | 滑动操作 | 独立 | `pui-mobile-swipe` |
| swiper | 轮播 | 独立 | `pui-carousel` |
| switch | 开关 | 独立 | `pui-switch` |
| tab-bar | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| table | 表格 | 独立 | `pui-table` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| textarea | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| toast | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| tree-select | 树与树选择 | 独立 | `pui-tree` |
| typography | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| upload | 上传 | 展示型 | `pui-upload` |
| watermark | 水印 | 独立 | `pui-watermark` |

## TDesign Mobile Vue 1.15.1

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| _chunks | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| _common | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| _util | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| action-sheet | 动作面板 | 独立 | `pui-mobile-sheet` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| back-top | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| badge | 徽标 | 独立 | `pui-badge` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| cell | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| color-picker | 颜色选择 | 独立 | `pui-color-picker` |
| config-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| count-down | 倒计时 | 独立 | `pui-countdown` |
| date-time-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| drawer | 抽屉 | 独立 | `pui-drawer` |
| dropdown-menu | 下拉菜单 | 独立 | `pui-dropdown` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| fab | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| footer | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| guide | 引导 | 独立 | `pui-tour` |
| hooks | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| icon | 图标 | 独立 | `pui-icon` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| image-viewer | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| indexes | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| layout | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| link | 链接 | 独立 | `pui-link` |
| list | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| locale | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| message | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| navbar | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| notice-bar | 警告提示 | 独立 | `pui-alert` |
| overlay | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| picker | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| popup | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| pull-down-refresh | 下拉刷新 | 展示型 | `pui-pull-refresh` |
| qrcode | 二维码 | 展示型 | `pui-qrcode` |
| radio | 单选 | 独立 | `pui-radio` |
| rate | 评分 | 独立 | `pui-rate` |
| result | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| search | 搜索 | 独立 | `pui-mobile-search` |
| segmented | 分段选择 | 独立 | `pui-segmented` |
| shared | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| side-bar | 侧边导航 | 独立 | `pui-side-nav` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| stepper | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| steps | 步骤 | 独立 | `pui-steps` |
| sticky | 吸附 | 独立 | `pui-sticky` |
| style | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| swipe-cell | 滑动操作 | 独立 | `pui-mobile-swipe` |
| swiper | 轮播 | 独立 | `pui-carousel` |
| switch | 开关 | 独立 | `pui-switch` |
| tab-bar | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| table | 表格 | 独立 | `pui-table` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| textarea | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| toast | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| tree-select | 树与树选择 | 独立 | `pui-tree` |
| typography | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| upload | 上传 | 展示型 | `pui-upload` |
| watermark | 水印 | 独立 | `pui-watermark` |

## NutUI React 3.1.0

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| actionsheet | 动作面板 | 独立 | `pui-mobile-sheet` |
| address | 地址与联系人 | 模板 | `pui-address` / `pui-contact` |
| animate | 动画 | 展示型 | `pui-animate` / `pui-ripple` |
| animatingnumbers | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| audio | 媒体 | 独立 | `pui-media` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| avatarcropper | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| avatargroup | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| backtop | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| badge | 徽标 | 独立 | `pui-badge` |
| barrage | 弹幕 | 独立 | `pui-barrage` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| calendar | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| calendarcard | 日历卡片 | 独立 | `pui-calendar-card` |
| calendaritem | 日历卡片 | 独立 | `pui-calendar-card` |
| card | 卡片 | 独立 | `pui-card` |
| cascader | 级联选择 | 独立 | `pui-cascader` |
| cell | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| cellgroup | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| checkboxgroup | 复选 | 独立 | `pui-checkbox` |
| circleprogress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| col | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| collapseitem | 折叠面板 | 独立 | `pui-collapse` |
| configprovider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| countdown | 倒计时 | 独立 | `pui-countdown` |
| countup | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| datepicker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| datepickerview | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| drag | 拖拽排序 | 独立 | `pui-reorder` |
| elevator | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| ellipsis | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| empty | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| fixednav | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| formitem | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| griditem | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| hoverbutton | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| hoverbuttonitem | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| imagepreview | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| indicator | 页面指示 | 独立 | `pui-page-indicator` |
| infiniteloading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| inputnumber | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| layout | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| lottie | 媒体 | 独立 | `pui-media` |
| menu | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| menuitem | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| navbar | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| noticebar | 警告提示 | 独立 | `pui-alert` |
| notify | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| numberkeyboard | 数字键盘 | 独立 | `pui-number-keyboard` |
| overlay | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| pagination | 分页 | 独立 | `pui-pagination` |
| picker | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| pickerview | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| popup | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| price | 价格与优惠券 | 独立 | `pui-price` / `pui-coupon` |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| pulltorefresh | 下拉刷新 | 展示型 | `pui-pull-refresh` |
| quickenter | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| radio | 单选 | 独立 | `pui-radio` |
| radiogroup | 单选 | 独立 | `pui-radio` |
| range | 滑块 | 独立 | `pui-slider` |
| rate | 评分 | 独立 | `pui-rate` |
| resultpage | 空与结果 | 独立 | `pui-empty` / `pui-result` |
| row | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| safearea | 安全区 | 独立 | `--pui-mobile-safe-bottom` |
| searchbar | 搜索 | 独立 | `pui-mobile-search` |
| segmented | 分段选择 | 独立 | `pui-segmented` |
| shortpassword | 验证码输入 | 独立 | `pui-otp` |
| sidebar | 侧边导航 | 独立 | `pui-side-nav` |
| sidebaritem | 侧边导航 | 独立 | `pui-side-nav` |
| signature | 签名 | 展示型 | `pui-signature` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| space | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| step | 步骤 | 独立 | `pui-steps` |
| steps | 步骤 | 独立 | `pui-steps` |
| sticky | 吸附 | 独立 | `pui-sticky` |
| swipe | 轮播 | 独立 | `pui-carousel` |
| swiper | 轮播 | 独立 | `pui-carousel` |
| swiperitem | 轮播 | 独立 | `pui-carousel` |
| switch | 开关 | 独立 | `pui-switch` |
| tabbar | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tabbaritem | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| table | 表格 | 独立 | `pui-table` |
| tabpane | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| textarea | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| timedetail | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| timeselect | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| toast | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| tour | 引导 | 独立 | `pui-tour` |
| trendarrow | 统计数值 | 独立 | `pui-stat` / `pui-animated-number` |
| uploader | 上传 | 展示型 | `pui-upload` |
| video | 媒体 | 独立 | `pui-media` |
| virtuallist | 虚拟列表 | 展示型 | `pui-virtual-list` |
| watermark | 水印 | 独立 | `pui-watermark` |

## Ionic Core 8.8.13

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| accordion | 折叠面板 | 独立 | `pui-collapse` |
| accordion-group | 折叠面板 | 独立 | `pui-collapse` |
| action-sheet | 动作面板 | 独立 | `pui-mobile-sheet` |
| alert | 警告提示 | 独立 | `pui-alert` |
| app | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| back-button | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| backdrop | 遮罩 | 独立 | `pui-modal-mask` / `pui-mobile-sheet-mask` |
| badge | 徽标 | 独立 | `pui-badge` |
| breadcrumb | 面包屑 | 独立 | `pui-breadcrumb` |
| breadcrumbs | 面包屑 | 独立 | `pui-breadcrumb` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| buttons | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| card | 卡片 | 独立 | `pui-card` |
| card-content | 卡片 | 独立 | `pui-card` |
| card-header | 卡片 | 独立 | `pui-card` |
| card-subtitle | 卡片 | 独立 | `pui-card` |
| card-title | 卡片 | 独立 | `pui-card` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| chip | 标签 | 独立 | `pui-tag` / `pui-chip` |
| col | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| content | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| datetime | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| datetime-button | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| fab | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| fab-button | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| fab-list | 浮动按钮 | 独立 | `pui-fab` / `pui-backtop` |
| footer | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| header | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| icon | 图标 | 独立 | `pui-icon` |
| img | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| infinite-scroll | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| infinite-scroll-content | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| input-otp | 验证码输入 | 独立 | `pui-otp` |
| input-password-toggle | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| item | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| item-divider | 分隔线 | 独立 | `pui-divider` |
| item-group | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| item-option | 滑动操作 | 独立 | `pui-mobile-swipe` |
| item-options | 滑动操作 | 独立 | `pui-mobile-swipe` |
| item-sliding | 滑动操作 | 独立 | `pui-mobile-swipe` |
| label | 表单 | 独立 | `pui-form` / `pui-field` |
| list | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| list-header | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| menu | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| menu-button | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| menu-toggle | 菜单 | 独立 | `pui-menu` / `pui-nav` |
| modal | 弹窗 | 独立 | `pui-modal` |
| nav | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| nav-link | 路由运行时 | 内部 | 静态 HTML 使用原生链接，不复制框架路由器 |
| note | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| picker | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| picker-column | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| picker-column-option | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| picker-legacy | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| picker-legacy-column | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| progress-bar | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| radio | 单选 | 独立 | `pui-radio` |
| radio-group | 单选 | 独立 | `pui-radio` |
| range | 滑块 | 独立 | `pui-slider` |
| refresher | 下拉刷新 | 展示型 | `pui-pull-refresh` |
| refresher-content | 下拉刷新 | 展示型 | `pui-pull-refresh` |
| reorder | 拖拽排序 | 独立 | `pui-reorder` |
| reorder-group | 拖拽排序 | 独立 | `pui-reorder` |
| ripple-effect | 动画 | 展示型 | `pui-animate` / `pui-ripple` |
| route | 路由运行时 | 内部 | 静态 HTML 使用原生链接，不复制框架路由器 |
| route-redirect | 路由运行时 | 内部 | 静态 HTML 使用原生链接，不复制框架路由器 |
| router | 路由运行时 | 内部 | 静态 HTML 使用原生链接，不复制框架路由器 |
| router-link | 路由运行时 | 内部 | 静态 HTML 使用原生链接，不复制框架路由器 |
| router-outlet | 路由运行时 | 内部 | 静态 HTML 使用原生链接，不复制框架路由器 |
| row | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| searchbar | 搜索 | 独立 | `pui-mobile-search` |
| segment | 分段选择 | 独立 | `pui-segmented` |
| segment-button | 分段选择 | 独立 | `pui-segmented` |
| segment-content | 分段选择 | 独立 | `pui-segmented` |
| segment-view | 分段选择 | 独立 | `pui-segmented` |
| select | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| select-modal | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| select-option | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| select-popover | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| skeleton-text | 骨架屏 | 独立 | `pui-skeleton` |
| slides | 轮播 | 独立 | `pui-carousel` |
| spinner | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| split-pane | 分割面板 | 独立 | `pui-splitter` |
| tab | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tab-bar | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tab-button | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| text | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| textarea | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| thumbnail | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| title | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| toast | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| toggle | 开关 | 独立 | `pui-switch` |
| toolbar | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |

## Arco Mobile React 2.39.1

| 原组件 | PUI 能力 | 交付类型 | 调用方式 |
|---|---|---|---|
| _helpers | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| action-sheet | 动作面板 | 独立 | `pui-mobile-sheet` |
| avatar | 头像 | 独立 | `pui-avatar` / `pui-avatar-crop` |
| badge | 徽标 | 独立 | `pui-badge` |
| button | 按钮 | 独立 | `pui-btn` / `pui-button-group` |
| carousel | 轮播 | 独立 | `pui-carousel` |
| cell | 列表 | 独立 | `pui-list` / `pui-mobile-cell` |
| checkbox | 复选 | 独立 | `pui-checkbox` |
| circle-progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| collapse | 折叠面板 | 独立 | `pui-collapse` |
| context-provider | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| count-down | 倒计时 | 独立 | `pui-countdown` |
| date-picker | 日期时间 | 独立 | `pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker` |
| dialog | 弹窗 | 独立 | `pui-modal` |
| divider | 分隔线 | 独立 | `pui-divider` |
| dropdown | 下拉菜单 | 独立 | `pui-dropdown` |
| dropdown-menu | 下拉菜单 | 独立 | `pui-dropdown` |
| ellipsis | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| form | 表单 | 独立 | `pui-form` / `pui-field` |
| grid | 布局容器 | 模板 | `pui-admin` / `pui-main` / `pui-content` |
| icon | 图标 | 独立 | `pui-icon` |
| image | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| image-picker | 上传 | 展示型 | `pui-upload` |
| image-preview | 图片 | 独立 | `pui-image` / `pui-image-viewer` |
| index-bar | 锚点索引 | 独立 | `pui-anchor` / `pui-index-list` |
| input | 文本输入 | 独立 | `pui-control` / `pui-input-wrapper` |
| keyboard | 数字键盘 | 独立 | `pui-number-keyboard` |
| load-more | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| loading | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| masking | 遮罩 | 独立 | `pui-modal-mask` / `pui-mobile-sheet-mask` |
| nav-bar | 页头导航 | 独立 | `pui-page-head` / `pui-mobile-navbar` |
| notice-bar | 警告提示 | 独立 | `pui-alert` |
| notify | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| pagination | 分页 | 独立 | `pui-pagination` |
| picker | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| picker-view | 选择器 | 独立 | `pui-picker` / `pui-mobile-picker-columns` |
| popover | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| popup | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| popup-swiper | 气泡与浮层 | 独立 | `pui-popover` / `pui-floating-panel` |
| portal | 框架内部 | 内部 | 由 CSS 变量、原生 DOM 或框架运行时承担 |
| progress | 进度 | 独立 | `pui-progress` / `pui-progress-circle` |
| pull-refresh | 下拉刷新 | 展示型 | `pui-pull-refresh` |
| radio | 单选 | 独立 | `pui-radio` |
| rate | 评分 | 独立 | `pui-rate` |
| search-bar | 搜索 | 独立 | `pui-mobile-search` |
| show-monitor | 监视器 | 展示型 | `pui-monitor` |
| skeleton | 骨架屏 | 独立 | `pui-skeleton` |
| slider | 滑块 | 独立 | `pui-slider` |
| stepper | 数字输入 | 独立 | `pui-input-number` / `pui-mobile-stepper` |
| steps | 步骤 | 独立 | `pui-steps` |
| sticky | 吸附 | 独立 | `pui-sticky` |
| swipe-action | 滑动操作 | 独立 | `pui-mobile-swipe` |
| swipe-load | 加载 | 独立 | `pui-spin` / `pui-load-more` |
| switch | 开关 | 独立 | `pui-switch` |
| tab-bar | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tabs | 标签页 | 独立 | `pui-tabs` / `pui-mobile-tabbar` |
| tag | 标签 | 独立 | `pui-tag` / `pui-chip` |
| textarea | 排版 | 独立 | `pui-typography` / `pui-ellipsis` |
| toast | 全局消息 | 独立 | `PUI.toast()` / `PUI.notification()` |
| transition | 动画 | 展示型 | `pui-animate` / `pui-ripple` |
| uploader | 上传 | 展示型 | `pui-upload` |

## 验收结论

当前逐项矩阵未发现未映射组件。公开组件均已对应 PUI 独立组件、组合方案、模板或展示型实现；框架内部件均已说明替代边界。
