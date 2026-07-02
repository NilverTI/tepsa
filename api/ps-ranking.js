const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
  Origin: "https://peruserver.pe",
  Referer: "https://peruserver.pe/",
};
const MONTHLY_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";
const YEARLY_URL = (y) => `https://api.mdcdev.me/v2/peruserver/trucky/top-km?month=1&year=${y}&limit=100`;
const COMPANY_ID = 44302;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  try {
    const year = new Date().getFullYear();
    const [monthlyRes, yearlyRes] = await Promise.all([
      fetch(MONTHLY_URL, { headers: HEADERS }),
      fetch(YEARLY_URL(year), { headers: HEADERS }),
    ]);
    if (!monthlyRes.ok) throw new Error("Monthly HTTP " + monthlyRes.status);
    if (!yearlyRes.ok) throw new Error("Yearly HTTP " + yearlyRes.status);
    const monthlyData = await monthlyRes.json();
    const yearlyData = await yearlyRes.json();
    const monthlyItems = monthlyData?.items || [];
    const yearlyItems = yearlyData?.items || [];
    const mIdx = monthlyItems.findIndex(x => x.id === COMPANY_ID);
    const yIdx = yearlyItems.findIndex(x => x.id === COMPANY_ID);
    res.status(200).json({
      ok: true,
      monthly: {
        position: mIdx >= 0 ? mIdx + 1 : null,
        total: monthlyItems.length,
        item: mIdx >= 0 ? monthlyItems[mIdx] : null,
      },
      yearly: {
        position: yIdx >= 0 ? yIdx + 1 : null,
        total: yearlyItems.length,
        item: yIdx >= 0 ? yearlyItems[yIdx] : null,
      },
    });
  } catch (err) {
    res.status(200).json({ ok: false, monthly: null, yearly: null, error: err.message });
  }
}
