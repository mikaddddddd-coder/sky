# 天色 · Look Up

一个观察天象的 iOS app：提醒你今晚有没有火烧云、月亮或金星值不值得看，以及附近有没有台风。界面支持中文和英文。

## 现在是免费版

第一版完全免费：没有内购、没有广告，所以可以继续用 Open-Meteo 的免费接口（非商业用途）。会员功能（拍摄指南、7 天展望、日出霞光、提醒选项）全部对所有人开放，会员页隐藏。
以后要收费时：把 `src/lib/settings.tsx` 里的 `PAYMENTS_ENABLED` 改成 `true`，接上真正的内购，并换成 Open-Meteo 的付费订阅（或别的可商用数据源）。

### 日落后回访

日落后约 35 分钟，App 会问第一个关注城市「今晚的天空怎么样？」（没什么颜色 / 有点晚霞 / 烧起来了）。回答会匿名地连同当晚的预测一起发到 `../feedback-server`（Cloudflare Worker + D1），以后用来校准火烧云模型。分数 ≥ 30 的晚上都会问，低分的晚上大约每三天问一次，这样「预测说不会烧」的晚上也有数据。用户可以在设置里关掉。

## 运行

### 在 Mac 的 iOS 模拟器里运行

1. 从 App Store 安装 **Xcode**，打开一次，同意许可协议，等它装完组件
2. 安装 Node.js 20 或更高版本（https://nodejs.org ）
3. 在项目目录运行：

```bash
npm install
npx expo start
```

4. 终端出现二维码后按 **i**，会自动打开 iPhone 模拟器并装好 Expo Go

### 在自己的 iPhone 上运行

`npx expo start` 后用 iPhone 相机扫二维码（需要先装 Expo Go，手机和电脑在同一个 Wi-Fi）。

### 类型检查

```bash
npm run typecheck
```

## 目录结构

```
src/
  app/                    Expo Router 路由
    _layout.tsx           根布局（设置 Provider）
    (tabs)/index.tsx      今晚：各城市的天空报告
    (tabs)/cities.tsx     选择关注的城市
    (tabs)/settings.tsx   语言、提醒开关、数据来源、隐私政策
    glow.tsx / sun.tsx / moon.tsx / venus.tsx / typhoon.tsx   各天象的详情页
    feedback.tsx          日落后回访的问题页
    member.tsx            会员页（免费版里隐藏）
  components/             天空渐变背景、卡片、城市报告
  constants/              城市列表、配色
  lib/
    api/openMeteo.ts      云量、湿度、降水、气溶胶（Open-Meteo，无需 key）
    api/typhoon.ts        西太平洋热带气旋（GDACS）
    sky/sunsetGlow.ts     火烧云评分模型
    sky/astro.ts          日落、暮光、月相、金星、月金相合（astronomy-engine，本地计算）
    sky/report.ts         汇总每个城市的「今晚报告」
    notifications.ts      本地通知调度（含日落后回访）
    background.ts         后台定时刷新预报和提醒
    feedback.ts           回访：什么时候问、存回答、离线时排队重发
    i18n/strings.ts       中英文案
    settings.tsx          用户设置（AsyncStorage 持久化）
```

## 火烧云模型

在日落时刻综合以下因素给出 0–100 的概率：

1. **画布**：头顶要有中高云（约 30–70% 最佳）
2. **光路**：沿日落方位角往外约 150 km 处的低云要少，否则阳光照不到云底
3. **空气**：气溶胶光学厚度（AOD）适中；空气太脏颜色会发灰
4. **降雨**：日落时下雨会大幅扣分；之前下过雨、日落时放晴则加分

## 路线图

- [x] 后台刷新（App 没打开也能收到提醒；iOS 决定多久跑一次）
- [ ] 服务端定时任务 + 远程推送（更准时）
- [x] GPS 定位 / 自定义城市
- [x] 收集用户反馈（日落后回访）
- [ ] 用收集到的反馈校准火烧云模型
- [ ] 台风路径图
- [ ] 主屏幕小组件（Widget）、实时活动（Live Activity）
- [x] App 图标和正式名字（天色 · Look Up，bundle id `com.mikali.lookup`）
- [ ] 内购会员（`PAYMENTS_ENABLED`）+ 可商用的数据源
