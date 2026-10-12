# PUI 全量组件清单

本清单以本机实际下载的开源组件包为参考源，不以记忆或产品宣传页代替本地证据。各包原始组件目录见 `REFERENCE_SOURCES.md`，1034 个源目录的逐项去向见 `COMPONENT_PARITY.md`。PUI 面向静态 HTML 高保真原型，因此按“用户可感知能力”归并 React / Vue 内部实现件；同一能力不会因 `ButtonGroup`、`button-group` 或框架插槽重复计数。

## 本机参考源

| 场景 | 组件库 | 本机版本 | 许可证 |
|---|---|---:|---|
| PC | Ant Design | 6.5.0 | MIT |
| PC | Element Plus | 2.14.2 | MIT |
| PC | Arco Design React | 2.66.15 | MIT |
| PC | TDesign React | 1.18.0 | MIT |
| PC | TDesign Vue Next | 1.20.3 | MIT |
| 移动端 | Ant Design Mobile | 5.42.3 | MIT |
| 移动端 | Vant | 4.10.0 | MIT |
| 移动端 | TDesign Mobile React | 0.23.1 | MIT |
| 移动端 | TDesign Mobile Vue | 1.15.1 | MIT |
| 移动端 | NutUI React | 3.1.0 | MIT |
| 移动端 | Ionic Core | 8.8.13 | MIT |
| 移动端 | Arco Mobile React | 2.39.1 | ISC |

## 状态定义

- **可用**：有稳定 PUI 类名和目录示例，可直接复制。
- **组合**：由两个或以上基础组件组合，PUI 保留统一结构和交互。
- **模板**：属于页面级模式，放在 `templates/`，不伪装成单一控件。
- **展示型**：原型中可表达外观和状态，不承担生产级数据计算、网络请求或媒体处理。

## 基础与布局

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 按钮 | Button | `pui-btn` | 可用 |
| 按钮组 | Button.Group / ButtonGroup | `pui-button-group` | 可用 |
| 图标按钮 | IconButton | `pui-btn-icon` | 可用 |
| 链接 | Link | `pui-link` | 可用 |
| 图标 | Icon | `pui-icon` / 文字符号 | 展示型 |
| 排版 | Typography / Text | `pui-typography` | 可用 |
| 分隔线 | Divider | `pui-divider` | 可用 |
| 间距 | Space / Flex | `pui-space` / `pui-row` / `pui-stack` | 可用 |
| 栅格 | Grid / Row / Col | `pui-grid` / `pui-col-*` | 可用 |
| 容器布局 | Layout / Container | `pui-admin` / `pui-main` / `pui-content` | 模板 |
| 面板 | Panel | `pui-panel` | 可用 |
| 卡片 | Card | `pui-card` | 可用 |
| 分割面板 | Splitter / ResizeBox | `pui-splitter` | 展示型 |
| 吸附区域 | Affix / Sticky | `pui-sticky` | 可用 |
| 水印 | Watermark | `pui-watermark` | 可用 |

## 导航

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 面包屑 | Breadcrumb | `pui-breadcrumb` | 可用 |
| 菜单 | Menu | `pui-menu` / `pui-nav` | 可用 |
| 下拉菜单 | Dropdown | `pui-dropdown` | 可用 |
| 标签页 | Tabs | `pui-tabs` | 可用 |
| 分段选择 | Segmented | `pui-segmented` | 可用 |
| 步骤条 | Steps | `pui-steps` | 可用 |
| 分页 | Pagination | `pui-pagination` | 可用 |
| 页头 | PageHeader | `pui-page-head` | 可用 |
| 锚点 | Anchor | `pui-anchor` | 可用 |
| 返回顶部 | BackTop | `pui-backtop` | 可用 |
| 浮动按钮 | FloatButton / FAB | `pui-fab` | 可用 |
| 侧边导航 | SideBar | `pui-settings-nav` / `pui-sidebar` | 组合 |
| 导航栏 | NavBar | `pui-mobile-navbar` | 可用 |
| 底部导航 | TabBar | `pui-mobile-tabbar` | 可用 |

