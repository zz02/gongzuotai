#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const kitRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(process.argv[2] || path.join(kitRoot, "..", "component-library-free-downloads", "node_modules"));
const outputFile = path.resolve(process.argv[3] || path.join(kitRoot, "COMPONENT_PARITY.md"));

const sources = [
  ["PC", "Ant Design", "antd", "es"],
  ["PC", "Element Plus", "element-plus", "es/components"],
  ["PC", "Arco Design React", "@arco-design/web-react", "es"],
  ["PC", "TDesign React", "tdesign-react", "es"],
  ["PC", "TDesign Vue Next", "tdesign-vue-next", "es"],
  ["移动端", "Ant Design Mobile", "antd-mobile", "es/components"],
  ["移动端", "Vant", "vant", "es"],
  ["移动端", "TDesign Mobile React", "tdesign-mobile-react", "es"],
  ["移动端", "TDesign Mobile Vue", "tdesign-mobile-vue", "es"],
  ["移动端", "NutUI React", "@nutui/nutui-react", "dist/es/packages"],
  ["移动端", "Ionic Core", "@ionic/core", "dist/collection/components"],
  ["移动端", "Arco Mobile React", "@arco-design/mobile-react", "esm"],
];

const rules = [
  ["框架内部", "内部", "由 CSS 变量、原生 DOM 或框架运行时承担", /^(?:_|base|chunks|class|collection|common|commoncomponents|composables|configprovider|contextprovider|focustrap|helpers|hooks|locale|overlay|popper|portal|rovingfocusgroup|shared|slot|style|theme|trigger|util|utils|version)$/],
  ["路由运行时", "内部", "静态 HTML 使用原生链接，不复制框架路由器", /^(?:route|router|routerlink|routeroutlet|routeredirect|navlink)$/],
  ["布局容器", "模板", "`pui-admin` / `pui-main` / `pui-content`", /^(?:app|aside|autocenter|centerpopup|col|container|content|flex|footer|grid|griditem|header|layout|main|row|space)$/],
  ["按钮", "独立", "`pui-btn` / `pui-button-group`", /^(?:button|buttongroup|buttons|actionbarbutton)$/],
  ["浮动按钮", "独立", "`pui-fab` / `pui-backtop`", /^(?:backbutton|backtop|backtotop|fab|fabbutton|fablist|fixednav|floatbutton|floatingbubble|hoverbutton|hoverbuttonitem|quickenter|stickytool)$/],
  ["图标", "独立", "`pui-icon`", /^(?:icon)$/],
  ["链接", "独立", "`pui-link`", /^(?:link)$/],
  ["排版", "独立", "`pui-typography` / `pui-ellipsis`", /^(?:ellipsis|highlight|note|text|textellipsis|textarea|typography)$/],
  ["分隔线", "独立", "`pui-divider`", /^(?:divider|itemdivider)$/],
  ["卡片", "独立", "`pui-card`", /^(?:card|cardcontent|cardheader|cardsubtitle|cardtitle)$/],
  ["分割面板", "独立", "`pui-splitter`", /^(?:resizebox|splitpane|splitter|splitterpanel)$/],
  ["吸附", "独立", "`pui-sticky`", /^(?:affix|sticky)$/],
  ["水印", "独立", "`pui-watermark`", /^(?:watermark|water-mark)$/],
  ["边框动效", "独立", "`pui-border-beam`", /^(?:borderbeam)$/],
  ["面包屑", "独立", "`pui-breadcrumb`", /^(?:breadcrumb|breadcrumbs|breadcrumbitem)$/],
  ["菜单", "独立", "`pui-menu` / `pui-nav`", /^(?:menu|menubutton|menuitem|menuitemgroup|menutoggle|submenu)$/],
  ["下拉菜单", "独立", "`pui-dropdown`", /^(?:dropdown|dropdownitem|dropdownmenu)$/],
  ["标签页", "独立", "`pui-tabs` / `pui-mobile-tabbar`", /^(?:capsuletabs|jumbotabs|tab|tabbar|tabbaritem|tabbutton|tabs|tabpane)$/],
  ["分段选择", "独立", "`pui-segmented`", /^(?:segment|segmentbutton|segmentcontent|segmented|segmentview|selector)$/],
  ["步骤", "独立", "`pui-steps`", /^(?:step|steps)$/],
  ["分页", "独立", "`pui-pagination`", /^(?:pagination)$/],
  ["页头导航", "独立", "`pui-page-head` / `pui-mobile-navbar`", /^(?:nav|navbar|nav-bar|pageheader|toolbar|title)$/],
  ["侧边导航", "独立", "`pui-side-nav`", /^(?:sidebar|side-bar|sidebaritem)$/],
  ["锚点索引", "独立", "`pui-anchor` / `pui-index-list`", /^(?:anchor|anchorlink|elevator|indexanchor|indexbar|indexes)$/],
  ["表单", "独立", "`pui-form` / `pui-field`", /^(?:field|form|formitem|label)$/],
  ["文本输入", "独立", "`pui-control` / `pui-input-wrapper`", /^(?:input|inputadornment|inputgroup|inputpasswordtoggle|rangeinput|selectinput|virtualinput)$/],
  ["数字输入", "独立", "`pui-input-number` / `pui-mobile-stepper`", /^(?:inputnumber|stepper)$/],
  ["验证码输入", "独立", "`pui-otp`", /^(?:inputotp|passcodeinput|passwordinput|shortpassword|verificationcode)$/],
  ["标签输入", "独立", "`pui-tag-input`", /^(?:inputtag|taginput)$/],
  ["自动完成", "独立", "`pui-autocomplete`", /^(?:autocomplete|mentions|mention)$/],
  ["搜索", "独立", "`pui-mobile-search`", /^(?:search|searchbar|search-bar)$/],
  ["单选", "独立", "`pui-radio`", /^(?:radio|radiobutton|radiogroup)$/],
  ["复选", "独立", "`pui-checkbox`", /^(?:checkbox|checkboxbutton|checkboxgroup|checklist|checktag)$/],
  ["开关", "独立", "`pui-switch`", /^(?:switch|toggle)$/],
  ["选择器", "独立", "`pui-picker` / `pui-mobile-picker-columns`", /^(?:option|optiongroup|picker|pickercolumn|pickercolumnoption|pickerlegacy|pickerlegacycolumn|pickergroup|pickerview|select|selectmodal|selectoption|selectpopover|selectv2)$/],
  ["级联选择", "独立", "`pui-cascader`", /^(?:area|cascadepicker|cascadepickerview|cascader|cascaderpanel|cascaderview)$/],
  ["树与树选择", "独立", "`pui-tree`", /^(?:tree|treeselect|treev2)$/],
  ["穿梭框", "独立", "`pui-transfer`", /^(?:transfer)$/],
  ["滑块", "独立", "`pui-slider`", /^(?:range|slider)$/],
  ["评分", "独立", "`pui-rate`", /^(?:rate)$/],
  ["颜色选择", "独立", "`pui-color-picker`", /^(?:colorpicker|colorpickerpanel)$/],
  ["日期时间", "独立", "`pui-date-picker` / `pui-time-picker` / `pui-datetime-picker` / `pui-range-picker`", /^(?:calendar|calendarpicker|calendarpickerview|datepicker|datepickerpanel|datepickerview|datetime|datetimebutton|datetimepicker|timepicker|timeselect|timedetail)$/],
  ["倒计时", "独立", "`pui-countdown`", /^(?:countdown|count-down)$/],
  ["上传", "展示型", "`pui-upload`", /^(?:imagepicker|imageuploader|upload|uploader)$/],
  ["头像", "独立", "`pui-avatar` / `pui-avatar-crop`", /^(?:avatar|avatarcropper|avatargroup)$/],
  ["徽标", "独立", "`pui-badge`", /^(?:badge)$/],
  ["标签", "独立", "`pui-tag` / `pui-chip`", /^(?:chip|tag)$/],
  ["表格", "独立", "`pui-table`", /^(?:table|tablecolumn|tablev2)$/],
  ["列表", "独立", "`pui-list` / `pui-mobile-cell`", /^(?:cell|cellgroup|item|itemgroup|list|listheader)$/],
  ["滚动区", "独立", "`pui-scroll-area`", /^(?:scrollbar)$/],
  ["虚拟列表", "展示型", "`pui-virtual-list`", /^(?:virtuallist)$/],
  ["描述列表", "独立", "`pui-desc`", /^(?:descriptions|descriptionsitem)$/],
  ["统计数值", "独立", "`pui-stat` / `pui-animated-number`", /^(?:animatingnumbers|countup|rollingtext|statistic|trendarrow)$/],
  ["进度", "独立", "`pui-progress` / `pui-progress-circle`", /^(?:circle|circleprogress|progress|progressbar|progress-bar|progresscircle)$/],
  ["时间线", "独立", "`pui-timeline`", /^(?:timeline|timelineitem)$/],
  ["折叠面板", "独立", "`pui-collapse`", /^(?:accordion|accordiongroup|collapse|collapseitem|collapsetransition)$/],
  ["轮播", "独立", "`pui-carousel`", /^(?:carousel|carouselitem|slides|swipe|swipeitem|swiper|swiperitem)$/],
  ["图片", "独立", "`pui-image` / `pui-image-viewer`", /^(?:image|img|imagepreview|imageviewer|thumbnail)$/],
  ["二维码", "展示型", "`pui-qrcode`", /^(?:qrcode|qr-code)$/],
  ["评论", "独立", "`pui-comment`", /^(?:comment)$/],
  ["瀑布流", "独立", "`pui-masonry`", /^(?:masonry)$/],
  ["弹幕", "独立", "`pui-barrage`", /^(?:barrage)$/],
  ["媒体", "独立", "`pui-media`", /^(?:audio|video|lottie)$/],
  ["日历卡片", "独立", "`pui-calendar-card`", /^(?:calendarcard|calendaritem)$/],
  ["价格与优惠券", "独立", "`pui-price` / `pui-coupon`", /^(?:coupon|couponcell|couponlist|price)$/],
  ["地址与联系人", "模板", "`pui-address` / `pui-contact`", /^(?:address|addressedit|addresslist|contactcard|contactedit|contactlist)$/],
  ["警告提示", "独立", "`pui-alert`", /^(?:alert|noticebar|notice-bar)$/],
  ["全局消息", "独立", "`PUI.toast()` / `PUI.notification()`", /^(?:message|messagebox|notification|notify|toast)$/],
  ["加载", "独立", "`pui-spin` / `pui-load-more`", /^(?:dotloading|infiniteloading|infinitescroll|infinitescrollcontent|lazyload|loading|loadmore|spinner|spin|spinloading|swipeload)$/],
  ["骨架屏", "独立", "`pui-skeleton`", /^(?:skeleton|skeletonavatar|skeletonimage|skeletonitem|skeletonparagraph|skeletontext|skeletontitle)$/],
  ["空与结果", "独立", "`pui-empty` / `pui-result`", /^(?:empty|errorblock|result|resultpage)$/],
  ["页面指示", "独立", "`pui-page-indicator`", /^(?:indicator|pageindicator)$/],
  ["弹窗", "独立", "`pui-modal`", /^(?:dialog|modal)$/],
  ["抽屉", "独立", "`pui-drawer`", /^(?:drawer)$/],
  ["气泡与浮层", "独立", "`pui-popover` / `pui-floating-panel`", /^(?:floatingpanel|popover|popup|popupswiper)$/],
  ["确认气泡", "组合", "`pui-popover` + `pui-popconfirm-actions`", /^(?:popconfirm)$/],
  ["提示", "独立", "`pui-tooltip`", /^(?:tooltip)$/],
  ["引导", "独立", "`pui-tour`", /^(?:guide|tour|tourstep)$/],
  ["遮罩", "独立", "`pui-modal-mask` / `pui-mobile-sheet-mask`", /^(?:backdrop|mask|masking|scrollmask)$/],
  ["动作面板", "独立", "`pui-mobile-sheet`", /^(?:actionsheet|action-sheet|sharesheet)$/],
  ["通知栏", "独立", "`pui-mobile-notice`", /^(?:noticebar|notice-bar)$/],
  ["动作栏", "独立", "`pui-mobile-bottom`", /^(?:actionbar|actionbaricon|submitbar)$/],
  ["数字键盘", "独立", "`pui-number-keyboard`", /^(?:keyboard|numberkeyboard)$/],
  ["滑动操作", "独立", "`pui-mobile-swipe`", /^(?:itemoption|itemoptions|itemsliding|swipeaction|swipecell)$/],
  ["下拉刷新", "展示型", "`pui-pull-refresh`", /^(?:pulldownrefresh|pullrefresh|pulltorefresh|refresher|refreshercontent)$/],
  ["拖拽排序", "独立", "`pui-reorder`", /^(?:drag|reorder|reordergroup)$/],
  ["安全区", "独立", "`--pui-mobile-safe-bottom`", /^(?:safearea)$/],
  ["签名", "展示型", "`pui-signature`", /^(?:signature)$/],
  ["底部说明", "独立", "`pui-mobile-footer`", /^(?:footer)$/],
  ["动画", "展示型", "`pui-animate` / `pui-ripple`", /^(?:animate|transition|rippleeffect)$/],
  ["监视器", "展示型", "`pui-monitor`", /^(?:showmonitor)$/],
];

