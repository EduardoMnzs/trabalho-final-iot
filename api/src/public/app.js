const POLL_MS = 2000;

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

function renderSummary(sectors) {
  const wrap = document.getElementById("summary");
  wrap.innerHTML = sectors
    .map((s) => {
      const pct = Math.round(s.occupancyRate * 100);
      const full = s.occupancyRate >= 0.9;
      return `
        <div class="sector-card ${full ? "full" : ""}">
          <h3>Setor ${s.sectorId}</h3>
          <div class="rate">${pct}%</div>
          <div class="muted">${s.occupiedCount}/${s.occupiedCount + s.freeCount} ocupadas · ${s.freeCount} livres</div>
        </div>`;
    })
    .join("");
}

function renderGrid(sectors, incidentSpotIds) {
  const wrap = document.getElementById("grid");
  wrap.innerHTML = sectors
    .map((s) => {
      const spots = s.spots
        .map((sp) => {
          const inc = incidentSpotIds.get(sp.spotId);
          const cls = ["spot", sp.state, inc ? inc : ""]
            .filter(Boolean)
            .join(" ");
          return `<div class="${cls}" title="${sp.spotId} - ${sp.state}${inc ? " - " + inc : ""}">${sp.spotId}</div>`;
        })
        .join("");
      return `
        <div class="sector-grid">
          <h3>Setor ${s.sectorId}</h3>
          <div class="spots">${spots}</div>
        </div>`;
    })
    .join("");
}

function renderIncidents(incidents) {
  const wrap = document.getElementById("incidents");
  if (!incidents.length) {
    wrap.innerHTML = '<div class="muted">nenhum incidente aberto</div>';
    return;
  }
  wrap.innerHTML = incidents
    .map((i) => {
      const ev = i.evidence || {};
      const detail =
        i.type === "FLAPPING"
          ? `${ev.transitions || "?"} transições em ${ev.windowSec || "?"}s`
          : `idle ${Math.round((ev.idleSec || 0) / 60)}min`;
      return `
        <div class="incident-row">
          <span class="type ${i.type}">${i.type}</span>
          <span>· ${i.spotId || i.sectorId}</span>
          <span class="muted">· ${detail} · severity=${i.severity}</span>
        </div>`;
    })
    .join("");
}

async function refresh() {
  try {
    const [map, incidents] = await Promise.all([
      fetchJson("/api/v1/map"),
      fetchJson("/api/v1/incidents?status=open"),
    ]);
    document.getElementById("ts").textContent = new Date(
      map.ts,
    ).toLocaleTimeString();

    const incidentSpotIds = new Map();
    for (const i of incidents.incidents) {
      if (i.spotId) {
        const tag = i.type === "FLAPPING" ? "FLAPPING" : "STUCK";
        incidentSpotIds.set(i.spotId, tag);
      }
    }
    renderSummary(map.sectors);
    renderGrid(map.sectors, incidentSpotIds);
    renderIncidents(incidents.incidents);
  } catch (e) {
    console.error(e);
  }
}

async function recommend(sector) {
  const out = document.getElementById("recommendation");
  out.textContent = `consultando ${sector}…`;
  try {
    const r = await fetchJson(`/api/v1/recommendation?fromSector=${sector}`);
    if (r.recommendedSector) {
      out.innerHTML = `<strong>${r.fromSector} → ${r.recommendedSector}</strong><br><span class="muted">${r.reason}</span>`;
    } else {
      out.innerHTML = `<span class="muted">${r.reason}</span>`;
    }
  } catch (e) {
    out.textContent = `erro: ${e.message}`;
  }
}

document.querySelectorAll(".rec-controls button").forEach((btn) => {
  btn.addEventListener("click", () => recommend(btn.dataset.sector));
});

refresh();
setInterval(refresh, POLL_MS);
