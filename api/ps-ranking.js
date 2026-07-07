const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
  Origin: "https://peruserver.pe",
  Referer: "https://peruserver.pe/",
};
const API_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";
const COMPANY_ID = 44302;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const apiRes = await fetch(API_URL, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!apiRes.ok) throw new Error("HTTP " + apiRes.status);
    const data = await apiRes.json();
    const items = data?.items || [];
    const idx = items.findIndex(x => x.id === COMPANY_ID);
    const item = idx >= 0 ? items[idx] : null;
    res.status(200).json({
      ok: !!item,
      position: idx >= 0 ? idx + 1 : null,
      total: items.length,
      item: item,
      period: data.period || null,
    });
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message });
  }
}
