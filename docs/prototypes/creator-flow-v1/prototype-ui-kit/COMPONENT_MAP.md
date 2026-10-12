# 组件快速映射表

> 本文件保留高频组件速查。完整桌面端、移动端、专项组件、参考版本与实现状态见 `COMPONENT_INVENTORY.md`。

本表用于把常见设计系统中的组件名称映射到纯 HTML 的 PUI 组件。以后写原型时，优先按“业务用途”选择 PUI 类名，不混用其他组件库的类名。

| 业务用途 | Ant Design | Element Plus | Arco Design | TDesign | PUI |
|---|---|---|---|---|---|
| 页面布局 | Layout | Container | Layout | Layout | `pui-admin` / `pui-main` |
| 主按钮 | Button primary | Button primary | Button primary | Button theme primary | `pui-btn pui-btn-primary` |
| 危险操作 | Button danger | Button danger | Button status danger | Button theme danger | `pui-btn pui-btn-danger` |
| 筛选表单 | Form inline | Form inline | Form layout inline | Form layout inline | `pui-filter` |
| 文本输入 | Input | Input | Input | Input | `pui-control` |
| 日期选择 | DatePicker | DatePicker | DatePicker | DatePicker | `pui-picker pui-date-picker` |
| 时间选择 | TimePicker | TimePicker | TimePicker | TimePicker | `pui-picker pui-time-picker` |
| 时间范围 | RangePicker | TimePicker range | RangePicker | TimeRangePicker | `pui-picker pui-range-picker` |
| 日期时间 | DatePicker showTime | DateTimePicker | DatePicker showTime | DateTimePicker | `pui-picker pui-datetime-picker` |
| 日期时间范围 | RangePicker showTime | DateTimePicker range | RangePicker showTime | DateTimeRangePicker | `pui-datetime-range-picker` |
| 数据表格 | Table | Table | Table | Table | `pui-table-wrap` / `pui-table` |
| 状态标签 | Tag / Badge | Tag | Tag | Tag | `pui-tag` |
| 分页 | Pagination | Pagination | Pagination | Pagination | `pui-pagination` |
| 标签页 | Tabs | Tabs | Tabs | Tabs | `pui-tabs` / `pui-tab` |
| 弹窗 | Modal | Dialog | Modal | Dialog | `pui-modal-mask` / `pui-modal` |
| 侧边抽屉 | Drawer | Drawer | Drawer | Drawer | `pui-drawer-mask` / `pui-drawer` |
| 消息提示 | Message | Message | Message | Message | `PUI.toast()` 或 `data-pui-toast` |
| 警告提示 | Alert | Alert | Alert | Alert | `pui-alert` |
| 步骤流程 | Steps | Steps | Steps | Steps | `pui-steps` / `pui-step` |
| 描述详情 | Descriptions | Descriptions | Descriptions | Descriptions | `pui-desc` |
| 开关 | Switch | Switch | Switch | Switch | `pui-switch` |
| 空状态 | Empty | Empty | Empty | Empty | `pui-empty` |
| 骨架加载 | Skeleton | Skeleton | Skeleton | Skeleton | `pui-skeleton` |
| 文件上传 | Upload | Upload | Upload | Upload | `pui-upload` |

## 页面模板映射

| 页面场景 | 推荐模板 |
|---|---|
| 查询、批量操作、表格分页 | `templates/list-page.html` |
| 对象信息、流程记录、侧边状态 | `templates/detail-page.html` |
| 分组表单、校验提示、保存提交 | `templates/edit-page.html` |
| 流程节点、材料核验、审批意见 | `templates/approval-page.html` |
| 指标、趋势、排行、运营提醒 | `templates/dashboard-page.html` |
| 分类导航、规则开关、权限维护 | `templates/config-page.html` |
| 搜索、状态筛选、卡片列表、底部导航 | `templates/mobile-list-page.html` |

## 状态约定

- 默认、悬停、按下、聚焦、禁用、加载、错误均由组件库统一处理。
- 状态不能只靠颜色区分，应同时保留文字或符号。
- 删除、退回、停用等高风险操作必须二次确认。
- 异步操作应使用 Toast、Alert、进度或骨架反馈结果。
