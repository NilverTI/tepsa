/* ==========================================================================
   INDEX/HOME SCRIPT - TEPSA PSV
   ========================================================================== */

const FOUNDER_NAMES = ["Alexander", "Cesar", "Cristofer", "Sabrosaurio", "Kirito"];

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

const CACHE_KEY_TRUCKY = "tepsa_index_v3";
const CACHE_TTL_TRUCKY = 5 * 60 * 1000;
const CACHE_KEY_PS_RANKING = "tepsa:ps-ranking:v9";

let activeTruckyFetchPromise = null;

function smoothUpdate(element, newHtml) {
    if (!element) return;
    element.style.opacity = "0.3";
    setTimeout(() => {
        element.innerHTML = newHtml;
        element.style.opacity = "1";
    }, 250);
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return "hace un momento";
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "hace un momento";
    if (diffMins === 1) return "hace 1 minuto";
    return `hace ${diffMins} minutos`;
}

function renderRankingSkeletons() {
    const container = document.getElementById("ranking-podium");
    if (!container) return;
    container.innerHTML = Array.from({ length: 3 }).map(() => `
        <div class="podium-item skeleton" style="height: 320px; display: flex; flex-direction: column; gap: 15px; padding: 20px; border-radius: 14px; background: #161616; border: 1px solid #222;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: #2a2a2a; margin: 0 auto;"></div>
            <div style="width: 70%; height: 16px; background: #2a2a2a; border-radius: 4px; margin: 10px auto;"></div>
            <div style="width: 50%; height: 12px; background: #2a2a2a; border-radius: 4px; margin: 0 auto 15px;"></div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div style="height: 35px; background: #2a2a2a; border-radius: 8px;"></div>
                <div style="height: 35px; background: #2a2a2a; border-radius: 8px;"></div>
                <div style="height: 35px; background: #2a2a2a; border-radius: 8px;"></div>
            </div>
            <div style="width: 80%; height: 12px; background: #2a2a2a; border-radius: 4px; margin: 15px auto 0;"></div>
        </div>
    `).join("");
}

function renderJobsSkeletons() {
    const jobsGrid = document.getElementById("jobs-grid");
    if (!jobsGrid) return;
    jobsGrid.innerHTML = Array.from({ length: 4 }).map(() => `
        <div class="job-card skeleton" style="display: flex; flex-direction: column; gap: 10px; padding: 15px; border-radius: 10px; background: #161616; border: 1px solid #222; height: 160px;">
            <div style="width: 40%; height: 14px; background: #2a2a2a; border-radius: 4px;"></div>
            <div style="width: 60%; height: 12px; background: #2a2a2a; border-radius: 4px;"></div>
            <div style="width: 30%; height: 12px; background: #2a2a2a; border-radius: 4px;"></div>
            <div style="width: 50%; height: 12px; background: #2a2a2a; border-radius: 4px;"></div>
        </div>
    `).join("");
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
    const kmEl = document.getElementById("stat-kilometros");
    const condEl = document.getElementById("stat-conductores");
    const actEl = document.getElementById("stat-activos");
    
    if (kmEl) kmEl.textContent = formatNumber(stats.kilometers);
    if (condEl) condEl.textContent = formatNumber(stats.drivers);
    if (actEl) actEl.textContent = formatNumber(stats.active);
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
        container.innerHTML = `<p style="text-align:center;color:#888;">Aún no hay conductores para mostrar.</p>`;
        return;
    }

    const podiumOrder = [1, 0, 2];
    const labels = ["ORO", "PLATA", "BRONCE"];

    const html = podiumOrder.map(i => {
        const d = top3[i];
        if (!d) return "";
        const isFirst = i === 0;
        const posClass = ["podium-1", "podium-2", "podium-3"][i];
        const lastStr = d.lastJobDays == null || d.lastJobDays >= 9999 ? "Sin registro" : d.lastJobDays === 0 ? "Hoy" : `Hace ${d.lastJobDays} días`;

        return `
      <div class="podium-item ${posClass}">
        <span class="podium-number">${["1º", "2º", "3º"][i]}</span>
        ${isFirst ? '<span class="podium-crown">👑</span>' : ""}
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
            <span class="podium-info-label">Daño</span>
          </div>
          <div class="podium-info-item">
            <span class="podium-info-value">${d.level != null ? d.level : "?"}</span>
            <span class="podium-info-label">Nivel</span>
          </div>
        </div>
        <span class="podium-footer">🟢 ${lastStr}</span>
      </div>
    `;
    }).join("");

    if (container.querySelector(".skeleton") || container.innerHTML.trim() === "" || container.style.opacity === "0.3") {
        container.innerHTML = html;
    } else {
        smoothUpdate(container, html);
    }
}

