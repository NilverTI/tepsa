const COMPANY_ID = "44302";
const MEMBERS_URL = `https://e.truckyapp.com/api/v1/company/${COMPANY_ID}/members`;
const JOBS_URL = `https://e.truckyapp.com/api/v1/company/${COMPANY_ID}/jobs`;

const TRUCKY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://hub.truckyapp.com/",
  Origin: "https://hub.truckyapp.com",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

async function fetchJSON(url) {
  const headers = { ...TRUCKY_HEADERS };
  if (process.env.TRUCKY_API_TOKEN) headers["x-access-token"] = process.env.TRUCKY_API_TOKEN;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchAllPages(baseUrl) {
  const first = await fetchJSON(baseUrl);
  const items = first.data || [];
  const totalPages = first.last_page || 1;
  if (totalPages <= 1) return items;
  const separator = baseUrl.includes("?") ? "&" : "?";
  const pages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchJSON(`${baseUrl}${separator}page=${i + 2}`)
    )
  );
  for (const page of pages) {
    const pageItems = page.data || [];
    items.push(...pageItems);
  }
  return items;
}

function normalizeJob(job) {
  const driverObj = job.driver || {};
  const driverName = typeof driverObj === "object"
    ? driverObj.name || driverObj.username || "Conductor TEPSA"
    : driverObj;
  return {
    driver: driverName || job.driverName || job.driver_name || "Conductor TEPSA",
    kilometers: Number(job.kilometers || job.km || job.distance || job.driven_distance_km || 0),
    damage: Number(job.damage || job.cargoDamage || job.cargo_damage || job.total_damage || 0),
  };
}

function formatLastJob(days) {
  if (days == null || days === "" || !Number.isFinite(Number(days))) return "Sin registro";
  const n = Number(days);
  if (n === 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} d\u00edas`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const membersUrl = process.env.TRUCKY_API_URL || MEMBERS_URL;
    const companyId = process.env.TRUCKY_COMPANY_ID || COMPANY_ID;
    const jobsUrl = `https://e.truckyapp.com/api/v1/company/${companyId}/jobs`;

    const [membersRaw, jobsRaw] = await Promise.all([
      fetchJSON(membersUrl),
      fetchAllPages(jobsUrl),
    ]);

    const members = membersRaw.data || [];
    const jobs = jobsRaw.map(normalizeJob).filter(j => j.driver && j.kilometers > 0);

    const damageByDriver = new Map();
    const jobsCountByDriver = new Map();
    jobs.forEach(job => {
      damageByDriver.set(job.driver, (damageByDriver.get(job.driver) || 0) + (Number(job.damage) || 0));
      jobsCountByDriver.set(job.driver, (jobsCountByDriver.get(job.driver) || 0) + 1);
    });

    const ranking = members
      .map(m => {
        const name = m.name || m.username || "Sin nombre";
        const lastJobDays = m.last_job_days != null && Number.isFinite(Number(m.last_job_days))
          ? Number(m.last_job_days) : 9999;
        return {
          name,
          kilometers: Math.round(m.total_driven_distance_km || 0),
          damage: Math.round(damageByDriver.get(name) || 0),
          totalJobs: jobsCountByDriver.get(name) || 0,
          points: Math.round(m.points || 0),
          lastJob: formatLastJob(m.last_job_days),
          lastJobDays,
          rank: m.rank?.name || "",
          role: m.role?.name || "",
          avatar: m.avatar_url || "",
          level: m.level || 0,
          country: m.country || "",
          cargoMass: Math.round(m.total_cargo_mass_t || 0),
          revenue: Math.round(m.total_revenue || 0),
        };
      })
      .sort((a, b) => {
        if (b.kilometers !== a.kilometers) return b.kilometers - a.kilometers;
        return a.damage - b.damage;
      });

    res.status(200).json({
      source: "trucky",
      updatedAt: new Date().toISOString(),
      ranking,
      stats: {
        kilometers: ranking.reduce((s, d) => s + d.kilometers, 0),
        drivers: ranking.length,
        active: ranking.filter(d => d.lastJobDays <= 7).length,
      },
    });
  } catch (error) {
    res.status(502).json({
      source: "demo",
      updatedAt: new Date().toISOString(),
      ranking: [],
      stats: { kilometers: 0, drivers: 0, active: 0 },
      error: error.message,
    });
  }
}