## 表单与输入

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 表单 | Form | `pui-form` / `pui-filter` | 可用 |
| 表单项 | FormItem | `pui-field` | 可用 |
| 文本输入 | Input | `pui-control` | 可用 |
| 文本域 | Textarea | `pui-control` | 可用 |
| 输入前后缀 | InputAdornment | `pui-input-wrapper` | 可用 |
| 输入组合 | InputGroup | `pui-input-group` | 可用 |
| 数字输入 | InputNumber | `pui-input-number` | 可用 |
| 验证码输入 | InputOTP / VerificationCode | `pui-otp` | 可用 |
| 密码输入 | PasswordInput | `pui-control` + `type="password"` | 可用 |
| 标签输入 | InputTag / TagInput | `pui-tag-input` | 可用 |
| 自动完成 | AutoComplete | `pui-autocomplete` | 可用 |
| 提及输入 | Mentions | `pui-autocomplete` + `pui-tag-input` | 组合 |
| 搜索 | Search / SearchBar | `pui-mobile-search` / `pui-input-wrapper` | 可用 |
| 单选 | Radio | `pui-radio` | 可用 |
| 复选 | Checkbox / CheckList | `pui-checkbox` | 可用 |
| 开关 | Switch / Toggle | `pui-switch` | 可用 |
| 上传 | Upload / Uploader | `pui-upload` | 展示型 |
| 图片上传 | ImageUploader | `pui-upload` + `pui-image` | 组合 |
| 筛选区 | Inline Form | `pui-filter` | 可用 |
| 校验状态 | Form validation | `is-error` / `is-success` / `pui-error` | 可用 |

## 选择器

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 下拉选择 | Select | `pui-control` / `pui-dropdown` | 可用 |
| 级联选择 | Cascader | `pui-cascader` | 可用 |
| 树选择 | TreeSelect | `pui-tree` + `pui-picker-field` | 组合 |
| 穿梭框 | Transfer | `pui-transfer` | 可用 |
| 滑块 | Slider / Range | `pui-slider` | 可用 |
| 评分 | Rate | `pui-rate` | 可用 |
| 颜色选择 | ColorPicker | `pui-color-picker` | 可用 |
| 移动选择器 | Picker | `pui-mobile-picker-columns` | 展示型 |
| 地区选择 | Area / Address | `pui-cascader` / `pui-mobile-picker-columns` | 组合 |

## 日期时间

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 日期选择 | DatePicker | `pui-picker pui-date-picker` | 可用 |
| 日期范围 | RangePicker | `pui-picker pui-range-picker` | 可用 |
| 时间选择 | TimePicker / TimeSelect | `pui-picker pui-time-picker` | 可用 |
| 时间范围 | TimeRangePicker | `pui-picker pui-range-picker` | 可用 |
| 日期时间 | DateTimePicker | `pui-picker pui-datetime-picker` | 可用 |
| 日期时间范围 | DateTimeRangePicker | `pui-datetime-range-picker` | 可用 |
| 日历 | Calendar | `pui-calendar` / `pui-mini-calendar` | 可用 |
| 倒计时 | Countdown | `pui-countdown` | 展示型 |

## 数据展示

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 头像 | Avatar | `pui-avatar` | 可用 |
| 徽标 | Badge | `pui-badge` | 可用 |
| 标签 | Tag / CheckTag | `pui-tag` / `pui-chip` | 可用 |
| 表格 | Table / TableV2 | `pui-table` | 可用 |
| 列表 | List | `pui-list` | 可用 |
| 描述列表 | Descriptions | `pui-desc` | 可用 |
| 统计数值 | Statistic | `pui-stat` | 可用 |
| 进度 | Progress / CircleProgress | `pui-progress` | 可用 |
| 时间线 | Timeline | `pui-timeline` | 可用 |
| 树形结构 | Tree / TreeV2 | `pui-tree` | 可用 |
| 折叠面板 | Collapse / Accordion | `pui-collapse` | 可用 |
| 轮播 | Carousel / Swiper | `pui-carousel` | 可用 |
| 图片 | Image | `pui-image` | 可用 |
| 图片预览 | ImageViewer / Preview | `pui-image` + `pui-modal` | 组合 |
| 二维码 | QRCode | `pui-qrcode` | 展示型 |
| 评论 | Comment | `pui-comment` | 可用 |
| 省略文本 | Ellipsis / TextEllipsis | CSS 截断工具 | 可用 |
| 索引列表 | IndexBar / Indexes | `pui-index-list` | 可用 |
| 瀑布流 | Masonry | `pui-masonry` | 可用 |