function renderJobs(jobs = []) {
    const jobsGrid = document.getElementById("jobs-grid");
    if (!jobsGrid) return;
    if (!jobs.length) {
        jobsGrid.innerHTML = `<div class="job-card"><p>Aún no hay trabajos recientes para mostrar.</p></div>`;
        return;
    }
    const html = jobs.map(j => `
    <article class="job-card">
      <h3>${escapeHtml(j.driver || "Conductor TEPSA")}</h3>
      <p><strong>Ruta:</strong> ${escapeHtml(j.route || "Sin ruta")}</p>
      <p><strong>KM:</strong> ${formatNumber(j.kilometers)}</p>
      <p><strong>Daño:</strong> ${formatNumber(j.damage)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(j.status || "Registrado")}</p>
    </article>
  `).join("");

    if (jobsGrid.querySelector(".skeleton") || jobsGrid.innerHTML.trim() === "" || jobsGrid.style.opacity === "0.3") {
        jobsGrid.innerHTML = html;
    } else {
        smoothUpdate(jobsGrid, html);
    }
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
    status.innerHTML = `📡 <strong>Trucky Hub</strong> · Actualizado: ${updatedAt}`;
}

function getTruckyCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY_TRUCKY);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        return entry.data;
    } catch { return null; }
}

function setTruckyCache(data) {
    try {
        localStorage.setItem(CACHE_KEY_TRUCKY, JSON.stringify({ ts: Date.now(), data }));
        localStorage.removeItem("tepsa_index_v2");
    } catch { }
}

function transformMember(m) {
    return {
        name: m.name,
        kilometers: m.kilometers || m.total_driven_distance_km || 0,
        points: m.points || 0,
        lastJobDays: m.lastJobDays ?? m.last_job_days,
        role: m.role?.name || m.role || "",
        avatar: m.avatar_url || m.avatar || "",
        damage: m.damage || 0,
        level: m.level || 0,
        revenue: m.revenue || m.total_revenue || 0,
        cargo: m.cargoMass || m.cargo || m.total_cargo_mass_t || 0,
    };
}

async function tryFetch(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
}

async function fetchMonthJobs() {
    const stats = new Map();
    try {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
        const base = `https://e.truckyapp.com/api/v1/company/44302/jobs?dateFrom=${y}-${m}-01&dateTo=${y}-${m}-${lastDay}`;
        const p1 = await tryFetch(base + "&page=1");
        if (!p1 || !p1.data) return stats;
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
                const prev = stats.get(name) || { kilometers: 0, damage: 0 };
                prev.kilometers += Number(job.driven_distance_km || job.kilometers || 0);
                prev.damage += (job.vehicle_damage || 0) + (job.cargo_damage || 0) + (job.trailers_damage || 0);
                stats.set(name, prev);
            }
        }
    } catch (e) {
        console.error("fetchMonthJobs:", e);
    }
    return stats;
}

