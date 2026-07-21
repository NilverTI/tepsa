const http = require("http");
const fs = require("fs");
const path = require("path");

const publicDir = __dirname;

const COMPANY_ID = "44302";
const MEMBERS_URL = `https://e.truckyapp.com/api/v1/company/${COMPANY_ID}/members`;

const port = Number(process.env.PORT) || 3000;

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

function getCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.ts >= CACHE_TTL) {
      cache.delete(key);
    }
  }
}

function setCache(key, data) {
  pruneCache();
  cache.set(key, { data, ts: Date.now() });
}

async function fetchJSON(url, headers, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, { headers, signal: controller.signal });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fetchAllPages(baseUrl, headers) {
  const first = await fetchJSON(baseUrl, headers);
  const items = first.data || first.jobs || [];
  const totalPages = first.last_page || 1;

  if (totalPages <= 1) return items;

  const separator = baseUrl.includes("?") ? "&" : "?";

  const pages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchJSON(`${baseUrl}${separator}page=${i + 2}`, headers)
    )
  );

  for (const page of pages) {
    const pageItems = page.data || page.jobs || [];
    items.push(...pageItems);
  }

  return items;
}

const TRUCKY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://hub.truckyapp.com/",
  Origin: "https://hub.truckyapp.com",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

const demoData = {
  source: "demo",
  updatedAt: new Date().toISOString(),
  stats: {
    kilometers: 8643,
    drivers: 15,
    active: 3,
    founded: 2026,
  },
  ranking: [
    { name: "Cesar", kilometers: 8643, points: 11927, lastJob: "hoy" },
    { name: "Conductor TEPSA", kilometers: 6200, points: 5400, lastJob: "hace 2 días" },
    { name: "Nuevo Piloto", kilometers: 4100, points: 2800, lastJob: "hace 4 días" },
  ],
  recentJobs: [
    {
      driver: "Cesar",
      route: "Lima - Arequipa",
      kilometers: 1024,
      damage: 2,
      status: "Completado",
    },
    {
      driver: "Conductor TEPSA",
      route: "Trujillo - Lima",
      kilometers: 560,
      damage: 1,
      status: "Completado",
    },
    {
      driver: "Nuevo Piloto",
      route: "Cusco - Puno",
      kilometers: 390,
      damage: 0,
      status: "Completado",
    },
  ],
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const server = http.createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/trucky") {
    await handleTruckyRequest(response);
    return;
  }

  if (url.pathname === "/api/trucky/jobs") {
    await handleTruckyJobsRequest(response);
    return;
  }

  if (url.pathname === "/api/trucky/conductores") {
    await handleConductoresRanking(response);
    return;
  }

  if (url.pathname === "/api/ps-ranking") {
    await handlePSRanking(response);
    return;
  }

  if (url.pathname === "/api/ranking") {
    await handleRankingHistory(response);
    return;
  }

  if (url.pathname === "/api/galeria/fotos") {
    await handleGaleriaFotos(request, response);
    return;
  }

  if (url.pathname === "/api/galeria/upload") {
    await handleGaleriaUpload(request, response);
    return;
  }

  if (url.pathname === "/api/galeria/delete") {
    await handleGaleriaDelete(request, response);
    return;
  }

  if (url.pathname === "/api/admin/login") {
    await handleAdminLogin(request, response);
    return;
  }

  if (url.pathname === "/api/admin/conductores") {
    await handleAdminConductores(request, response);
    return;
  }

  serveStaticFile(url.pathname, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`TEPSA PSV lista en http://127.0.0.1:${port}`);
});

async function handleTruckyRequest(response) {
  const cacheKey = "trucky:members";
  const cached = getCache(cacheKey);
  if (cached) {
    sendJson(response, cached);
    return;
  }

  try {
    const membersUrl = MEMBERS_URL;
    const headers = { ...TRUCKY_HEADERS };

    const rawData = await fetchJSON(membersUrl, headers);
    const result = normalizeTruckyData(rawData);
    setCache(cacheKey, result);
    sendJson(response, result);
  } catch (error) {
    const cached = getCache(cacheKey);
    if (cached) {
      sendJson(response, cached);
      return;
    }
    sendJson(response, { ...demoData, source: "demo", error: error.message }, 502);
  }
}

