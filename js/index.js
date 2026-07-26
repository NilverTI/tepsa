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
const PS_RANKING_STORAGE_KEY = "tepsa_ps_ranking_store";

let activeTruckyFetchPromise = null;
let rankingPollingIntervalId = null;
let rankingAbortController = null;

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

function setTruckyCache(data) {
    try {
        localStorage.setItem(CACHE_KEY_TRUCKY, JSON.stringify({ ts: Date.now(), data }));
    } catch { }
}

function transformMember(m) {
    return {
        name: m.name || m.username || "Sin nombre",
        kilometers: Math.round(Number(m.total_driven_distance_km || m.kilometers || 0)),
        points: Math.round(Number(m.points || 0)),
        lastJobDays: m.last_job_days != null && Number.isFinite(Number(m.last_job_days)) ? Number(m.last_job_days) : 9999,
        role: m.role?.name || m.role || "",
        avatar: m.avatar_url || m.avatar || "",
        damage: Math.round(Number(m.damage || 0)),
        level: Number(m.level || 0),
        revenue: Math.round(Number(m.total_revenue || m.revenue || 0)),
        cargo: Math.round(Number(m.total_cargo_mass_t || m.cargoMass || m.cargo || 0)),
    };
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
        try { await activeTruckyFetchPromise; } catch (e) {}
        return;
    }

    activeTruckyFetchPromise = (async () => {
        const controller = new AbortController();
        const timerId = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetch("https://e.truckyapp.com/api/v1/company/44302/members", {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json, text/plain, */*"
                },
                signal: controller.signal
            });
            clearTimeout(timerId);

            if (!res.ok) throw new Error("HTTP " + res.status);
            const rawData = await res.json();
            const members = (rawData.data || [])
                .map(transformMember)
                .filter(m => (m.role || "").toLowerCase() !== "owner");
            members.sort((a, b) => b.kilometers - a.kilometers);

            const totalKm = members.reduce((s, d) => s + d.kilometers, 0);
            const activeCount = members.filter(d => d.lastJobDays <= 7).length;

            return {
                source: "trucky",
                updatedAt: new Date().toISOString(),
                stats: { kilometers: totalKm, drivers: members.length, active: activeCount },
                ranking: members,
                recentJobs: []
            };
        } catch (err) {
            clearTimeout(timerId);
            throw err;
        }
    })();

    let data = null;
    try {
        data = await activeTruckyFetchPromise;
    } catch (e) {
        console.warn("loadTruckyData direct fetch failed, trying fallback:", e.message);
    } finally {
        activeTruckyFetchPromise = null;
    }

    if (data) {
        setTruckyCache(data);
        renderTruckyData(data);
    } else if (!cached) {
        renderTruckyData(fallbackTruckyData);
    }
}

/* ===== PURE CLIENT-SIDE PERUSERVER MONTHLY RANKING (STALE-WHILE-REVALIDATE) ===== */

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

    if (!items.length) return { item: null, index: -1 };

    const sorted = [...items].sort((a, b) => {
        const kmA = Number(a.total_distance || a.kilometros || a.km || 0);
        const kmB = Number(b.total_distance || b.kilometros || b.km || 0);
        return kmB - kmA;
    });

    let index = sorted.findIndex(x => x && String(x.id || x.company_id || x.empresa_id) === "44302");

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

async function refreshRankingInBackground() {
    // Avoid fetching if document is hidden
    if (document.visibilityState === "hidden") return;

    // Abort any in-flight request to prevent duplication
    if (rankingAbortController) {
        rankingAbortController.abort();
    }
    rankingAbortController = new AbortController();

    const API_URL = "https://api.mdcdev.me/v2/peruserver/trucky/top-km/monthly?limit=100";

    try {
        const timeoutId = setTimeout(() => {
            if (rankingAbortController) rankingAbortController.abort();
        }, 8000);

        const response = await fetch(API_URL, {
            headers: { "Accept": "application/json" },
            signal: rankingAbortController.signal
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

        try {
            localStorage.setItem(PS_RANKING_STORAGE_KEY, JSON.stringify(freshData));
        } catch (e) {}

        renderPSRankingCertificate(freshData, "EN VIVO", true);

    } catch (err) {
        if (err.name === "AbortError") return; // Ignore aborted requests
        console.warn("refreshRankingInBackground: PeruServer API no disponible:", err.message);

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
    } finally {
        rankingAbortController = null;
    }
}

/**
 * Starts 20-second polling interval ONLY when tab is visible.
 */
function startRankingPolling() {
    stopRankingPolling();
    if (document.visibilityState !== "visible") return;

    refreshRankingInBackground();

    rankingPollingIntervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
            refreshRankingInBackground();
        }
    }, 20000); // Poll every 20 seconds
}

/**
 * Stops polling and aborts any active fetch.
 */
function stopRankingPolling() {
    if (rankingPollingIntervalId) {
        clearInterval(rankingPollingIntervalId);
        rankingPollingIntervalId = null;
    }
    if (rankingAbortController) {
        rankingAbortController.abort();
        rankingAbortController = null;
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
                observer.unobserve(e.target); // Unobserve to free memory
            } 
        });
    }, { threshold: 0.12 });
    
    sections.forEach(s => observer.observe(s));
}

function setupBackToTopButton() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;
    
    let ticking = false;
    function toggleBtn() {
        btn.classList.toggle("show", window.scrollY > 300);
        ticking = false;
    }
    
    window.addEventListener("scroll", () => {
        if (!ticking) {
            window.requestAnimationFrame(toggleBtn);
            ticking = true;
        }
    }, { passive: true });
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

document.addEventListener("DOMContentLoaded", () => {
    setupDisclaimerModal();
    setupRevealAnimation();
    setupBackToTopButton();
    setupPostulationForm();
    loadTruckyData();

    // 1. Render saved ranking immediately from localStorage
    renderSavedRankingImmediately();

    // 2. Start background polling (20s) if tab is visible
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (document.visibilityState === "visible") {
                startRankingPolling();
            }
        }, 50);
    });

    // 3. Tab visibility controller
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            startRankingPolling();
        } else {
            stopRankingPolling();
        }
    });
});
