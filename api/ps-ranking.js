const API_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  try {
    const apiRes = await fetch(API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Origin: "https://peruserver.pe",
        Referer: "https://peruserver.pe/",
      },
    });
    if (!apiRes.ok) throw new Error("HTTP " + apiRes.status);
    const data = await apiRes.json();
    const items = data?.items || [];
    const idx = items.findIndex(x => x.id === 44302);
    const item = idx >= 0 ? items[idx] : null;
    res.status(200).json({
      ok: !!item,
      position: idx >= 0 ? idx + 1 : null,
      total: items.length,
      item: item,
      period: data.period || null,
    });
  } catch (err) {
    res.status(200).json({ ok: false, position: null, total: 0, item: null, error: err.message });
  }
}
