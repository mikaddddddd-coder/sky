// Look Up feedback server (Cloudflare Worker + D1).
//   POST /feedback  one answer to the after-sunset question, from the app
//   GET  /privacy   the privacy policy linked from the app and the App Store listing
// No IP addresses or accounts are stored: only a random id the app makes on install.

// The address shown on the privacy page; App Store review needs a way to reach you.
const CONTACT_EMAIL = 'lmx901229@sina.com';
const MAX_BODY = 16 * 1024;
const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/feedback' && request.method === 'POST') return saveFeedback(request, env);
    if (url.pathname === '/privacy' || url.pathname === '/') return html(PRIVACY);
    return new Response('Not found', { status: 404 });
  },
};

async function saveFeedback(request, env) {
  const text = await request.text();
  if (text.length > MAX_BODY) return bad('too large');
  let e;
  try {
    e = JSON.parse(text);
  } catch {
    return bad('not json');
  }
  const ok =
    e &&
    [0, 1, 2].includes(e.rating) &&
    typeof e.installId === 'string' && /^[0-9a-f]{16}$/.test(e.installId) &&
    typeof e.key === 'string' && e.key.length <= 80 &&
    typeof e.cityId === 'string' && e.cityId.length <= 64 &&
    Number.isFinite(e.lat) && Math.abs(e.lat) <= 90 &&
    Number.isFinite(e.lon) && Math.abs(e.lon) <= 180 &&
    typeof e.sunset === 'string' && ISO.test(e.sunset) &&
    (e.why === 'score' || e.why === 'sample') &&
    e.forecast && typeof e.forecast === 'object';
  if (!ok) return bad('invalid');

  const f = e.forecast;
  const num = (v) => (Number.isFinite(v) ? v : null);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO feedback
       (received_at, install_id, evening_key, city_id, lat, lon, sunset, why, rating,
        score, vividness, edge_km, fire, lead_days, forecast_json, lang, app_version, answered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      new Date().toISOString(),
      e.installId,
      e.key,
      e.cityId,
      Math.round(e.lat * 100) / 100,
      Math.round(e.lon * 100) / 100,
      e.sunset,
      e.why,
      e.rating,
      num(f.score),
      num(f.vividness),
      num(f.edgeKm),
      f.fire ? 1 : 0,
      num(f.leadDays),
      JSON.stringify(f),
      typeof e.lang === 'string' ? e.lang.slice(0, 8) : null,
      typeof e.appVersion === 'string' ? e.appVersion.slice(0, 20) : null,
      typeof e.answeredAt === 'string' ? e.answeredAt.slice(0, 40) : null,
    )
    .run();
  return new Response(null, { status: 204 });
}

const bad = (why) => new Response(why, { status: 400 });
const html = (body) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

const PRIVACY = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>天色 · Look Up 隐私政策</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 12px/1.75 -apple-system, system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 28px 20px 56px; }
  h1 { font-size: 19px; margin-bottom: 4px; } h2 { font-size: 16px; margin: 1.8em 0 .4em; }
  p { margin: .4em 0; }
  hr { margin: 44px 0; border: none; border-top: 1px solid #8884; }
  .dim { opacity: .6; font-size: 11px; }
</style>
</head>
<body>
<h1>天色 · Look Up 隐私政策</h1>
<p class="dim">生效日期：2026 年 11 月 1 日</p>
<p>「天色 · Look Up」（以下简称「本应用」）无需注册账号，不展示广告，不进行跨应用追踪，也不会出售或向第三方提供你的个人信息。</p>

<h2>一、位置信息</h2>
<p>经你授权后，本应用使用设备位置计算当地的日落时间和天象，位置信息保存在你的设备上。获取天气预报时，所在地或所关注城市的经纬度会发送至天气数据服务 Open-Meteo。</p>

<h2>二、日落后回访</h2>
<p>日落后，本应用可能请你评价当晚的天空。仅当你作答时，你的评价、城市及其大致坐标（精度约 1 公里）、当晚的预测数据，以及一个安装时随机生成的标识符会发送至我们的服务器，用于改进预测模型。这些信息无法与你本人建立关联，我们也不记录你的 IP 地址。你可以在「设置 → 帮助改进预测 → 日落反馈」中关闭此功能。</p>

<h2>三、第三方服务</h2>
<p>天气与城市搜索数据来自 Open-Meteo，热带气旋信息来自 GDACS，城市名称由 Apple 系统定位服务解析，回访服务器由 Cloudflare 托管。</p>

<h2>四、政策更新</h2>
<p>本政策如有更新，将在本页面发布并注明生效日期。</p>

<h2>五、联系我们</h2>
<p>如有疑问，请发送邮件至 ${CONTACT_EMAIL}。</p>

<hr>

<h1 lang="en">Look Up Privacy Policy</h1>
<p class="dim">Effective 1 November 2026</p>
<p>Look Up (the "App") requires no account, shows no advertising, does not track you across apps, and does not sell or share your personal information with third parties.</p>

<h2>1. Location</h2>
<p>With your permission, the App uses your device's location to calculate local sunset times and the evening sky. Location data stays on your device. To fetch forecasts, the coordinates of your location or of the cities you follow are sent to the weather service Open-Meteo.</p>

<h2>2. After-sunset check-in</h2>
<p>After sunset, the App may ask you to rate the evening sky. Only if you answer, your rating, the city and its approximate coordinates (to about 1 km), that evening's forecast and a random identifier created at installation are sent to our server to improve the forecast model. This information cannot be linked to you, and we do not record your IP address. You can turn this off under Settings → Help improve forecasts → Sunset feedback.</p>

<h2>3. Third-party services</h2>
<p>Weather data and city search are provided by Open-Meteo, tropical cyclone data by GDACS, and city names are resolved by Apple's system location services. Our check-in server is hosted by Cloudflare.</p>

<h2>4. Changes</h2>
<p>Any update to this policy will be published on this page with its effective date.</p>

<h2>5. Contact</h2>
<p>Questions? Please email ${CONTACT_EMAIL}.</p>
</body>
</html>`;
