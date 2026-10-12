# 验收记录

验收日期：2026-07-31

## 验收范围

- 列表页：`templates/list-page.html`
- 详情页：`templates/detail-page.html`
- 编辑页：`templates/edit-page.html`
- 审批页：`templates/approval-page.html`
- 看板页：`templates/dashboard-page.html`
- 配置页：`templates/config-page.html`
- 移动端列表页：`templates/mobile-list-page.html`

## 浏览器验证

七个模板均在以下宽度完成真实浏览器渲染检查：

- 桌面端：1440 × 1000
- 平板端：768 × 900
- 移动端：375 × 812

验收结果：

- CSS 自动加载正常。
- JavaScript 无语法错误。
- 页面控制台无报错。
- 三种宽度均无页面级横向溢出。
- 页面标题、内容区域和业务状态均正常显示。
- 移动端主要操作控件不低于 44px。
- 移动端最后一项可滚动到固定底部导航上方。

## 交互验证

- 列表页：高级筛选默认收起、展开正常；新建弹窗正常；`Esc` 可关闭；全选正常；Toast 正常。
- 详情页：Tab 切换正常；转派抽屉正常；`Esc` 可关闭。
- 编辑页：提交时显示校验结果；保存草稿反馈正常。
- 审批页：决策状态正常；确认弹窗正常；提交反馈正常。
- 看板页：时间范围切换正常；图表数据正常渲染。
- 配置页：配置分类切换正常；开关状态和辅助属性同步。
- 移动端列表页：状态筛选正常；筛选抽屉正常；触控尺寸和底部安全区正常。

## 脚手架验证

`create-project.sh` 已分别使用以下模板创建临时项目并验证成功：

`list`、`detail`、`edit`、`approval`、`dashboard`、`config`、`mobile`

每个新项目均包含七个页面文件、`index.html`、项目说明和独立的 `prototype-ui-kit/`，页面只需一行脚本即可自动加载样式和交互。

## 使用边界

- 日期、时间、范围和日期时间选择器用于高保真原型展示与选值交互，不负责时区、国际化和生产级日期计算。
- 看板图表用于原型表达，不替代真实图表库的数据能力。
- 上传、二维码、签名和媒体组件只表达界面与状态，不处理真实文件、编码或录制。
- 组件库不包含后端接口、权限校验和数据持久化。

## 全量组件扩展

- 本机 12 套开源组件库的版本与归一化映射已记录在 `COMPONENT_INVENTORY.md`。
- 本机 1034 个组件目录的逐项对齐结果已记录在 `COMPONENT_PARITY.md`，机器审计结果为 `missing: 0`。
- 全量目录包含桌面、移动和专项组件，入口为 `components.html`。
- 逐项补充目录包含滚动区、虚拟列表、头像裁剪、图片预览、弹幕、圆形进度、拖拽排序等低频可见组件。
- 日期时间家族包含 DatePicker、DateRangePicker、TimePicker、TimeRangePicker、DateTimePicker、DateTimeRangePicker。
- 组件目录在 1440px、768px、375px 下无页面级横向溢出，日期时间、弹窗、通知和移动动作面板已完成浏览器交互验证。
