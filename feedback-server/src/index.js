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
  p, li { margin: .4em 0; } ul { padding-left: 1.2em; }
  hr { margin: 44px 0; border: none; border-top: 1px solid #8884; }
  .dim { opacity: .6; font-size: 11px; }
</style>
</head>
<body>
<h1>天色 · Look Up 隐私政策</h1>
<p class="dim">生效日期：2026 年 11 月 1 日</p>
<p>本政策说明「天色 · Look Up」（以下简称「本应用」）在你使用过程中如何收集、使用、存储和保护相关信息。本应用无需注册账号，不展示广告，不进行跨应用或跨网站追踪，也不会出售、出租或以其他方式向第三方提供你的个人信息。</p>

<h2>一、我们处理的信息</h2>
<p><strong>位置信息。</strong>经你授权后，本应用会读取设备的位置，用于计算所在地的日出日落时间及当晚天象。位置信息保存在你的设备上。为确定所在城市名称，设备系统会通过 Apple 的地理编码服务解析该位置。</p>
<p><strong>城市与搜索信息。</strong>你关注的城市及搜索记录保存在你的设备上。搜索城市时，输入的名称会发送至 Open-Meteo 的地理编码服务以返回结果。</p>
<p><strong>日落后回访信息。</strong>日落后，本应用可能邀请你评价当晚的天空。仅当你主动作答时，以下信息会发送至我们的服务器：</p>
<ul>
  <li>你的评价（无明显色彩 / 少量晚霞 / 火烧云）；</li>
  <li>所评价城市的标识、经纬度（精度约 1 公里）、日落时间及当晚的预测数据；</li>
  <li>安装时随机生成的标识符（非设备标识符，删除应用后即失效），以及应用语言、版本号和作答时间。</li>
</ul>
<p>我们不收集你的姓名、联系方式、设备标识符或通讯录等信息，服务器亦不记录你的 IP 地址。</p>

<h2>二、信息的使用目的</h2>
<p>上述信息仅用于提供天象预测与提醒功能，以及评估和改进预测模型的准确性，不用于广告、用户画像或任何与上述目的无关的用途。</p>

<h2>三、第三方服务</h2>
<ul>
  <li><strong>Open-Meteo</strong>（open-meteo.com）：获取天气与空气质量预报，以及城市搜索。请求中仅包含经纬度或城市名称。</li>
  <li><strong>GDACS</strong>（gdacs.org，全球灾害预警协调系统）：获取热带气旋信息。请求中不包含你的任何信息。</li>
  <li><strong>Apple</strong>：通过系统提供的定位与地理编码服务确定所在城市，受 Apple 隐私政策约束。</li>
  <li><strong>Cloudflare</strong>：托管我们的回访服务器，回访信息存储于其数据库服务中。</li>
</ul>

<h2>四、你的权利</h2>
<ul>
  <li>你可以随时在系统设置中撤回位置或通知授权；撤回位置授权后，你仍可手动选择城市使用本应用。</li>
  <li>你可以在「设置 → 提醒 → 日落后回访」中关闭回访功能，关闭后不再发送任何回访信息。</li>
  <li>删除本应用即可清除设备上保存的全部数据，并使随机标识符失效。</li>
</ul>

<h2>五、本政策的更新</h2>
<p>我们可能适时更新本政策。更新后的版本将在本页面发布，并注明生效日期。</p>

<h2>六、联系我们</h2>
<p>如对本政策或你的信息有任何疑问，请发送邮件至 ${CONTACT_EMAIL}。</p>

<hr>

<h1 lang="en">Look Up Privacy Policy</h1>
<p class="dim">Effective 1 November 2026</p>
<p>This policy explains how Look Up (the "App") collects, uses, stores and protects information when you use it. The App requires no account, displays no advertising, does not track you across other apps or websites, and does not sell, rent or otherwise share your personal information with third parties.</p>

<h2>1. Information we process</h2>
<p><strong>Location.</strong> With your permission, the App reads your device's location to calculate local sunrise and sunset times and the evening sky. Location data is stored on your device. To determine the name of your city, the operating system resolves the location through Apple's geocoding service.</p>
<p><strong>Cities and searches.</strong> The cities you follow and your searches are stored on your device. When you search for a city, the name you enter is sent to Open-Meteo's geocoding service to return results.</p>
<p><strong>After-sunset check-in.</strong> After sunset, the App may invite you to rate the evening sky. Only if you choose to answer, the following is sent to our server:</p>
<ul>
  <li>Your rating (no notable colour / some colour / a vivid afterglow);</li>
  <li>The identifier of the rated city, its coordinates (to roughly 1 km), the sunset time and that evening's forecast data;</li>
  <li>A random identifier created at installation (not a device identifier; it ceases to exist when the App is deleted), together with the App's language, version and the time of your answer.</li>
</ul>
<p>We do not collect your name, contact details, device identifiers or contacts, and our server does not record your IP address.</p>

<h2>2. How we use information</h2>
<p>This information is used solely to provide sky forecasts and alerts and to evaluate and improve the accuracy of our forecast model. It is not used for advertising, profiling or any unrelated purpose.</p>

<h2>3. Third-party services</h2>
<ul>
  <li><strong>Open-Meteo</strong> (open-meteo.com): weather and air-quality forecasts, and city search. Requests contain only coordinates or a city name.</li>
  <li><strong>GDACS</strong> (gdacs.org, Global Disaster Alert and Coordination System): tropical cyclone data. Requests contain no information about you.</li>
  <li><strong>Apple</strong>: system location and geocoding services used to determine your city, subject to Apple's privacy policy.</li>
  <li><strong>Cloudflare</strong>: hosts our check-in server; check-in data is stored in its database service.</li>
</ul>

<h2>4. Your choices</h2>
<ul>
  <li>You may withdraw location or notification permission at any time in your device settings; without location access you can still choose cities manually.</li>
  <li>You may turn off the check-in under Settings → Alerts → After-sunset check-in, after which no check-in data is sent.</li>
  <li>Deleting the App removes all data stored on your device and invalidates the random identifier.</li>
</ul>

<h2>5. Changes to this policy</h2>
<p>We may update this policy from time to time. The updated version will be published on this page with its effective date.</p>

<h2>6. Contact</h2>
<p>If you have any questions about this policy or your information, please email ${CONTACT_EMAIL}.</p>
</body>
</html>`;