function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, "").replace(/[-_]/g, "");
}

function resolveComponent(name) {
  const normalized = normalize(name);
  for (const [capability, status, implementation, matcher] of rules) {
    if (matcher.test(normalized)) return { capability, status, implementation };
  }
  return { capability: "未映射", status: "缺失", implementation: "-" };
}

if (!fs.existsSync(sourceRoot)) {
  console.error(`Reference source not found: ${sourceRoot}`);
  process.exit(1);
}

const records = [];
for (const [platform, label, packageName, componentPath] of sources) {
  const packageRoot = path.join(sourceRoot, packageName);
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
  const directory = path.join(packageRoot, componentPath);
  const components = fs.readdirSync(directory, { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name).sort((a, b) => a.localeCompare(b));
  for (const component of components) records.push({ platform, label, version: packageJson.version, component, ...resolveComponent(component) });
}

const missing = records.filter((item) => item.status === "缺失");
const visible = records.filter((item) => item.status !== "内部");
const lines = [
  "# PUI 逐项对齐矩阵",
  "",
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  "",
  `扫描本机组件目录 **${records.length}** 项，其中公开可见或可表达能力 **${visible.length}** 项，框架内部能力 **${records.length - visible.length}** 项，未映射 **${missing.length}** 项。`,
  "",
  "> 验收规则：公开组件必须对应独立 PUI 组件、组合方案、页面模板或明确的原型展示型实现；框架运行时允许标记为内部能力。",
  "",
];

for (const [, label] of sources) {
  const items = records.filter((item) => item.label === label);
  lines.push(`## ${label} ${items[0].version}`, "", "| 原组件 | PUI 能力 | 交付类型 | 调用方式 |", "|---|---|---|---|");
  for (const item of items) lines.push(`| ${item.component} | ${item.capability} | ${item.status} | ${item.implementation} |`);
  lines.push("");
}

lines.push("## 验收结论", "");
if (missing.length) {
  lines.push(`当前仍有 ${missing.length} 项未映射：${missing.map((item) => `${item.label}/${item.component}`).join("、")}`);
} else {
  lines.push("当前逐项矩阵未发现未映射组件。公开组件均已对应 PUI 独立组件、组合方案、模板或展示型实现；框架内部件均已说明替代边界。");
}

fs.writeFileSync(outputFile, `${lines.join("\n")}\n`);
console.log(JSON.stringify({ sourceRoot, outputFile, scanned: records.length, visible: visible.length, internal: records.length - visible.length, missing: missing.length, missingItems: missing.map((item) => `${item.label}/${item.component}`) }, null, 2));
if (missing.length) process.exitCode = 2;
