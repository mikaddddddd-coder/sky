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
  body { font: 16px/1.7 -apple-system, system-ui, sans-serif; max-width: 680px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 24px; } h2 { font-size: 18px; margin-top: 2em; }
  hr { margin: 48px 0; border: none; border-top: 1px solid #8884; }
  .dim { opacity: .65; font-size: 14px; }
</style>
</head>
<body>
<h1>天色 · Look Up 隐私政策</h1>
<p class="dim">更新于 2026 年 10 月 31 日</p>
<p>天色不需要注册账号，不投放广告，不追踪你在其他 App 或网站上的行为，也不出售任何数据。</p>
<h2>位置</h2>
<p>如果你允许，天色会读取你的位置，用来计算当地的日落时间和今晚的天象。位置保存在你的手机上；离开手机的只有两种情况：查询天气时发给 Open-Meteo 的经纬度（见下文「天气数据」），以及你回答日落后回访时，连同回答一起发给我们的约 1 公里精度的坐标（见下文「日落后回访」）。</p>
<h2>天气数据</h2>
<p>为了获取预报，App 会把你关注的城市（或你当前位置）的经纬度发送给 Open-Meteo（open-meteo.com），热带气旋信息来自 GDACS（gdacs.org）。这些请求不包含任何能识别你身份的信息。</p>
<h2>日落后回访</h2>
<p>日落后，App 可能会问你今晚的天空怎么样。如果你回答，我们会把以下内容发送到我们的服务器，用来改进预测：</p>
<ul>
  <li>你的回答（没什么颜色 / 有点晚霞 / 烧起来了）</li>
  <li>城市和经纬度（四舍五入到约 1 公里）、日落时间、当晚的预测数据</li>
  <li>App 安装时随机生成的一串编号（不是设备编号，删除 App 后即失效）、App 语言和版本</li>
</ul>
<p>我们不保存你的 IP 地址，也无法把回答和你本人对应起来。你可以随时在「设置 → 提醒 → 日落后回访」关闭它。</p>
<h2>通知</h2>
<p>提醒都是在你的手机上生成的本地通知，我们不会给你推送营销信息。</p>
<h2>联系</h2>
<p>有任何问题，请发邮件至 ${CONTACT_EMAIL}。</p>

<hr>

<h1 lang="en">Look Up Privacy Policy</h1>
<p class="dim">Updated 31 October 2026</p>
<p>Look Up needs no account, shows no ads, does not track you across other apps or websites, and never sells data.</p>
<h2>Location</h2>
<p>If you allow it, Look Up reads your location to work out local sunset times and tonight's sky. It is kept on your phone and leaves it only in two ways: as coordinates sent to Open-Meteo to fetch the forecast (see Weather data), and, rounded to about 1 km, together with your answer when you reply to the after-sunset check-in (see below).</p>
<h2>Weather data</h2>
<p>To fetch forecasts, the app sends the coordinates of the cities you follow (or of your current location) to Open-Meteo (open-meteo.com). Tropical cyclone data comes from GDACS (gdacs.org). These requests carry nothing that identifies you.</p>
<h2>After-sunset check-in</h2>
<p>After sunset the app may ask how the sky turned out. If you answer, we send the following to our server to improve the forecast:</p>
<ul>
  <li>Your answer (no colour / some colour / on fire)</li>
  <li>The city and its coordinates (rounded to about 1 km), the sunset time and that evening's forecast</li>
  <li>A random id created when the app is installed (not a device identifier; it is gone when you delete the app), the app's language and version</li>
</ul>
<p>We do not store your IP address and cannot link answers to you. You can turn it off at any time in Settings → Alerts → After-sunset check-in.</p>
<h2>Notifications</h2>
<p>Alerts are local notifications created on your phone. We never send marketing messages.</p>
<h2>Contact</h2>
<p>Questions? Email ${CONTACT_EMAIL}.</p>
</body>
</html>`;
