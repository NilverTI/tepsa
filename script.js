const FOUNDER_NAMES = ["Alexander", "Cesar", "Cristofer", "admpsv"];

const fallbackTruckyData = {
  source: "demo",
  updatedAt: new Date().toISOString(),
  stats: { kilometers: 249734, drivers: 14, active: 6, founded: 2026 },
  ranking: [
    { name: "[TPS] Joker", kilometers: 35229, points: 36230, lastJobDays: 1, role: "Conductor", avatar: "", damage: 3355, level: 6, revenue: 27920645, cargo: 388 },
    { name: "[TPS]KANIEL_OUT", kilometers: 28400, points: 30100, lastJobDays: 0, role: "Conductor", avatar: "", damage: 569, level: 3, revenue: 8326510, cargo: 101 },
    { name: "[TPS]RENZITO", kilometers: 22100, points: 25800, lastJobDays: 2, role: "Conductor", avatar: "", damage: 2124, level: 3, revenue: 5282808, cargo: 64 },
    { name: "[TPS]EMPERADOR", kilometers: 19800, points: 22400, lastJobDays: 1, role: "Conductor", avatar: "", damage: 1625, level: 2, revenue: 3037086, cargo: 34 },
    { name: "[TPS] Lexus", kilometers: 16200, points: 18900, lastJobDays: 5, role: "Conductor", avatar: "", damage: 16448, level: 6, revenue: 13398366, cargo: 155 },
    { name: "[ TPS ]?KEVIN? ?", kilometers: 12800, points: 15400, lastJobDays: 0, role: "Conductor", avatar: "", damage: 1928, level: 5, revenue: 19590207, cargo: 212 },
    { name: "[TPS] Angel", kilometers: 9500, points: 11200, lastJobDays: 3, role: "Conductor", avatar: "", damage: 3610, level: 4, revenue: 13414766, cargo: 127 },
    { name: "[TPS] Johan-19", kilometers: 7200, points: 8900, lastJobDays: 7, role: "Conductor", avatar: "", damage: 12929, level: 4, revenue: 14940683, cargo: 170 },
    { name: "[TPS] juan david", kilometers: 5100, points: 6400, lastJobDays: 10, role: "Conductor", avatar: "", damage: 308, level: 3, revenue: 781421, cargo: 32 },
    { name: "banco bcp", kilometers: 0, points: 0, lastJobDays: 9999, role: "Conductor", avatar: "", damage: 1146, level: 2, revenue: 2052853, cargo: 79 },
  ],
  recentJobs: [],
};

