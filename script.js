const fallbackTruckyData = {
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

const numberFormat = new Intl.NumberFormat("es-PE", {
  maximumFractionDigits: 0,
});
const sections = document.querySelectorAll("section");

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatNumber(value) {
  const number = Number(value) || 0;
  return numberFormat.format(number);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderStats(stats = {}) {
  setText("stat-kilometros", formatNumber(stats.kilometers));
  setText("stat-conductores", formatNumber(stats.drivers));
  setText("stat-activos", formatNumber(stats.active));
}

function renderRanking(ranking = []) {
  const container = document.getElementById("ranking-top3");
  if (!container) return;

  const top3 = ranking.slice(0, 3);

  if (!top3.length) {
    container.innerHTML = `<p style="text-align:center;color:#888;grid-column:1/-1;">Aún no hay conductores para mostrar.</p>`;
    return;
  }

  const medals = ["1st", "2nd", "3rd"];

  container.innerHTML = top3
    .map((driver, index) => {
      const pos = index + 1;
      return `
        <div class="rank-card rank-${pos}">
          <div class="rank-medal">${medals[index]}</div>
          <div class="rank-avatar">${escapeHtml((driver.name || "?").charAt(0).toUpperCase())}</div>
          <h3>${escapeHtml(driver.name || "Sin nombre")}</h3>
          <div class="rank-stats">
            <div class="rank-stat">
              <span class="rank-stat-value">${formatNumber(driver.kilometers)}</span>
              <span class="rank-stat-label">KM</span>
            </div>
            <div class="rank-stat">
              <span class="rank-stat-value">${formatNumber(driver.points)}</span>
              <span class="rank-stat-label">Puntos</span>
            </div>
          </div>
          <span class="rank-lastjob">${escapeHtml(driver.lastJob || "Sin registro")}</span>
        </div>
      `;
    })
    .join("");
}

function renderJobs(jobs = []) {
  const jobsGrid = document.getElementById("jobs-grid");
  if (!jobsGrid) return;

  if (!jobs.length) {
    jobsGrid.innerHTML = `<div class="job-card"><p>Aún no hay trabajos recientes para mostrar con este endpoint.</p></div>`;
    return;
  }

  jobsGrid.innerHTML = jobs
    .map(
      (job) => `
        <article class="job-card">
          <h3>${escapeHtml(job.driver || "Conductor TEPSA")}</h3>
          <p><strong>Ruta:</strong> ${escapeHtml(job.route || "Sin ruta")}</p>
          <p><strong>Kilómetros:</strong> ${formatNumber(job.kilometers)}</p>
          <p><strong>Daño:</strong> ${formatNumber(job.damage)}</p>
          <p><strong>Estado:</strong> ${escapeHtml(job.status || "Registrado")}</p>
        </article>
      `,
    )
    .join("");
}

function renderConductores(ranking = []) {
  const grid = document.getElementById("conductores-grid");

  if (!grid) return;

  grid.innerHTML = ranking.map(driver => `
    <div class="conductor-card">
      <img src="img/conductores/default.png" alt="${driver.name}">
      <h3>${driver.name}</h3>
      <p>Conductor TEPSA PSV</p>
    </div>
  `).join("");
}

function renderTruckyData(data) {
  renderStats(data.stats);
  renderRanking(data.ranking);
  renderJobs(data.recentJobs);
  renderConductores(data.ranking);

  const status = document.getElementById("trucky-status");
  if (!status) return;

  const updatedAt = data.updatedAt
    ? new Date(data.updatedAt).toLocaleString("es-PE")
    : "sin fecha";

  if (data.source === "demo") {
    status.textContent =
      "Mostrando datos de ejemplo. Falta colocar el endpoint real de Trucky Hub.";
    return;
  }

  status.textContent = `Datos conectados con Trucky Hub. Última actualización: ${updatedAt}.`;
}

async function loadTruckyData() {
  try {
    const response = await fetch(
  "https://e.truckyapp.com/api/v1/company/44302/members",
  { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("No se pudo leer la conexión local.");
    }

    const trucky = await response.json();

const members = trucky.data || [];

const totalKm = members.reduce(
  (sum, member) => sum + (member.total_driven_distance_km || 0),
  0
);

const activeDrivers = members.filter(
  (member) => member.last_job_days === 0
).length;

const drivers = members.filter(
  member => member.total_driven_distance_km > 0
).length;

const adaptedData = {
  source: "trucky",
  updatedAt: new Date().toISOString(),
  stats: {
  kilometers: Math.round(totalKm),
    drivers: drivers,
  active: activeDrivers
},
  ranking: members
    .sort((a, b) => b.total_driven_distance_km - a.total_driven_distance_km)
    .slice(0, 12)
    .map(member => ({
      name: member.name,
      kilometers: member.total_driven_distance_km,
      points: member.points,
      lastJob:
        member.last_job_days === 0
          ? "Hoy"
          : `Hace ${member.last_job_days} días`
    })),
  recentJobs: []
};

renderTruckyData(adaptedData);
  } catch (error) {
    renderTruckyData(fallbackTruckyData);
  }
}

function setupRevealAnimation() {
  sections.forEach((section) => {
    section.style.opacity = "0";
    section.style.transform = "translateY(50px)";
    section.style.transition = "all 1s ease";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.12 },
  );

  sections.forEach((section) => observer.observe(section));
}

function setupBackToTopButton() {
  const btnTop = document.createElement("button");

  btnTop.textContent = "↑";
  btnTop.setAttribute("aria-label", "Volver arriba");
  btnTop.style.position = "fixed";
  btnTop.style.bottom = "20px";
  btnTop.style.right = "20px";
  btnTop.style.width = "50px";
  btnTop.style.height = "50px";
  btnTop.style.borderRadius = "50%";
  btnTop.style.border = "none";
  btnTop.style.background = "#ff2d2d";
  btnTop.style.color = "white";
  btnTop.style.fontSize = "22px";
  btnTop.style.cursor = "pointer";
  btnTop.style.zIndex = "999";

  document.body.appendChild(btnTop);

  btnTop.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

setupRevealAnimation();
setupBackToTopButton();
loadTruckyData();
setInterval(loadTruckyData, 1800000); //30 minutos