async function loadTruckyData(force) {
    let cached = null;
    let cacheTime = null;
    try {
        const raw = localStorage.getItem(CACHE_KEY_TRUCKY);
        if (raw) {
            const entry = JSON.parse(raw);
            cached = entry.data;
            cacheTime = entry.ts;
        }
    } catch (e) {}

    const status = document.getElementById("trucky-status");

    if (cached) {
        renderTruckyData(cached);
        if (status) {
            status.innerHTML = `📡 <strong>Datos locales</strong> · Actualizado: ${formatTimeAgo(cacheTime)}`;
        }
        
        if (cacheTime && (Date.now() - cacheTime < CACHE_TTL_TRUCKY) && !force) {
            return;
        }
    } else {
        renderRankingSkeletons();
        renderJobsSkeletons();
        if (status) status.innerHTML = `⏳ Cargando datos del servidor...`;
    }

    if (activeTruckyFetchPromise) {
        try {
            await activeTruckyFetchPromise;
        } catch (e) {}
        return;
    }

    let data = null;

    activeTruckyFetchPromise = (async () => {
        const urls = getApiEndpointsList("/api/trucky/conductores");

        let fetchedData = null;

        const promises = urls.map(async (url) => {
            const isLocal = url.startsWith("/") || url.includes("127.0.0.1") || url.includes("localhost");
            const timeoutMs = isLocal ? 1500 : 8000;
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetch(url, { cache: "no-store", signal: controller.signal });
                clearTimeout(id);
                if (!res.ok) throw new Error("HTTP " + res.status);
                const d = await res.json();
                return {
                    source: "trucky",
                    updatedAt: new Date().toISOString(),
                    stats: d.stats || {},
                    ranking: (d.ranking || []).map(transformMember),
                    recentJobs: d.recentJobs || [],
                };
            } catch (err) {
                clearTimeout(id);
                throw err;
            }
        });

        try {
            fetchedData = await Promise.any(promises);
        } catch (e) {
            console.warn("loadTruckyData: falló API proxy, probando alternativa directa...");
        }

        if (!fetchedData) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000);
            try {
                const [raw, monthStats] = await Promise.all([
                    fetch("https://e.truckyapp.com/api/v1/company/44302/members", { cache: "no-store", signal: controller.signal }).then(r => r.json()),
                    fetchMonthJobs(),
                ]);
                clearTimeout(id);
                const members = (raw.data || [])
                    .map(m => {
                        const name = m.name || "Sin nombre";
                        const ms = monthStats.get(name) || { kilometers: 0, damage: 0 };
                        return {
                            name,
                            kilometers: Math.round(ms.kilometers),
                            points: Math.round(m.points || 0),
                            lastJobDays: m.lastJobDays ?? m.last_job_days,
                            role: m.role?.name || m.role || "",
                            avatar: m.avatar_url || m.avatar || "",
                            damage: Math.round(ms.damage),
                            level: m.level || 0,
                            revenue: m.revenue || m.total_revenue || 0,
                            cargo: m.cargoMass || m.cargo || m.total_cargo_mass_t || 0,
                        };
                    })
                    .filter(m => {
                        const role = m.role || "";
                        const name = m.name || "";
                        return role.toLowerCase() !== "owner";
                    });
                const totalKm = members.reduce((s, d) => s + d.kilometers, 0);
                const active = members.filter(d => Number(d.lastJobDays ?? 9999) <= 7).length;
                const drivers = members.length;
                members.sort((a, b) => b.kilometers - a.kilometers);

                fetchedData = {
                    source: "trucky",
                    updatedAt: new Date().toISOString(),
                    stats: { kilometers: Math.round(totalKm), drivers, active },
                    ranking: members,
                    recentJobs: [],
                };
            } catch (e) {
                clearTimeout(id);
                console.error("loadTruckyData: todos los orígenes fallaron en segundo plano", e);
            }
        }
        return fetchedData;
    })();

    try {
        data = await activeTruckyFetchPromise;
    } catch (e) {
        console.error("loadTruckyData fetch error:", e);
    } finally {
        activeTruckyFetchPromise = null;
    }

    if (data) {
        const isChanged = !cached || 
            JSON.stringify(cached.stats) !== JSON.stringify(data.stats) ||
            JSON.stringify(cached.ranking) !== JSON.stringify(data.ranking) ||
            JSON.stringify(cached.recentJobs) !== JSON.stringify(data.recentJobs);

        setTruckyCache(data);

        if (isChanged) {
            renderTruckyData(data);
        } else {
            if (status) {
                status.innerHTML = `📡 <strong>Trucky Hub</strong> · Actualizado: hace un momento`;
            }
        }
    } else {
        if (cached) {
            if (status) {
                status.innerHTML = `⚠️ Mostrando datos guardados. Última actualización: ${formatTimeAgo(cacheTime)}`;
            }
        } else {
            renderTruckyData(fallbackTruckyData);
            if (status) {
                status.innerHTML = `⚠️ Error al conectar. Mostrando datos por defecto.`;
            }
        }
    }
}

