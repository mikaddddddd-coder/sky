# 天色回访服务器

收集「日落后回访」的回答（存在 Cloudflare D1 数据库里），并提供隐私政策页 `https://lookup.minxi.work/privacy`。

## 第一次部署

需要 Node.js 和 Cloudflare 账号（和 poem 网页版用的是同一个账号）。在这个文件夹里运行：

```bash
npx wrangler login
```

```bash
npx wrangler d1 create lookup-feedback
```

把输出里的 `database_id` 填进 `wrangler.jsonc`，再把 `src/index.js` 顶部的 `CONTACT_EMAIL` 改成你想公开的联系邮箱，然后：

```bash
npx wrangler d1 execute lookup-feedback --remote --file=schema.sql
```

```bash
npx wrangler deploy
```

部署后打开 https://lookup.minxi.work/privacy 应该能看到隐私政策。

## 看数据

一共收到多少条，按回答分：

```bash
npx wrangler d1 execute lookup-feedback --remote --command "SELECT rating, COUNT(*) FROM feedback GROUP BY rating"
```

预测分数和实际结果对不对得上（按分数每 20 分一档，看每档里实际“烧起来了”的比例）：

```bash
npx wrangler d1 execute lookup-feedback --remote --command "SELECT CAST(score/20 AS INT)*20 AS bucket, COUNT(*) AS n, ROUND(AVG(rating=2)*100) AS fire_pct, ROUND(AVG(rating>=1)*100) AS any_colour_pct FROM feedback GROUP BY bucket ORDER BY bucket"
```

导出全部数据（用于以后调模型）：

```bash
npx wrangler d1 export lookup-feedback --remote --output=feedback.sql
```

`why = 'sample'` 的是分数较低、按大约三分之一的比例随机抽来问的晚上，统计时要乘 3 的权重，才能代表所有低分的晚上。
