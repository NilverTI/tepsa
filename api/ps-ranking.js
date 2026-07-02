const API = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  try {
    const r = await fetch(API, { cache: "no-store" });
    const data = await r.json();
    const item = data.items?.find(x => x.id === 44302);
    res.status(200).json({
      ok: true,
      position: data.items?.findIndex(x => x.id === 44302) + 1 || null,
      total: data.items?.length || 0,
      item: item || null,
      period: data.period || null,
    });
  } catch {
    res.status(200).json({ ok: false, position: null, total: 0, item: null });
  }
}
