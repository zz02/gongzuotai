# HTML 原型生成调用规则

以后生成任何 HTML 交互原型时，把下面这段作为项目约束或提示词开头使用。

```text
本项目使用本地 Prototype UI Kit 作为统一组件库。

必须在每个 HTML 页面引入：
<script defer src="./prototype-ui-kit/dist/prototype-ui.js"></script>

prototype-ui.js 会自动加载同目录的 prototype-ui.css；除非有特殊原因，不要再单独写一套页面级组件样式。

页面 body 使用：
<body class="pui-page">

组件使用规则：
1. 按钮统一使用 .pui-btn、.pui-btn-primary、.pui-btn-danger、.pui-btn-sm、.pui-btn-icon。
2. 筛选区统一使用 .pui-filter、.pui-field、.pui-label、.pui-control。
3. 表格统一使用 .pui-table-wrap、.pui-table、.pui-tag、.pui-actions、.pui-link。
4. 弹窗统一使用 .pui-modal-mask、.pui-modal、.pui-modal-head、.pui-modal-body、.pui-modal-foot。
5. 日期时间统一使用 .pui-picker；按需组合 .pui-date-picker、.pui-time-picker、.pui-range-picker、.pui-datetime-picker、.pui-datetime-range-picker。
6. 抽屉统一使用 .pui-drawer-mask、.pui-drawer。
7. Tab、分段控件、开关、步骤条、进度条、上传、空状态、骨架屏、时间线、树、级联、穿梭框和移动端控件优先使用 pui-* 组件。
8. 不要为按钮、表格、弹窗、日期选择器重新发明一套样式。
9. 页面文案使用业务语言，不使用开发字段名。
10. 日期写成 YYYY-MM-DD，日期时间写成 YYYY-MM-DD HH:mm，时间范围写成 开始时间 ~ 结束时间。
11. 新页面优先从 templates/ 中选择列表页、详情页、编辑页、审批页、看板页、配置页或移动端列表页，不从空白 HTML 开始。
12. 保存、提交、删除、审批、筛选、导出等操作必须提供弹窗、抽屉、Toast、Alert 或页面状态反馈。
13. 表单必须覆盖必填、提示、错误、禁用；数据页必须覆盖加载、空数据、异常或权限不足中的适用状态。
14. 允许使用 CSS 变量传入图表高度、进度和弹层宽度，不允许在页面内重写组件视觉样式。
15. 开始写组件前先查 prototype-ui-kit/COMPONENT_INVENTORY.md、COMPONENT_PARITY.md 和 examples/catalog.html，不凭记忆临时重写。

视觉风格：
- 参考 Ant Design、Element Plus、Arco Design、TDesign 的后台产品气质。
- 控件克制、清晰、统一，不做花哨装饰。
- PC 后台优先保证扫描效率、字段对齐、表格密度和操作闭环。
- 移动端优先保证单列布局、触控尺寸、无横向溢出。
- 多页面必须保持侧边栏、顶部栏、页面标题、筛选区、表格密度和状态文案一致。

页面模板选择：
- 查询、批量操作、表格分页：templates/list-page.html
- 对象信息、流程记录、侧边状态：templates/detail-page.html
- 分组表单、错误校验、保存提交：templates/edit-page.html
- 流程节点、材料核验、审批意见：templates/approval-page.html
- 指标、趋势、排行、运营提醒：templates/dashboard-page.html
- 分类导航、规则开关、权限维护：templates/config-page.html
- 搜索、状态筛选、移动业务卡片：templates/mobile-list-page.html
```

如果 HTML 文件和 `prototype-ui-kit/` 不在同一目录，请按实际相对路径调整 `src`。