const numberFormat = new Intl.NumberFormat("es-PE", {
  maximumFractionDigits: 0,
});
const sections = document.querySelectorAll("section");

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function formatNumber(value) {
  return numberFormat.format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitials(name) {
  return (name || "?").charAt(0).toUpperCase();
}

function isFounder(member) {
  const role = (member.role || "").toLowerCase();
  if (/owner|fundador|founder|administrador|moderador/.test(role)) return true;
  const name = (member.name || "").toLowerCase();
  for (const fn of FOUNDER_NAMES) {
    if (name.includes(fn.toLowerCase())) return true;
  }
  return false;
}

function renderStats(stats = {}) {
  setText("stat-kilometros", formatNumber(stats.kilometers));
  setText("stat-conductores", formatNumber(stats.drivers));
  setText("stat-activos", formatNumber(stats.active));
}

function avatarHTML(driver) {
  const hasAvatar = driver.avatar && driver.avatar.startsWith("http");
  const initials = escapeHtml(getInitials(driver.name));
  if (hasAvatar) {
    return `<img src="${escapeHtml(driver.avatar)}" alt="${escapeHtml(driver.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="podium-avatar-fallback" style="display:none">${initials}</div>`;
  }
  return `<div class="podium-avatar-fallback">${initials}</div>`;
}

function renderRanking(ranking = []) {
  const container = document.getElementById("ranking-podium");
  if (!container) return;

  const filtered = ranking.filter(m => !isFounder(m));
  const top3 = filtered.slice(0, 3);

  if (!top3.length) {
    container.innerHTML = `<p style="text-align:center;color:#888;">A\u00fan no hay conductores para mostrar.</p>`;
    return;
  }

  const podiumOrder = [1, 0, 2];
  const labels = ["ORO", "PLATA", "BRONCE"];

  container.innerHTML = podiumOrder.map(i => {
    const d = top3[i];
    const isFirst = i === 0;
    const posClass = ["podium-1","podium-2","podium-3"][i];
    const lastStr = d.lastJobDays == null || d.lastJobDays >= 9999 ? "Sin registro" : d.lastJobDays === 0 ? "Hoy" : `Hace ${d.lastJobDays} d\u00edas`;

    return `
      <div class="podium-item ${posClass}">
        <span class="podium-number">${["1\u00ba","2\u00ba","3\u00ba"][i]}</span>
        ${isFirst ? '<span class="podium-crown">\uD83D\uDC51</span>' : ""}
        <span class="podium-label">${labels[i]}</span>
        <div class="podium-avatar-wrap">${avatarHTML(d)}</div>
        <div class="podium-name">${escapeHtml(d.name || "Sin nombre")}</div>
        <span class="podium-role">${escapeHtml(d.role || "")}</span>
        <div class="podium-info-grid">
          <div class="podium-info-item">
            <span class="podium-info-value">${formatNumber(d.kilometers)}</span>
            <span class="podium-info-label">KM</span>
          </div>
          <div class="podium-info-item">
            <span class="podium-info-value">${formatNumber(d.damage)}</span>
            <span class="podium-info-label">Da\u00f1o</span>
          </div>
          <div class="podium-info-item">
            <span class="podium-info-value">${d.level != null ? d.level : "?"}</span>
            <span class="podium-info-label">Nivel</span>
          </div>
        </div>
        <span class="podium-footer">\uD83D\uDFE2 ${lastStr}</span>
      </div>
    `;
  }).join("");
}

function renderJobs(jobs = []) {
  const jobsGrid = document.getElementById("jobs-grid");
  if (!jobsGrid) return;
  if (!jobs.length) {
    jobsGrid.innerHTML = `<div class="job-card"><p>A\u00fan no hay trabajos recientes para mostrar.</p></div>`;
    return;
  }
  jobsGrid.innerHTML = jobs.map(j => `
    <article class="job-card">
      <h3>${escapeHtml(j.driver || "Conductor TEPSA")}</h3>
      <p><strong>Ruta:</strong> ${escapeHtml(j.route || "Sin ruta")}</p>
      <p><strong>KM:</strong> ${formatNumber(j.kilometers)}</p>
      <p><strong>Da\u00f1o:</strong> ${formatNumber(j.damage)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(j.status || "Registrado")}</p>
    </article>
  `).join("");
}

function renderTruckyData(data) {
  renderStats(data.stats);
  renderRanking(data.ranking);
  renderJobs(data.recentJobs);

  const status = document.getElementById("trucky-status");
  if (!status) return;
  const updatedAt = data.updatedAt ? new Date(data.updatedAt).toLocaleString("es-PE") : "sin fecha";
  if (data.source === "demo") {
    status.textContent = "Mostrando datos de ejemplo.";
    return;
  }
  status.innerHTML = `\uD83D\uDCE1 <strong>Trucky Hub</strong> \u00B7 Actualizado: ${updatedAt}`;
}

const CACHE_KEY = "tepsa_index";
const CACHE_TTL = 30 * 60 * 1000;

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return entry.data;
  } catch { return null; }
}

function setCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { }
}

function transformMember(m) {
  return {
    name: m.name,
    kilometers: m.total_driven_distance_km || 0,
    points: m.points || 0,
    lastJobDays: m.last_job_days,
    role: m.role?.name || "",
    avatar: m.avatar_url || "",
    damage: m.damage != null ? m.damage : 0,
    level: m.level || 0,
    revenue: m.total_revenue || 0,
    cargo: m.total_cargo_mass_t || 0,
  };
}

async function tryFetch(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function fetchJobsDamage() {
  const damageMap = new Map();
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const base = `https://e.truckyapp.com/api/v1/company/44302/jobs?dateFrom=${y}-${m}-01&dateTo=${y}-${m}-${lastDay}`;
    const p1 = await tryFetch(base + "&page=1");
    if (!p1 || !p1.data) return damageMap;
    const total = p1.last_page || 1;
    const pages = [p1];
    for (let s = 2; s <= total; s += 4) {
      const batch = [];
      for (let p = s; p < s + 4 && p <= total; p++) batch.push(tryFetch(base + "&page=" + p));
      const results = await Promise.allSettled(batch);
      for (const r of results) if (r.status === "fulfilled" && r.value) pages.push(r.value);
    }
    for (const page of pages) {
      if (!page || !page.data) continue;
      for (const job of page.data) {
        const name = job.in_game_profile_name || job.driver?.name || "";
        if (!name) continue;
        const dmg = (job.vehicle_damage || 0) + (job.cargo_damage || 0) + (job.trailers_damage || 0);
        if (dmg > 0) damageMap.set(name, (damageMap.get(name) || 0) + Math.round(dmg));
      }
    }
  } catch (e) {
    console.error("fetchJobsDamage:", e);
  }
  return damageMap;
}

