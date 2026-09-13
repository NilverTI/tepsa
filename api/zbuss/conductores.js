const {
  TRUCKY_HEADERS,
  fetchWithTimeout
} = require("../_config");

const ZBUSS_COMPANY_ID = "41534";
const MEMBERS_URL = `https://e.truckyapp.com/api/v1/company/${ZBUSS_COMPANY_ID}/members`;

async function fetchJSON(url) {
  const res = await fetchWithTimeout(url, { headers: TRUCKY_HEADERS }, 7000);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fetchAllPages(baseUrl) {
  const first = await fetchJSON(baseUrl);
  const items = first.data || [];
  const totalPages = Math.min(first.last_page || 1, 5); // Limit to 5 pages max for speed
  if (totalPages <= 1) return items;
  const separator = baseUrl.includes("?") ? "&" : "?";
  const pages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchJSON(`${baseUrl}${separator}page=${i + 2}`).catch(() => null)
    )
  );
  for (const page of pages) {
    if (page && page.data) {
      items.push(...page.data);
    }
  }
  return items;
}

function normalizeDriverName(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function formatLastJob(days) {
  if (days == null || days === "" || !Number.isFinite(Number(days)) || days === 9999) return "Sin registro";
  const n = Number(days);
  if (n === 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} días`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=60");
    const companyId = ZBUSS_COMPANY_ID;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();

    const jobsUrl = `https://e.truckyapp.com/api/v1/company/${companyId}/jobs?dateFrom=${y}-${m}-01&dateTo=${y}-${m}-${lastDay}`;

    const [membersRaw, jobsRaw] = await Promise.all([
      fetchJSON(MEMBERS_URL),
      fetchAllPages(jobsUrl).catch(() => []),
    ]);

    const members = membersRaw.data || [];
    const jobs = Array.isArray(jobsRaw) ? jobsRaw : [];

    // Map stats by user_id and normalized driver name
    const statsById = new Map();
    const statsByName = new Map();

    jobs.forEach(job => {
      const uid = job.user_id || job.driver?.id;
      const rawName = job.driver?.name || job.driver?.username || job.in_game_profile_name || "";
      const normName = normalizeDriverName(rawName);

      const km = Number(job.driven_distance_km || job.planned_distance_km || job.kilometers || 0);
      // Correctly read vehicle/total damage from Trucky API
      const rawDamage = job.total_damage != null ? job.total_damage : (job.vehicle_damage != null ? job.vehicle_damage : 0);
      const dmg = Math.min(100, Math.max(0, Math.round(Number(rawDamage))));

      if (uid) {
        if (!statsById.has(uid)) statsById.set(uid, { km: 0, sumDamage: 0, jobs: 0 });
        const s = statsById.get(uid);
        s.km += km;
        s.sumDamage += dmg;
        s.jobs += 1;
      }

      if (normName) {
        if (!statsByName.has(normName)) statsByName.set(normName, { km: 0, sumDamage: 0, jobs: 0 });
        const sn = statsByName.get(normName);
        sn.km += km;
        sn.sumDamage += dmg;
        sn.jobs += 1;
      }
    });

    const ranking = members
      .map(m => {
        const rawName = m.name || m.username || "Sin nombre";
        const norm = normalizeDriverName(rawName);
        const lastJobDays = m.last_job_days != null && Number.isFinite(Number(m.last_job_days))
          ? Number(m.last_job_days) : 9999;

        // Retrieve matched job stats by id first, fallback by normalized name
        const s = statsById.get(m.id) || statsByName.get(norm) || { km: 0, sumDamage: 0, jobs: 0 };
        
        // Average damage percentage per trip (Daño Promedio)
        const avgDamage = s.jobs > 0 ? Math.min(100, Math.round(s.sumDamage / s.jobs)) : 0;
        const totalKm = s.km > 0 ? Math.round(s.km) : Math.round(Number(m.total_driven_distance_km || 0));

        return {
          id: m.id,
          name: rawName,
          kilometers: totalKm,
          damage: avgDamage,
          totalJobs: s.jobs || Number(m.total_jobs || 0),
          points: Math.round(m.points || 0),
          lastJob: formatLastJob(m.last_job_days),
          lastJobDays,
          rank: m.rank?.name || "",
          role: m.role?.name || "Conductor",
          avatar: m.avatar_url || "",
          level: m.level || 0,
          country: m.country || "PE",
          cargoMass: Math.round(m.total_cargo_mass_t || 0),
          revenue: Math.round(m.total_revenue || 0),
        };
      })
      .filter(m => {
        const role = (m.role || "").toLowerCase();
        return !/\bowner\b/i.test(role);
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
        kilometers: ranking.reduce((s, d) => s + d.kilometers, 0) || 29012,
        drivers: ranking.length,
        active: ranking.filter(d => d.lastJobDays <= 7).length,
        founded: 2026
      },
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.status(502).json({
      source: "demo",
      updatedAt: new Date().toISOString(),
      ranking: [],
      stats: { kilometers: 0, drivers: 0, active: 0 },
      error: error.message,
    });
  }
};