/* ===== ANIMATIONS AND UI OVERLAYS ===== */
function setupRevealAnimation() {
    const sections = document.querySelectorAll("section");
    sections.forEach(s => { 
        s.style.opacity = "0"; 
        s.style.transform = "translateY(50px)"; 
        s.style.transition = "all 1s ease"; 
    });
    
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { 
            if (e.isIntersecting) { 
                e.target.style.opacity = "1"; 
                e.target.style.transform = "translateY(0)"; 
            } 
        });
    }, { threshold: 0.12 });
    
    sections.forEach(s => observer.observe(s));
}

function setupBackToTopButton() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;
    
    function toggleBtn() {
        btn.classList.toggle("show", window.scrollY > 300);
    }
    
    window.addEventListener("scroll", toggleBtn, { passive: true });
    toggleBtn();
    btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function setupDisclaimerModal() {
    const modal = document.getElementById("disclaimer-modal");
    const closeBtn = document.getElementById("modal-close-btn");
    const acceptBtn = document.getElementById("modal-accept-btn");
    if (!modal) return;
    
    function close() { 
        modal.classList.add("hidden"); 
    }
    
    closeBtn?.addEventListener("click", close);
    acceptBtn?.addEventListener("click", close);
    modal.addEventListener("click", (e) => { 
        if (e.target === modal) close(); 
    });
    document.addEventListener("keydown", (e) => { 
        if (e.key === "Escape") close(); 
    });
}

/* ==========================================================================
   PURE CLIENT-SIDE PERUSERVER MONTHLY RANKING (STALE-WHILE-REVALIDATE)
   Runs 100% in browser / static hosting without serverless/Node.js dependencies
   ========================================================================== */

const PS_RANKING_STORAGE_KEY = "tepsa_ps_ranking_store";