function matchDamage(driver, damageMap) {
  const raw = (driver.name || "").toLowerCase().trim();
  const stripped = raw.replace(/\[?\s*tps\s*\]?\s*/gi, "").replace(/[\[\]?]/g, "").trim();
  for (const [jobName, dmg] of damageMap) {
    const jn = jobName.toLowerCase().trim();
    if (!jn) continue;
    if (raw.includes(jn) || jn.includes(stripped) || jn.includes(raw)) return dmg;
    const jnClean = jn.replace(/[\._\-]/g, "");
    if (jnClean.includes(stripped) || stripped.includes(jnClean)) return dmg;
    const sw = stripped.split(/[\s_\-\.]+/);
    for (const w of sw) { if (w.length > 2 && jn.includes(w)) return dmg; }
    const jw = jn.split(/[\s_\-\.]+/);
    for (const w of jw) { if (w.length > 2 && stripped.includes(w)) return dmg; }
  }
  return null;
}

async function loadTruckyData() {
  const cached = getCache();
  if (cached) renderTruckyData(cached);

  let data = null;

  for (const url of ["/api/trucky/conductores", "http://127.0.0.1:3000/api/trucky/conductores"]) {
    try {
      const d = await tryFetch(url);
      data = {
        source: "trucky",
        updatedAt: new Date().toISOString(),
        stats: d.stats || {},
        ranking: (d.ranking || []).map(transformMember),
        recentJobs: d.recentJobs || [],
      };
      break;
    } catch { continue; }
  }

  if (!data) {
    try {
      const raw = await tryFetch("https://e.truckyapp.com/api/v1/company/44302/members");
      const members = (raw.data || []).map(transformMember);
      const totalKm = members.reduce((s, d) => s + d.kilometers, 0);
      const active = members.filter(d => d.lastJobDays === 0).length;
      const drivers = members.filter(d => d.kilometers > 0).length;
      members.sort((a, b) => b.kilometers - a.kilometers);

      const damageMap = await fetchJobsDamage();
      for (const d of members) {
        const dmg = matchDamage(d, damageMap);
        if (dmg != null) d.damage = dmg;
      }

      data = {
        source: "trucky",
        updatedAt: new Date().toISOString(),
        stats: { kilometers: Math.round(totalKm), drivers, active },
        ranking: members,
        recentJobs: [],
      };
    } catch { }
  }

  if (data) {
    setCache(data);
    renderTruckyData(data);
  } else if (!cached) {
    renderTruckyData(fallbackTruckyData);
  }
}

function setupRevealAnimation() {
  sections.forEach(s => { s.style.opacity = "0"; s.style.transform = "translateY(50px)"; s.style.transition = "all 1s ease"; });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; } });
  }, { threshold: 0.12 });
  sections.forEach(s => observer.observe(s));
}

function setupBackToTopButton() {
  const btn = document.createElement("button");
  btn.textContent = "\u2191";
  btn.setAttribute("aria-label", "Volver arriba");
  Object.assign(btn.style, {
    position: "fixed", bottom: "20px", right: "20px", width: "50px", height: "50px",
    borderRadius: "50%", border: "none", background: "#ff2d2d", color: "white",
    fontSize: "22px", cursor: "pointer", zIndex: "999"
  });
  document.body.appendChild(btn);
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function setupDisclaimerModal() {
    const modal = document.getElementById("disclaimer-modal");
    const closeBtn = document.getElementById("modal-close-btn");
    const acceptBtn = document.getElementById("modal-accept-btn");
    if (!modal) return;
    function close() { modal.classList.add("hidden"); }
    closeBtn?.addEventListener("click", close);
    acceptBtn?.addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

setupDisclaimerModal();
setupRevealAnimation();
setupBackToTopButton();
loadTruckyData();
setInterval(loadTruckyData, 1800000);
