/* ==========================================================================
   CENTRALIZED API CONFIGURATION & UTILITIES - TEPSA PSV BACKEND
   ========================================================================== */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://natrscfdveztkerxyhoc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdHJzY2ZkdmV6dGtlcnh5aG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTA4MzAsImV4cCI6MjA5OTM2NjgzMH0.9bof3LIsQiVKWZwmnNVmdPlX3xDYxWEMb6MEIFDL8aQ";

const PERUSERVER_API_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";
const TEPSA_COMPANY_ID = 44302;

const PERUSERVER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
  Origin: "https://peruserver.pe",
  Referer: "https://peruserver.pe/",
};

const TRUCKY_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://hub.truckyapp.com/",
  Origin: "https://hub.truckyapp.com",
};

const ADMIN_USERS = ["alexander", "cesar", "cristofer", "sabrosaurio", "kirito"];

function isUserAdmin(username) {
  if (!username) return false;
  const lower = username.trim().toLowerCase();
  return ADMIN_USERS.some(a => lower.includes(a));
}

function normalizeImageUrl(url) {
  if (!url) return "";
  let clean = url.trim();

  // Convert Google Drive Links to direct high-res image CDN links
  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|thumbnail\?id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/;
  const match = clean.match(driveRegex);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
  }

  // Convert Dropbox links (dl=0 -> raw=1)
  if (clean.includes("dropbox.com") && clean.includes("dl=0")) {
    return clean.replace("dl=0", "raw=1");
  }

  return clean;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Robustly finds TEPSA PSV within any PeruServer API response format.
 * Validates data structure: arrays, wrapper objects (data, items, rankings, empresas, etc.).
 * Prioritizes ID matching (44302) then normalized name matching.
 */
function findTepsaCompany(apiData) {
  if (!apiData) return { item: null, index: -1, total: 0, items: [] };

  let items = [];
  if (Array.isArray(apiData)) {
    items = apiData;
  } else if (Array.isArray(apiData.items)) {
    items = apiData.items;
  } else if (Array.isArray(apiData.data)) {
    items = apiData.data;
  } else if (Array.isArray(apiData.rankings)) {
    items = apiData.rankings;
  } else if (Array.isArray(apiData.empresas)) {
    items = apiData.empresas;
  } else if (Array.isArray(apiData.results)) {
    items = apiData.results;
  } else if (Array.isArray(apiData.monthlyRanking)) {
    items = apiData.monthlyRanking;
  }

  if (!items || !items.length) return { item: null, index: -1, total: 0, items: [] };

  const normalize = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/\[.*?\]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

  // 1. Search by exact ID (44302)
  let index = items.findIndex((x) => {
    if (!x) return false;
    const itemId = String(x.id || x.company_id || x.empresa_id || "");
    return itemId === String(TEPSA_COMPANY_ID);
  });

  // 2. Search by normalized name ("tepsa" or starts with "tepsa")
  if (index === -1) {
    index = items.findIndex((x) => {
      if (!x) return false;
      const norm = normalize(x.name || x.empresa || x.company_name);
      return norm === "tepsa" || norm.startsWith("tepsa");
    });
  }

  const item = index >= 0 ? items[index] : null;
  return { item, index, total: items.length, items };
}

/**
 * Safely calculates 1-indexed position from company item or array index.
 */
function getCompanyPosition(item, index) {
  if (!item && index < 0) return null;
  const rawPos = item?.position ?? item?.posicion ?? item?.rank ?? item?.ranking ?? item?.puesto;
  if (rawPos != null && !isNaN(Number(rawPos)) && Number(rawPos) > 0) {
    return Math.floor(Number(rawPos));
  }
  if (index >= 0) {
    return index + 1;
  }
  return null;
}

/**
 * Calculates movement direction and human-readable text.
 */
function computeMovement(currentPos, previousPos) {
  const curr = Number(currentPos);
  const prev = Number(previousPos);

  if (isNaN(curr) || isNaN(prev)) {
    return { movement: "same", tendencia: "mantuvo", text: "mantiene" };
  }

  if (curr < prev) {
    return { movement: "up", tendencia: "subio", text: `subió de #${prev}` };
  } else if (curr > prev) {
    return { movement: "down", tendencia: "bajo", text: `bajó de #${prev}` };
  } else {
    return { movement: "same", tendencia: "mantuvo", text: `mantiene en #${curr}` };
  }
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_KEY,
  PERUSERVER_API_URL,
  TEPSA_COMPANY_ID,
  PERUSERVER_HEADERS,
  TRUCKY_HEADERS,
  ADMIN_USERS,
  isUserAdmin,
  normalizeImageUrl,
  fetchWithTimeout,
  findTepsaCompany,
  getCompanyPosition,
  computeMovement
};