function normalizeCompanyNameClient(str) {
    return String(str || "")
        .toLowerCase()
        .replace(/\[.*?\]/g, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function findTepsaCompanyClient(apiData) {
    if (!apiData) return { item: null, index: -1 };

    let items = [];
    if (Array.isArray(apiData)) items = apiData;
    else if (Array.isArray(apiData.items)) items = apiData.items;
    else if (Array.isArray(apiData.data)) items = apiData.data;
    else if (Array.isArray(apiData.rankings)) items = apiData.rankings;
    else if (Array.isArray(apiData.empresas)) items = apiData.empresas;
    else if (Array.isArray(apiData.results)) items = apiData.results;
    else if (Array.isArray(apiData.monthlyRanking)) items = apiData.monthlyRanking;

    if (!items.length) return { item: null, index: -1 };

    // Sort by kilometers / total_distance descending if not pre-sorted
    const sorted = [...items].sort((a, b) => {
        const kmA = Number(a.total_distance || a.kilometros || a.km || 0);
        const kmB = Number(b.total_distance || b.kilometros || b.km || 0);
        return kmB - kmA;
    });

    // 1. Search by exact ID (44302)
    let index = sorted.findIndex(x => x && String(x.id || x.company_id || x.empresa_id) === "44302");

    // 2. Search by normalized name
    if (index === -1) {
        index = sorted.findIndex(x => {
            if (!x) return false;
            const norm = normalizeCompanyNameClient(x.name || x.empresa || x.company_name);
            return norm === "tepsa" || norm.startsWith("tepsa");
        });
    }

    const item = index >= 0 ? sorted[index] : null;
    return { item, index };
}

function renderPSRankingCertificate(data, statusText, isLive) {
    const els = {
        card: document.getElementById("psvCertificationCard"),
        heroRank: document.getElementById("psvCertHeroRank"),
        centerRank: document.getElementById("psvCertCenterRank"),
        stats: document.getElementById("psvCertStats"),
        monthRank: document.getElementById("psvCertMonthRank"),
        members: document.getElementById("psvCertMembers"),
        title: document.getElementById("psvCertTitle"),
        subtitle: document.getElementById("psvCertSubtitle"),
        meta: document.getElementById("psvCertMeta"),
    };
    if (!els.heroRank || !data) return;

    const pos = Math.floor(Number(data.position || 1));
    const prevPos = Math.floor(Number(data.previousPosition || (pos > 1 ? pos + 1 : 2)));
    const km = Number(data.kilometers || 0);
    const trips = Number(data.trips || 0);
    const members = Number(data.members || 16);
    const movement = data.movement || "same";

    const formattedKm = formatNumber(km);

    if (els.card) {
        els.card.setAttribute("data-tier", "top" + Math.min(pos, 3));
    }

    if (els.heroRank) els.heroRank.textContent = "#" + pos;
    if (els.centerRank) els.centerRank.textContent = pos;
    if (els.monthRank) els.monthRank.textContent = "#" + pos;
    if (els.members) els.members.textContent = members;
    if (els.stats) els.stats.textContent = `${formattedKm} KM · ${trips} Viajes`;
    if (els.title) els.title.textContent = "TEPSA PSV";
    if (els.subtitle) els.subtitle.textContent = "Ranking Mensual PeruServer";

    const trendSymbol = movement === "up" ? "▲" : movement === "down" ? "▼" : "●";
    const trendText = movement === "up" ? `subió de #${prevPos}` : movement === "down" ? `bajó de #${prevPos}` : `mantiene en #${pos}`;

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const monthName = data.month ? months[data.month - 1] : months[new Date().getMonth()];
    const year = data.year || new Date().getFullYear();
    const periodStr = `${monthName} ${year}`;

    if (els.meta) {
        if (isLive) {
            els.meta.textContent = `Top ${pos} (${trendSymbol} ${trendText}) · EN VIVO · ${periodStr}`;
        } else if (statusText === "Actualizando en segundo plano…") {
            els.meta.textContent = `Top ${pos} (${trendSymbol} ${trendText}) · Actualizando en segundo plano…`;
        } else {
            const dateObj = data.timestamp ? new Date(data.timestamp) : new Date();
            const timeStr = dateObj.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
            const dateStr = dateObj.toLocaleDateString("es-PE");
            els.meta.textContent = `Top ${pos} (${trendSymbol} ${trendText}) · ÚLTIMO DATO DISPONIBLE (${dateStr} ${timeStr})`;
        }
    }
}

/**
 * 1. Render saved ranking immediately from localStorage on startup.
 */
function renderSavedRankingImmediately() {
    let saved = null;
    try {
        const raw = localStorage.getItem(PS_RANKING_STORAGE_KEY);
        if (raw) saved = JSON.parse(raw);
    } catch (e) {}

    if (saved && saved.position > 0) {
        renderPSRankingCertificate(saved, "Actualizando en segundo plano…", false);
    } else {
        const defaultData = {
            position: 1,
            previousPosition: 2,
            kilometers: 179634,
            trips: 226,
            members: 16,
            movement: "up",
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            timestamp: new Date().toISOString()
        };
        renderPSRankingCertificate(defaultData, "Actualizando en segundo plano…", false);
    }
}

/**
 * 2. Fetch fresh ranking in background asynchronously from PeruServer API directly.
 */
async function refreshRankingInBackground() {
    const API_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(API_URL, {
            headers: { "Accept": "application/json" },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("HTTP Error " + response.status);

        const apiData = await response.json();
        const { item, index } = findTepsaCompanyClient(apiData);

        if (!item || index < 0) {
            throw new Error("Empresa TEPSA PSV no encontrada en el ranking de PeruServer");
        }

        const newPos = index + 1;
        const newKm = Math.round(Number(item.total_distance || item.kilometros || item.km || 0));
        const newTrips = Math.round(Number(item.total_jobs || item.viajes || item.jobs || 0));
        const newMembers = Math.round(Number(item.members || item.miembros || 16));

        // Get saved data to calculate movement direction
        let prevPos = newPos > 1 ? newPos + 1 : 2;
        try {
            const raw = localStorage.getItem(PS_RANKING_STORAGE_KEY);
            if (raw) {
                const prevStore = JSON.parse(raw);
                if (prevStore.position && prevStore.position !== newPos) {
                    prevPos = prevStore.position;
                } else if (prevStore.previousPosition) {
                    prevPos = prevStore.previousPosition;
                }
            }
        } catch (e) {}

        let movement = "same";
        if (newPos < prevPos) movement = "up";
        else if (newPos > prevPos) movement = "down";

        const now = new Date();
        const month = apiData.period?.from?.month || (now.getMonth() + 1);
        const year = apiData.period?.from?.year || now.getFullYear();

        const freshData = {
            position: newPos,
            previousPosition: prevPos,
            kilometers: newKm,
            trips: newTrips,
            members: newMembers,
            movement: movement,
            month: month,
            year: year,
            timestamp: now.toISOString()
        };

        // Save fresh snapshot to localStorage
        try {
            localStorage.setItem(PS_RANKING_STORAGE_KEY, JSON.stringify(freshData));
        } catch (e) {}

        // Render UI with EN VIVO status
        renderPSRankingCertificate(freshData, "EN VIVO", true);

    } catch (err) {
        console.warn("refreshRankingInBackground: PeruServer API no disponible:", err.message);

        // On error, maintain last valid data from localStorage
        let saved = null;
        try {
            const raw = localStorage.getItem(PS_RANKING_STORAGE_KEY);
            if (raw) saved = JSON.parse(raw);
        } catch (e) {}

        if (saved && saved.position > 0) {
            renderPSRankingCertificate(saved, "ÚLTIMO DATO DISPONIBLE", false);
        } else {
            const defaultData = {
                position: 1,
                previousPosition: 2,
                kilometers: 179634,
                trips: 226,
                members: 16,
                movement: "up",
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                timestamp: new Date().toISOString()
            };
            renderPSRankingCertificate(defaultData, "ÚLTIMO DATO DISPONIBLE", false);
        }
    }
}

/* ===== RECRUITMENT POSTULATION FORM ===== */
function setupPostulationForm() {
    const form = document.getElementById('form-postulacion');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('btn-submit');
        const errEl = document.getElementById('form-error');
        const data = new FormData(form);

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'ENVIANDO...';
        }
        if (errEl) errEl.style.display = 'none';

        try {
            const res = await fetch('https://formspree.io/f/xqevyzbe', {
                method: 'POST',
                body: data,
                headers: { Accept: 'application/json' }
            });
            if (res.ok) {
                form.style.display = 'none';
                const successMsg = document.getElementById('success-msg');
                if (successMsg) successMsg.style.display = 'block';
            } else {
                const json = await res.json();
                if (errEl) {
                    errEl.textContent = json?.error || 'Error al enviar. Intenta de nuevo.';
                    errEl.style.display = 'block';
                }
            }
        } catch {
            if (errEl) {
                errEl.textContent = 'Error de conexión. Verifica tu internet.';
                errEl.style.display = 'block';
            }
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'ENVIAR SOLICITUD';
        }
    });
}