## 反馈与状态

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 警告提示 | Alert | `pui-alert` | 可用 |
| 全局消息 | Message / Notify | `PUI.toast()` | 可用 |
| 通知 | Notification | `PUI.notification()` | 可用 |
| 加载 | Loading / Spin | `pui-spin` | 可用 |
| 骨架屏 | Skeleton | `pui-skeleton` | 可用 |
| 空状态 | Empty | `pui-empty` | 可用 |
| 结果页 | Result / ResultPage | `pui-result` | 可用 |
| 错误状态 | ErrorBlock | `pui-result` + 危险状态 | 组合 |
| 无限加载 | InfiniteScroll | `pui-load-more` | 展示型 |
| 下拉刷新 | PullRefresh | `pui-pull-refresh` | 展示型 |

## 弹层

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 弹窗 | Modal / Dialog / MessageBox | `pui-modal` | 可用 |
| 抽屉 | Drawer | `pui-drawer` | 可用 |
| 气泡卡片 | Popover / Popup | `pui-popover` | 可用 |
| 气泡确认 | Popconfirm | `pui-popover` + `pui-popconfirm-actions` | 组合 |
| 文字提示 | Tooltip | `pui-tooltip` | 可用 |
| 操作面板 | ActionSheet / ShareSheet | `pui-mobile-sheet` | 可用 |
| 遮罩 | Mask / Overlay / Backdrop | 各弹层 `*-mask` | 可用 |
| 引导 | Tour / Guide | `pui-tour` | 可用 |
| 数字键盘 | NumberKeyboard | `pui-number-keyboard` | 可用 |

## 移动端与业务模式

| 组件能力 | 参考名称 | PUI 调用 | 状态 |
|---|---|---|---|
| 单元格 | Cell / Item | `pui-mobile-cell` | 可用 |
| 宫格 | Grid | `pui-mobile-grid` | 可用 |
| 通知栏 | NoticeBar | `pui-mobile-notice` | 可用 |
| 步进器 | Stepper | `pui-mobile-stepper` | 可用 |
| 滑动操作 | SwipeAction / SwipeCell | `pui-mobile-swipe` | 可用 |
| 底部动作栏 | ActionBar / SubmitBar | `pui-mobile-bottom` | 可用 |
| 安全区 | SafeArea | `--pui-mobile-safe-bottom` | 可用 |
| 浮动面板 | FloatingPanel | `pui-mobile-sheet` | 组合 |
| 密码键盘 | PasscodeInput / ShortPassword | `pui-otp` + `pui-number-keyboard` | 组合 |
| 签名 | Signature | `pui-signature` | 展示型 |
| 价格 | Price | `pui-price` | 可用 |
| 优惠券 | Coupon | `pui-coupon` | 可用 |
| 地址编辑 | AddressEdit | `pui-form` + `pui-cascader` | 模板 |
| 联系人 | Contact | `pui-mobile-cell` + 表单 | 模板 |
| 音频 / 视频 | Audio / Video | 原生 `<audio>` / `<video>` + `pui-media` | 可用 |
| 趋势数值 | TrendArrow | `pui-trend-up` / `pui-trend-down` | 可用 |

## 不单独复制的框架内部件

`ConfigProvider`、`Portal`、`Trigger`、`Overlay`、`FocusTrap`、`VirtualList`、`Locale`、`Style`、`Collection`、`RovingFocusGroup` 等属于框架运行时或内部基础设施。PUI 是无框架静态原型库，这些能力分别由 CSS 变量、原生 DOM、事件委托、弹层遮罩和 HTML 语义承担，不创建没有用户界面的假组件。

## 验收要求

1. 组件入口见 `components.html`，不能只在文档中出现类名。
2. 所有弹层支持关闭按钮、遮罩或 `Esc` 关闭。
3. 日期使用 `YYYY-MM-DD`，日期时间使用 `YYYY-MM-DD HH:mm`，范围使用 `开始时间 ~ 结束时间`。
4. 375px、768px、1440px 均不得出现页面级横向溢出。
5. 移动端主要操作控件触控高度不低于 44px。
6. 展示型组件不得宣称具备生产级日期计算、文件上传、二维码编码或媒体处理能力。
