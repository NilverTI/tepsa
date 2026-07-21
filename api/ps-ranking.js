const {
  PERUSERVER_API_URL,
  TEPSA_COMPANY_ID,
  PERUSERVER_HEADERS,
  fetchWithTimeout
} = require("./_config");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const apiRes = await fetchWithTimeout(PERUSERVER_API_URL, { headers: PERUSERVER_HEADERS }, 8000);
    if (!apiRes.ok) throw new Error("HTTP " + apiRes.status);
    const data = await apiRes.json();
    const items = data?.items || [];
    const idx = items.findIndex(x => x.id === TEPSA_COMPANY_ID);
    const item = idx >= 0 ? items[idx] : null;

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=60");
    res.status(200).json({
      ok: !!item,
      position: idx >= 0 ? idx + 1 : null,
      total: items.length,
      item: item,
      period: data.period || null,
    });
  } catch (err) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.status(200).json({ ok: false, error: err.message });
  }
};