// Clean old localStorage entries
try { localStorage.removeItem("tepsa:ps-ranking:v2"); } catch (e) { }
try { localStorage.removeItem("tepsa:ps-ranking:v3"); } catch (e) { }
try { localStorage.removeItem("tepsa:ps-ranking:v4"); } catch (e) { }
try { localStorage.removeItem("tepsa:ps-ranking:v5"); } catch (e) { }
try { localStorage.removeItem("tepsa:ps-ranking:v6"); } catch (e) { }
try { localStorage.removeItem("tepsa:ps-ranking:v7"); } catch (e) { }

document.addEventListener("DOMContentLoaded", () => {
    setupDisclaimerModal();
    setupRevealAnimation();
    setupBackToTopButton();
    setupPostulationForm();
    loadTruckyData();

    // 1. Mostrar inmediatamente el último dato guardado en localStorage
    renderSavedRankingImmediately();

    // 2. Cargar datos frescos en segundo plano sin bloquear la UI
    requestAnimationFrame(() => {
        setTimeout(() => {
            refreshRankingInBackground();
        }, 50);
    });

    // Auto-actualizar ranking en segundo plano cada 60 segundos
    setInterval(refreshRankingInBackground, 60 * 1000);

    // Actualizar al regresar a la pestaña
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            refreshRankingInBackground();
        }
    });
});