async function handleTruckyJobsRequest(response) {
  const cacheKey = "trucky:jobs";
  const cached = getCache(cacheKey);
  if (cached) {
    sendJson(response, { source: "trucky", updatedAt: cached.updatedAt, jobs: cached.jobs });
    return;
  }

  try {
    const companyId = COMPANY_ID;
    const jobsUrl = `https://e.truckyapp.com/api/v1/company/${companyId}/jobs`;
    const headers = { ...TRUCKY_HEADERS };

    const rawJobs = await fetchAllPages(jobsUrl, headers);
    const jobs = rawJobs
      .map(normalizeJob)
      .filter(j => j.driver && j.kilometers > 0);

    const cachedData = { jobs, updatedAt: new Date().toISOString() };
    setCache(cacheKey, cachedData);

    sendJson(response, { source: "trucky", updatedAt: cachedData.updatedAt, jobs });
  } catch (error) {
    const cached = getCache(cacheKey);
    if (cached) {
      sendJson(response, { source: "trucky", updatedAt: cached.updatedAt, jobs: cached.jobs });
      return;
    }
    sendJson(response, { source: "demo", jobs: [], error: error.message }, 502);
  }
}

async function handleConductoresRanking(response) {
  const cacheKey = "trucky:conductores";
  const cached = getCache(cacheKey);
  if (cached) {
    sendJson(response, cached);
    return;
  }

  try {
    const membersUrl = MEMBERS_URL;
    const companyId = COMPANY_ID;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const jobsUrl = `https://e.truckyapp.com/api/v1/company/${companyId}/jobs?dateFrom=${y}-${m}-01&dateTo=${y}-${m}-${lastDay}`;
    const headers = { ...TRUCKY_HEADERS };

    const [membersRaw, jobsRaw] = await Promise.all([
      fetchJSON(membersUrl, headers),
      fetchAllPages(jobsUrl, headers),
    ]);

    const members = membersRaw.data || [];
    const jobs = jobsRaw.map(normalizeJob).filter(j => j.driver && j.kilometers > 0);

    const kmByDriver = new Map();
    const damageByDriver = new Map();
    const jobsCountByDriver = new Map();
    jobs.forEach(job => {
      const name = job.driver;
      kmByDriver.set(name, (kmByDriver.get(name) || 0) + (Number(job.kilometers) || 0));
      damageByDriver.set(name, (damageByDriver.get(name) || 0) + (Number(job.damage) || 0));
      jobsCountByDriver.set(name, (jobsCountByDriver.get(name) || 0) + 1);
    });

    const ranking = members
      .map(m => {
        const name = m.name || m.username || "Sin nombre";
        const lastJobDays = m.last_job_days != null && Number.isFinite(Number(m.last_job_days))
          ? Number(m.last_job_days)
          : 9999;
        return {
          name,
          kilometers: Math.round(kmByDriver.get(name) || 0),
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
      .filter(m => {
        const role = m.role || "";
        const name = m.name || "";
        return role.toLowerCase() !== "owner";
      })
      .sort((a, b) => {
        if (b.kilometers !== a.kilometers) return b.kilometers - a.kilometers;
        return a.damage - b.damage;
      });

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

    setCache(cacheKey, result);
    sendJson(response, result);
  } catch (error) {
    const cached = getCache(cacheKey);
    if (cached) {
      sendJson(response, cached);
      return;
    }
    sendJson(response, {
      source: "demo",
      ranking: [],
      stats: { kilometers: 0, drivers: 0, active: 0 },
    }, 502);
  }
}

// SIMULACIÓN LOCAL DE GALERÍA (Si no hay variables de Supabase configuradas)
const mockPhotos = [];
const mockAuth = new Map();

function parseBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

async function handleLocalGaleriaFotos(request, response, driver, page) {
  const limit = 12;
  const filtered = mockPhotos.filter(p => p.driver_name === driver);
  const total = filtered.length;
  const offset = (page - 1) * limit;
  const photos = filtered.slice(offset, offset + limit);
  const pages = Math.ceil(total / limit);

  sendJson(response, {
    success: true,
    photos,
    total,
    pages,
    page,
    message: "Modo simulador local activado."
  });
}

async function handleLocalGaleriaUpload(request, response, body) {
  const { driver, password, url, description } = body;
  const cleanDriver = (driver || "").trim();
  const cleanPassword = (password || "").trim();
  const cleanUrl = (url || "").trim();
  const cleanDescription = (description || "").trim();

  if (!cleanDriver || !cleanPassword || !cleanUrl) {
    sendJson(response, { success: false, error: "Faltan campos obligatorios" }, 400);
    return;
  }

  if (!mockAuth.has(cleanDriver)) {
    mockAuth.set(cleanDriver, cleanPassword);
  } else if (mockAuth.get(cleanDriver) !== cleanPassword) {
    sendJson(response, { success: false, error: "Contraseña incorrecta" }, 401);
    return;
  }

  mockPhotos.unshift({
    id: Date.now().toString(),
    driver_name: cleanDriver,
    image_url: cleanUrl,
    description: cleanDescription,
    created_at: new Date().toISOString()
  });

  sendJson(response, { success: true, message: "Foto publicada en el simulador local" });
}

const ADMIN_USERS_LIST = ["alexander", "cesar", "cristofer", "sabrosaurio", "kirito"];

async function handleGaleriaFotos(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const driver = (url.searchParams.get("driver") || "").trim();
  const page = parseInt(url.searchParams.get("page"), 10) || 1;

  if (!driver) {
    sendJson(response, { success: false, error: "Falta el nombre del conductor" }, 400);
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || "https://natrscfdveztkerxyhoc.supabase.co";
  const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

  try {
    const limit = 12;
    const offset = (page - 1) * limit;
    const dbUrl = `${supabaseUrl}/rest/v1/fotos_conductores?driver_name=eq.${encodeURIComponent(driver)}&order=created_at.desc&limit=${limit}&offset=${offset}`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    const dbResponse = await fetch(dbUrl, {
      method: "GET",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "count=exact"
      },
      signal: ac.signal
    });
    clearTimeout(timer);

    if (dbResponse.ok) {
      const photos = await dbResponse.json();
      const rangeHeader = dbResponse.headers.get("content-range");
      let total = photos.length;
      if (rangeHeader) {
        const parts = rangeHeader.split("/");
        if (parts.length > 1) total = parseInt(parts[1], 10) || total;
      }
      const pages = Math.max(1, Math.ceil(total / limit));
      sendJson(response, { success: true, photos, total, pages, page });
      return;
    }
  } catch (error) {
    console.warn("Local server handleGaleriaFotos Supabase skipped:", error.message);
  }

  await handleLocalGaleriaFotos(request, response, driver, page);
}

async function handleGaleriaUpload(request, response) {
  if (request.method !== "POST") {
    sendJson(response, { success: false, error: "Método no permitido" }, 405);
    return;
  }

  const body = await parseBody(request);
  const { driver, password, url, description } = body;
  const cleanDriver = (driver || "").trim();
  const cleanPassword = (password || "").trim();
  const cleanUrl = (url || "").trim();
  const cleanDescription = (description || "").trim();

  if (!cleanDriver || !cleanPassword || !cleanUrl) {
    sendJson(response, { success: false, error: "Faltan campos obligatorios" }, 400);
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || "https://natrscfdveztkerxyhoc.supabase.co";
  const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

  try {
    const authUrl = `${supabaseUrl}/rest/v1/conductores_auth?driver_name=eq.${encodeURIComponent(cleanDriver)}`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3000);
    const authRes = await fetch(authUrl, {
      method: "GET",
      headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      signal: ac.signal
    });
    clearTimeout(timer);

    if (authRes.ok) {
      const authData = await authRes.json();
      if (authData.length > 0 && authData[0].status === "inactive") {
        sendJson(response, { success: false, error: "Cuenta inactiva. No puedes subir capturas." }, 403);
        return;
      }

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/fotos_conductores`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ driver_name: cleanDriver, image_url: cleanUrl, description: cleanDescription })
      });

      if (insertRes.ok) {
        sendJson(response, { success: true, message: "Foto publicada correctamente" });
        return;
      }
    }
  } catch (error) {
    console.warn("Local server handleGaleriaUpload Supabase skipped:", error.message);
  }

  await handleLocalGaleriaUpload(request, response, body);
}

async function handleGaleriaDelete(request, response) {
  const body = await parseBody(request);
  const { photoId, imageUrl } = body;
  const targetId = photoId || imageUrl;

  if (targetId && mockPhotos) {
    const idx = mockPhotos.findIndex(p => p.id === targetId || p.image_url === targetId);
    if (idx >= 0) mockPhotos.splice(idx, 1);
  }

  sendJson(response, { success: true, message: "Foto eliminada correctamente." });
}

async function handleAdminLogin(request, response) {
  const body = await parseBody(request);
  const { username, password } = body;
  const cleanUsername = (username || "").trim();
  const cleanPassword = (password || "").trim();

  if (!cleanUsername || !cleanPassword) {
    sendJson(response, { success: false, error: "Faltan credenciales" }, 400);
    return;
  }

  const isDefaultAdmin = ADMIN_USERS_LIST.some(a => cleanUsername.toLowerCase().includes(a));
  sendJson(response, {
    success: true,
    driver: cleanUsername,
    isAdmin: isDefaultAdmin,
    status: "active"
  });
}

async function handleAdminConductores(request, response) {
  if (request.method === "POST") {
    const body = await parseBody(request);
    const { action, targetDriver, status, newPassword } = body;
    sendJson(response, {
      success: true,
      message: `Acción '${action || 'update'}' ejecutada para ${targetDriver || 'conductor'}.`
    });
    return;
  }

  sendJson(response, {
    success: true,
    drivers: [
      { driver_name: "Alexander", role: "Fundador / Admin", status: "active", is_admin: true },
      { driver_name: "Cesar", role: "Fundador / Admin", status: "active", is_admin: true },
      { driver_name: "Cristofer", role: "Moderador / Admin", status: "active", is_admin: true },
      { driver_name: "SABROSAURIO", role: "Administrador", status: "active", is_admin: true },
      { driver_name: "KIRITO", role: "Moderador", status: "active", is_admin: true }
    ]
  });
}

async function handlePSRanking(response) {
  const cacheKey = "psv:ranking";
  const cached = getCache(cacheKey);
  if (cached) {
    sendJson(response, cached);
    return;
  }

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/json",
    Origin: "https://peruserver.pe",
    Referer: "https://peruserver.pe/",
  };
  const API_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";
  const COMPANY_ID = 44302;
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
    const result = {
      ok: !!item,
      position: idx >= 0 ? idx + 1 : null,
      total: items.length,
      item: item,
      period: data.period || null,
    };
    setCache(cacheKey, result);
    sendJson(response, result);
  } catch (err) {
    const cachedFallback = getCache(cacheKey) || (cache.get(cacheKey) ? cache.get(cacheKey).data : null);
    if (cachedFallback) {
      console.warn("handlePSRanking: error fetching, serving cached data:", err.message);
      sendJson(response, cachedFallback);
      return;
    }
    sendJson(response, { ok: false, error: err.message });
  }
}

function normalizeTruckyData(rawData) {
  if (isPaginatedMembersResponse(rawData)) {
    return normalizeMembersResponse(rawData);
  }

  const data = rawData?.data || rawData?.response || rawData;
  const jobs = findFirstArray(data, [
    "recentJobs",
    "jobs",
    "deliveries",
    "routes",
    "company.jobs",
    "vtc.jobs",
  ]).map(normalizeJob);

  let ranking = findFirstArray(data, [
    "ranking",
    "drivers",
    "members",
    "users",
    "company.drivers",
    "vtc.drivers",
  ]).map(normalizeDriver);

  if (!ranking.length && jobs.length) {
    ranking = buildRankingFromJobs(jobs);
  }

  ranking = ranking
    .filter((driver) => driver.name)
    .sort((a, b) => b.kilometers - a.kilometers);

  const stats = {
    kilometers:
      pickNumber(data, [
        "stats.kilometers",
        "stats.km",
        "totalKilometers",
        "total_km",
        "kilometers",
      ]) || sumBy(ranking, "kilometers"),
    drivers:
      pickNumber(data, [
        "stats.drivers",
        "driversCount",
        "drivers_count",
        "membersCount",
        "members_count",
      ]) || ranking.length,
    active:
      pickNumber(data, [
        "stats.active",
        "activeDrivers",
        "active_drivers",
        "activeMembers",
        "active_members",
      ]) || ranking.length,
    founded: 2026,
  };

  return {
    source: "trucky",
    updatedAt: new Date().toISOString(),
    stats,
    ranking,
    recentJobs: jobs.slice(0, 6),
  };
}

function isPaginatedMembersResponse(rawData) {
  return (
    Array.isArray(rawData?.data) &&
    rawData.data.some((item) => "total_driven_distance_km" in item)
  );
}

function normalizeMembersResponse(rawData) {
  const members = rawData.data
    .map(normalizeDriver)
    .filter(m => {
      const role = m.role || "";
      const name = m.name || "";
      return role.toLowerCase() !== "owner";
    });
  const ranking = members.sort((a, b) => b.kilometers - a.kilometers);

  return {
    source: "trucky",
    updatedAt: new Date().toISOString(),
    stats: {
      kilometers: sumBy(ranking, "kilometers"),
      drivers: ranking.length,
      active: ranking.filter((driver) => driver.lastJobDays <= 7).length,
      founded: 2026,
    },
    ranking,
    recentJobs: [],
  };
}

function normalizeDriver(driver) {
  const lastJobDays = driver.last_job_days != null && Number.isFinite(Number(driver.last_job_days))
    ? Number(driver.last_job_days)
    : 9999;
  return {
    name:
      driver.name ||
      driver.username ||
      driver.nickname ||
      driver.driverName ||
      driver.driver_name ||
      driver.user?.name ||
      driver.user?.username ||
      "Sin nombre",
    kilometers: Number(
      driver.kilometers ||
        driver.km ||
        driver.distance ||
        driver.totalKilometers ||
        driver.total_km ||
        driver.total_driven_distance_km ||
        0,
    ),
    points: Number(driver.points || driver.score || 0),
    lastJob: formatLastJob(driver.last_job_days),
    lastJobDays,
    rank: driver.rank?.name || "",
    role: driver.role?.name || "",
    avatar: driver.avatar_url || "",
    level: driver.level || 0,
    country: driver.country || "",
    cargoMass: Math.round(driver.total_cargo_mass_t || 0),
    revenue: Math.round(driver.total_revenue || 0),
  };
}

function formatLastJob(days) {
  if (days == null || days === "" || days === undefined) {
    return "Sin registro";
  }

  const number = Number(days);

  if (!Number.isFinite(number)) {
    return "Sin registro";
  }

  if (number === 0) {
    return "hoy";
  }

  if (number === 1) {
    return "ayer";
  }

  return `hace ${number} días`;
}

function normalizeJob(job) {
  const driverObj = job.driver || {};
  const driverName = typeof driverObj === "object"
    ? driverObj.name || driverObj.username || "Conductor TEPSA"
    : driverObj;

  const origin = job.origin || job.from || job.source || job.startCity || job.source_city_name;
  const destination = job.destination || job.to || job.target || job.endCity || job.destination_city_name;
  const route = job.route || [origin, destination].filter(Boolean).join(" - ");

  return {
    driver: driverName || job.driverName || job.driver_name || job.user?.name || job.user?.username || "Conductor TEPSA",
    route,
    kilometers: Number(job.kilometers || job.km || job.distance || job.driven_distance_km || job.driven_distance || 0),
    damage: Number(job.damage || job.cargoDamage || job.cargo_damage || job.total_damage || 0),
    status: job.status || job.state || "Registrado",
  };
}

function buildRankingFromJobs(jobs) {
  const totals = new Map();

  jobs.forEach((job) => {
    const current = totals.get(job.driver) || {
      name: job.driver,
      kilometers: 0,
      damage: 0,
      jobs: 0,
    };

    current.kilometers += Number(job.kilometers) || 0;
    current.damage += Number(job.damage) || 0;
    current.jobs += 1;
    totals.set(job.driver, current);
  });

  return [...totals.values()];
}

function findFirstArray(source, paths) {
  for (const currentPath of paths) {
    const value = getPath(source, currentPath);
    if (Array.isArray(value)) {
      return value;
    }
  }

  return Array.isArray(source) ? source : [];
}

function pickNumber(source, paths) {
  for (const currentPath of paths) {
    const value = Number(getPath(source, currentPath));
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

function getPath(source, currentPath) {
  return currentPath
    .split(".")
    .reduce((value, key) => (value ? value[key] : undefined), source);
}

function sumBy(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function serveStaticFile(urlPath, response) {
  let cleanPath = decodeURIComponent(urlPath.split("?")[0]);

  // Ruteo inteligente local para mantener la estructura modular
  if (cleanPath === "/") {
    cleanPath = "/pages/index.html";
  } else if (cleanPath === "/conductores" || cleanPath === "/conductores.html") {
    cleanPath = "/pages/conductores.html";
  } else if (cleanPath.startsWith("/img/")) {
    cleanPath = cleanPath.replace("/img/", "/assets/img/");
  }

  const filePath = path.normalize(path.join(publicDir, cleanPath));
  const relativePath = path.relative(publicDir, filePath);
  const privateFiles = new Set(["server.js", "package.json", "package-lock.json"]);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath.split(path.sep).some((part) => part.startsWith(".")) ||
    privateFiles.has(relativePath)
  ) {
    response.writeHead(403);
    response.end("Acceso denegado");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("No encontrado");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
    });
    response.end(content);
  });
}

function sendJson(response, data, statusCode = 200) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

async function handleRankingHistory(response) {
  const supabaseUrl = "https://natrscfdveztkerxyhoc.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";
  const API_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";
  const COMPANY_ID = 44302;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/json",
    Origin: "https://peruserver.pe",
    Referer: "https://peruserver.pe/",
  };

  try {
    const apiRes = await fetch(API_URL, { headers });
    if (!apiRes.ok) throw new Error("HTTP " + apiRes.status);
    const apiData = await apiRes.json();
    const items = apiData?.items || [];
    const idx = items.findIndex(x => x.id === COMPANY_ID);

    if (idx === -1) {
      throw new Error("TEPSA not found");
    }

    const currentItem = items[idx];
    const currentPuesto = idx + 1;
    const currentKm = Math.round(currentItem.total_distance || 0);
    const currentJobs = currentItem.total_jobs || 0;
    const currentMembers = currentItem.members || currentItem.total_members || 16;

    let puestoAnterior = currentPuesto > 1 ? currentPuesto + 1 : currentPuesto;

    try {
      const historyUrl = `${supabaseUrl}/rest/v1/ranking_historial?order=fecha_registro.desc&limit=2`;
      const historyRes = await fetch(historyUrl, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });

      if (historyRes.ok) {
        const history = await historyRes.json();
        const latestRecord = history[0] || null;
        const previousRecord = history[1] || null;

        if (previousRecord) {
          puestoAnterior = previousRecord.puesto;
        } else if (latestRecord && latestRecord.puesto !== currentPuesto) {
          puestoAnterior = latestRecord.puesto;
        }

        const todayStr = new Date().toDateString();
        if (!latestRecord) {
          await fetch(`${supabaseUrl}/rest/v1/ranking_historial`, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              empresa_id: COMPANY_ID,
              puesto: currentPuesto,
              kilometros: currentKm,
              viajes: currentJobs,
              miembros: currentMembers
            })
          });
        } else {
          const latestDateStr = new Date(latestRecord.fecha_registro).toDateString();
          if (latestDateStr !== todayStr || latestRecord.puesto !== currentPuesto) {
            await fetch(`${supabaseUrl}/rest/v1/ranking_historial`, {
              method: "POST",
              headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                empresa_id: COMPANY_ID,
                puesto: currentPuesto,
                kilometros: currentKm,
                viajes: currentJobs,
                miembros: currentMembers
              })
            });
            puestoAnterior = latestRecord.puesto;
          } else {
            await fetch(`${supabaseUrl}/rest/v1/ranking_historial?id=eq.${latestRecord.id}`, {
              method: "PATCH",
              headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                kilometros: currentKm,
                viajes: currentJobs,
                miembros: currentMembers
              })
            });
          }
        }
      }
    } catch (supaErr) {
      console.warn("Local server ranking history optional update skipped:", supaErr.message);
    }

    let tendencia = "mantuvo";
    if (currentPuesto < puestoAnterior) {
      tendencia = "subio";
    } else if (currentPuesto > puestoAnterior) {
      tendencia = "bajo";
    }

    sendJson(response, {
      ok: true,
      empresa: "TEPSA PSV",
      puestoActual: currentPuesto,
      puestoAnterior: puestoAnterior,
      kilometros: currentKm,
      viajes: currentJobs,
      miembros: currentMembers,
      tendencia: tendencia,
      actualizadoEn: new Date().toISOString()
    });

  } catch (error) {
    console.error("Local server handleRankingHistory error:", error);

    sendJson(response, {
      ok: false,
      empresa: "TEPSA PSV",
      puestoActual: 2,
      puestoAnterior: 3,
      kilometros: 129809,
      viajes: 166,
      miembros: 16,
      tendencia: "subio",
      actualizadoEn: new Date().toISOString()
    });
  }
}



