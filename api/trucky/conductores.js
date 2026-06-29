const TRUCKY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
  Referer: "https://hub.truckyapp.com/",
  Origin: "https://hub.truckyapp.com",
};

async function fetchJSON(url) {
  const headers = { ...TRUCKY_HEADERS };
  if (process.env.TRUCKY_API_TOKEN) {
    headers["x-access-token"] = process.env.TRUCKY_API_TOKEN;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fetchAllPages(baseUrl) {
  const first = await fetchJSON(baseUrl);
  const items = first.data || first.jobs || [];
  const totalPages = first.last_page || 1;
  if (totalPages <= 1) return items;
  const sep = baseUrl.includes("?") ? "&" : "?";
  const pages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchJSON(`${baseUrl}${sep}page=${i + 2}`)
    )
  );
  for (const p of pages) {
    const pi = p.data || p.jobs || [];
    items.push(...pi);
  }
  return items;
}

function normalizeJob(job) {
  const driverObj = job.driver || {};
  const driverName = typeof driverObj === "object"
    ? driverObj.name || driverObj.username || "Conductor TEPSA"
    : driverObj;
  return {
    driver: driverName,
    kilometers: Number(job.kilometers || job.km || job.distance || job.driven_distance_km || 0),
    damage: Number(job.damage || job.cargoDamage || job.cargo_damage || 0),
  };
}

function formatLastJob(days) {
  if (days == null || days === "") return "Sin registro";
  const n = Number(days);
  if (!Number.isFinite(n)) return "Sin registro";
  if (n === 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} días`;
}

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  try {
    const COMPANY_ID = process.env.TRUCKY_COMPANY_ID || "44302";
    const membersUrl = process.env.TRUCKY_API_URL || `https://e.truckyapp.com/api/v1/company/${COMPANY_ID}/members`;
    const jobsUrl = `https://e.truckyapp.com/api/v1/company/${COMPANY_ID}/jobs`;

    const [membersRaw, jobsRaw] = await Promise.all([
      fetchJSON(membersUrl),
      fetchAllPages(jobsUrl),
    ]);

    const members = Array.isArray(membersRaw?.data) ? membersRaw.data : [];
    const jobs = jobsRaw.map(normalizeJob).filter(j => j.driver && j.kilometers > 0);

    const damageByDriver = new Map();
    const jobsCountByDriver = new Map();
    jobs.forEach(job => {
      const name = job.driver;
      damageByDriver.set(name, (damageByDriver.get(name) || 0) + (Number(job.damage) || 0));
      jobsCountByDriver.set(name, (jobsCountByDriver.get(name) || 0) + 1);
    });

    const ranking = members.map(m => {
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
    }).sort((a, b) => (b.kilometers || 0) - (a.kilometers || 0) || (a.damage || 0) - (b.damage || 0));

    const result = {
      source: "trucky",
      updatedAt: new Date().toISOString(),
      ranking,
      stats: {
        kilometers: ranking.reduce((s, d) => s + d.kilometers, 0),
        drivers: ranking.length,
        active: ranking.filter(d => d.lastJobDays <= 7).length,
      },
    };

    sendJson(res, result);
  } catch (error) {
    sendJson(res, {
      source: "error",
      ranking: [],
      stats: { kilometers: 0, drivers: 0, active: 0 },
      error: error.message,
    }, 502);
  }
}
