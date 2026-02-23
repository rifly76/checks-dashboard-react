import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "") ||
  "https://checks-energy-api.onrender.com";

/* =========================
   Helpers
========================= */
function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status) {
  const map = {
    scheduled: "Programmata",
    in_progress: "In corso",
    completed: "Completata",
    report_available: "Report disponibile",
    closed: "Chiusa",
    active: "Attivo",
    inactive: "Non attivo",
    invited: "Invitato",
    generated: "Generato",
    updated: "Aggiornato",
  };
  return map[status] || status || "—";
}

function outcomeLabel(outcome) {
  const map = {
    compatible: "Compatibile",
    not_compatible: "Non compatibile",
    to_review: "Da approfondire",
    na: "N/D",
  };
  return map[outcome] || outcome || "—";
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* =========================
   API
========================= */
async function apiRequest(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const txt = await res.text();
  const data = safeJson(txt);

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      `HTTP ${res.status}${res.statusText ? ` - ${res.statusText}` : ""}`;
    throw new Error(message);
  }

  return data ?? {};
}

async function loginApi(username, password) {
  return apiRequest("/api/v1/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

async function meApi(token) {
  return apiRequest("/api/v1/auth/me", { token });
}

async function summaryApi(token) {
  return apiRequest("/api/v1/dashboard/summary", { token });
}

async function activitiesApi(token) {
  return apiRequest("/api/v1/activities", { token });
}

/* =========================
   UI primitives
========================= */
function ShellStyles() {
  return (
    <style>{`
      :root{
        --bg:#0b1020;
        --bg2:#0f1730;
        --card:rgba(255,255,255,.03);
        --card-2:rgba(255,255,255,.02);
        --line:rgba(255,255,255,.08);
        --line-soft:rgba(255,255,255,.05);
        --text:#eef3ff;
        --muted:#9fb0d1;
        --brand:#4da3ff;
        --brand2:#78e0c2;
        --warn:#ffd166;
        --ok:#7ee081;
        --danger:#ff7b7b;
        --shadow:0 20px 40px rgba(0,0,0,.25);
        --radius:18px;
      }
      *{box-sizing:border-box}
      html,body,#root{height:100%}
      body{
        margin:0;
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
        color:var(--text);
        background:
          radial-gradient(circle at 12% -5%, rgba(77,163,255,.18), transparent 40%),
          radial-gradient(circle at 88% 8%, rgba(120,224,194,.10), transparent 45%),
          var(--bg);
      }

      .ce-page{min-height:100%; padding:16px;}
      .ce-wrap{max-width:1600px; margin:0 auto; display:flex; flex-direction:column; gap:14px;}

      .ce-card{
        background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015));
        border:1px solid var(--line);
        border-radius:var(--radius);
        box-shadow:var(--shadow);
      }
      .ce-card-soft{
        background:rgba(255,255,255,.02);
        border:1px solid var(--line-soft);
        border-radius:14px;
      }

      .ce-topbar{padding:14px 16px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;}
      .ce-title{font-weight:700; letter-spacing:.2px;}
      .ce-muted{color:var(--muted);}
      .ce-small{font-size:.9rem;}
      .ce-xs{font-size:.8rem;}

      .ce-layout{display:flex; gap:14px; align-items:flex-start;}
      .ce-sidebar{width:280px; flex:0 0 280px;}
      .ce-main{flex:1; min-width:0;}

      .ce-side-inner{padding:14px;}
      .ce-brandbox{padding:14px; margin-bottom:12px;}
      .ce-nav{display:flex; flex-direction:column; gap:8px;}
      .ce-navbtn{
        width:100%; text-align:left; border:1px solid var(--line); background:rgba(255,255,255,.02);
        color:var(--text); border-radius:12px; padding:11px 12px; cursor:pointer; font-weight:600;
      }
      .ce-navbtn:hover{background:rgba(255,255,255,.04);}
      .ce-navbtn.active{
        background:linear-gradient(135deg, rgba(77,163,255,.20), rgba(77,163,255,.10));
        border-color:rgba(77,163,255,.35);
      }

      .ce-content{display:flex; flex-direction:column; gap:14px;}
      .ce-section-card{padding:14px;}
      .ce-h1{margin:0; font-size:1.5rem; line-height:1.15;}
      .ce-h2{margin:0; font-size:1.05rem; line-height:1.2;}
      .ce-p{margin:6px 0 0; color:var(--muted);}

      .ce-grid{display:grid; gap:12px;}
      .ce-grid.kpi{grid-template-columns:repeat(4,minmax(0,1fr));}
      .ce-grid.two{grid-template-columns:repeat(2,minmax(0,1fr));}
      .ce-grid.three{grid-template-columns:repeat(3,minmax(0,1fr));}
      .ce-grid.main-2-1{grid-template-columns:minmax(0,2fr) minmax(0,1fr);}

      .ce-kpi{padding:14px;}
      .ce-kpi .label{color:var(--muted); font-size:.86rem;}
      .ce-kpi .value{font-size:1.55rem; font-weight:700; margin-top:4px;}
      .ce-kpi .sub{color:var(--muted); font-size:.78rem; margin-top:4px;}

      .ce-btn{
        border:1px solid var(--line); background:rgba(255,255,255,.03); color:var(--text);
        border-radius:12px; padding:10px 12px; cursor:pointer; font-weight:600;
      }
      .ce-btn:hover{background:rgba(255,255,255,.05);}
      .ce-btn.primary{
        background:linear-gradient(135deg, var(--brand), #3579ff);
        border-color:transparent; color:#fff;
      }
      .ce-btn.ghost{background:transparent;}
      .ce-btn.small{padding:7px 10px; border-radius:10px; font-size:.9rem;}
      .ce-btn.block{width:100%;}

      .ce-badge{
        display:inline-flex; align-items:center; gap:6px; border-radius:999px;
        padding:4px 8px; font-size:.78rem; border:1px solid var(--line);
        background:rgba(255,255,255,.03);
      }
      .ce-badge.status-ok{border-color:rgba(126,224,129,.35); background:rgba(126,224,129,.08); color:#d8ffda;}
      .ce-badge.status-warn{border-color:rgba(255,209,102,.35); background:rgba(255,209,102,.08); color:#ffefbe;}
      .ce-badge.status-danger{border-color:rgba(255,123,123,.35); background:rgba(255,123,123,.08); color:#ffd4d4;}
      .ce-badge.outline{background:transparent;}

      .ce-row{display:flex; align-items:center; justify-content:space-between; gap:10px;}
      .ce-col{display:flex; flex-direction:column; gap:10px;}
      .ce-gap8{gap:8px;}
      .ce-gap12{gap:12px;}

      .ce-input, .ce-select{
        width:100%; background:rgba(255,255,255,.03); color:var(--text);
        border:1px solid var(--line); border-radius:12px; padding:10px 12px; outline:none;
      }
      .ce-input::placeholder{color:#a8b8d8;}
      .ce-input:focus, .ce-select:focus{
        border-color:rgba(77,163,255,.45);
        box-shadow:0 0 0 3px rgba(77,163,255,.15);
      }

      .ce-table-wrap{overflow:auto; border-radius:14px; border:1px solid var(--line);}
      table.ce-table{width:100%; border-collapse:collapse; min-width:820px; background:rgba(255,255,255,.015);}
      .ce-table th, .ce-table td{
        padding:10px 12px; border-bottom:1px solid var(--line-soft); text-align:left; vertical-align:top;
      }
      .ce-table th{font-size:.82rem; color:var(--muted); font-weight:600; background:rgba(255,255,255,.015);}
      .ce-table tr:hover td{background:rgba(255,255,255,.015);}
      .ce-table tr.selected td{background:rgba(77,163,255,.08);}
      .ce-table .subline{color:var(--muted); font-size:.75rem; margin-top:2px;}

      .ce-box{padding:12px; border-radius:14px; border:1px solid var(--line); background:rgba(255,255,255,.02);}
      .ce-box-title{font-size:.9rem; font-weight:600; margin-bottom:8px;}
      .ce-box-grid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px;}
      .ce-mini{font-size:.86rem;}
      .ce-divider{height:1px; background:var(--line); margin:8px 0;}

      .ce-alert{
        padding:10px 12px; border-radius:12px; border:1px solid rgba(255,123,123,.25);
        background:rgba(255,123,123,.06); color:#ffd4d4; font-size:.9rem;
      }
      .ce-info{
        padding:10px 12px; border-radius:12px; border:1px solid rgba(77,163,255,.25);
        background:rgba(77,163,255,.06); color:#d8eaff; font-size:.9rem;
      }

      .ce-login-shell{
        min-height:100%;
        display:grid;
        place-items:center;
        padding:20px;
      }
      .ce-login-card{
        width:min(520px, 100%);
        padding:20px;
      }
      .ce-login-grid{display:grid; gap:12px;}
      .ce-label{display:block; font-size:.88rem; color:var(--muted); margin-bottom:6px;}

      .ce-list{display:grid; gap:10px;}
      .ce-item{padding:10px; border-radius:12px; border:1px solid var(--line); background:rgba(255,255,255,.02);}
      .ce-item-title{font-weight:600;}
      .ce-item-sub{font-size:.8rem; color:var(--muted); margin-top:2px;}

      .ce-footer-note{font-size:.8rem; color:var(--muted);}

      @media (max-width: 1280px){
        .ce-grid.kpi{grid-template-columns:repeat(2,minmax(0,1fr));}
        .ce-grid.main-2-1{grid-template-columns:1fr;}
      }
      @media (max-width: 980px){
        .ce-layout{flex-direction:column;}
        .ce-sidebar{width:100%; flex:none;}
        .ce-side-inner{display:grid; grid-template-columns:1fr; gap:12px;}
      }
      @media (max-width: 720px){
        .ce-grid.kpi,.ce-grid.two,.ce-grid.three{grid-template-columns:1fr;}
        .ce-topbar{padding:12px;}
        .ce-section-card{padding:12px;}
      }
    `}</style>
  );
}

function Badge({ children, kind = "default", outline = false }) {
  const className = cls(
    "ce-badge",
    outline && "outline",
    kind === "ok" && "status-ok",
    kind === "warn" && "status-warn",
    kind === "danger" && "status-danger"
  );
  return <span className={className}>{children}</span>;
}

function statusBadge(status) {
  const s = String(status || "");
  let kind = "default";
  if (["active", "report_available", "generated", "updated"].includes(s)) kind = "ok";
  else if (["completed", "to_review", "invited"].includes(s)) kind = "warn";
  else if (["inactive"].includes(s)) kind = "danger";
  return <Badge kind={kind}>{statusLabel(status)}</Badge>;
}

function outcomeBadge(outcome) {
  const o = String(outcome || "");
  let kind = "default";
  if (o === "compatible") kind = "ok";
  else if (o === "to_review") kind = "warn";
  else if (o === "not_compatible") kind = "danger";
  return <Badge kind={kind}>{outcomeLabel(outcome)}</Badge>;
}

function KpiCard({ title, value, subtitle }) {
  return (
    <div className="ce-card ce-kpi">
      <div className="label">{title}</div>
      <div className="value">{value}</div>
      {subtitle ? <div className="sub">{subtitle}</div> : null}
    </div>
  );
}

/* =========================
   Demo fallback data (for tabs not yet on API)
========================= */
const DEMO_AGENCY = {
  name: "Agenzia Energia Milano Centro",
  user: "Responsabile Agenzia",
  role: "Responsabile Agenzia",
  creditsAvailable: 34,
};

const DEMO_OPERATORS = [
  {
    id: 2003,
    first_name: "Luca",
    last_name: "Bianchi",
    email: "l.bianchi@agenzia-milano-demo.it",
    status: "active",
    credits_balance: 7,
    activities_count_30d: 12,
    last_login_at: "2026-02-23T08:55:00",
    phone: "+39 333 2222222",
    instrument: { serial_number: "CHK-STR-0001" },
  },
  {
    id: 2004,
    first_name: "Giulia",
    last_name: "Verdi",
    email: "g.verdi@agenzia-milano-demo.it",
    status: "active",
    credits_balance: 3,
    activities_count_30d: 6,
    last_login_at: "2026-02-22T16:10:00",
    phone: "+39 333 3333333",
    instrument: { serial_number: "CHK-STR-0002" },
  },
];

const DEMO_CREDIT_MOVEMENTS = [
  {
    id: 10010,
    created_at: "2026-02-23T08:45:00",
    transaction_type: "assign_to_operator",
    direction: "debit",
    amount: 1,
    description: "Riassegnazione a Luca Bianchi",
    operator_id: 2003,
    activity_id: null,
    created_by_name: "Mario Rossi",
  },
  {
    id: 10002,
    created_at: "2026-02-20T10:00:00",
    transaction_type: "topup",
    direction: "credit",
    amount: 20,
    description: "Carico crediti agenzia",
    operator_id: null,
    activity_id: null,
    created_by_name: "Checks Admin",
  },
];

/* =========================
   Login view
========================= */
function LoginView({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showApi, setShowApi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await loginApi(username.trim(), password);
      const token = data?.token;
      if (!token) throw new Error("Token non ricevuto dal backend.");
      localStorage.setItem("ce_token", token);
      localStorage.setItem("ce_user", JSON.stringify(data?.user || null));
      onLoggedIn({ token, user: data?.user || null, expires_at: data?.expires_at || null });
    } catch (err) {
      setError(err.message || "Login non riuscito.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ce-login-shell">
      <div className="ce-card ce-login-card">
        <div className="ce-login-grid">
          <div>
            <div className="ce-title" style={{ fontSize: "1.15rem" }}>
              Checks Energy Dashboard
            </div>
            <div className="ce-p ce-small">
              Accesso area riservata (autenticazione backend reale)
            </div>
          </div>

          <div className="ce-info ce-small">
            API base: <strong>{API_BASE}</strong>
          </div>

          {error ? <div className="ce-alert">{error}</div> : null}

          <form onSubmit={handleSubmit} className="ce-login-grid">
            <div>
              <label className="ce-label">Username</label>
              <input
                className="ce-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="es. adminchecks"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="ce-label">Password</label>
              <input
                className="ce-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button className="ce-btn primary" type="submit" disabled={submitting}>
              {submitting ? "Accesso in corso..." : "Entra nella dashboard"}
            </button>
          </form>

          <button className="ce-btn ghost ce-small" onClick={() => setShowApi((v) => !v)}>
            {showApi ? "Nascondi dettagli tecnici" : "Mostra dettagli tecnici"}
          </button>

          {showApi ? (
            <div className="ce-box ce-mini">
              <div>POST <code>/api/v1/auth/login</code></div>
              <div>GET <code>/api/v1/auth/me</code></div>
              <div>GET <code>/api/v1/dashboard/summary</code></div>
              <div>GET <code>/api/v1/activities</code></div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Sidebar / Topbar
========================= */
function Sidebar({ view, setView }) {
  const items = [
    { key: "dashboard", label: "Dashboard" },
    { key: "activities", label: "Attività" },
    { key: "reports", label: "Relazioni PDF" },
    { key: "credits", label: "Crediti" },
    { key: "operators", label: "Operatori" },
    { key: "branding", label: "Branding Agenzia" },
  ];

  return (
    <aside className="ce-sidebar">
      <div className="ce-card ce-side-inner">
        <div className="ce-card-soft ce-brandbox">
          <div className="ce-xs ce-muted">Checks Energy Portal</div>
          <div className="ce-title" style={{ marginTop: 4 }}>Area Agenzia</div>
          <div className="ce-small ce-muted" style={{ marginTop: 6 }}>
            Dashboard operativa • versione React
          </div>
        </div>

        <div className="ce-nav">
          {items.map((item) => (
            <button
              key={item.key}
              className={cls("ce-navbtn", view === item.key && "active")}
              onClick={() => setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function TopBar({ sessionUser, onLogout, apiOnline }) {
  return (
    <div className="ce-card ce-topbar">
      <div>
        <div className="ce-small ce-muted">Agenzia</div>
        <div className="ce-title">Checks Energy • Portale Agenzia</div>
      </div>

      <div className="ce-row ce-gap8" style={{ flexWrap: "wrap" }}>
        <Badge kind={apiOnline ? "ok" : "warn"}>
          API {apiOnline ? "collegate" : "parziali / fallback"}
        </Badge>
        <Badge outline>{sessionUser?.username || "utente"}</Badge>
        <button className="ce-btn small" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}

/* =========================
   Views
========================= */
function DashboardView({
  summary,
  activities,
  setView,
  onOpenActivity,
  operators = DEMO_OPERATORS,
}) {
  const kpis = useMemo(() => {
    const apiKpis = summary?.kpis || {};
    const reportsAvailableApi = Number(apiKpis.reports_available ?? 0);
    const openActivitiesApi = Number(apiKpis.activities_open ?? 0);
    const creditsAvailableApi = Number(apiKpis.credits_available ?? DEMO_AGENCY.creditsAvailable);
    const operatorsActiveApi = Number(apiKpis.operators_active ?? operators.filter(o => o.status === "active").length);

    const latestActivity = [...activities]
      .sort((a, b) => new Date(b.activity_at || 0) - new Date(a.activity_at || 0))[0];

    return {
      credits_available: creditsAvailableApi,
      activities_open: openActivitiesApi,
      reports_available: reportsAvailableApi,
      operators_active: operatorsActiveApi,
      activities_total_loaded: activities.length,
      latest_activity_at: latestActivity?.activity_at || summary?.generated_at || null,
    };
  }, [summary, activities, operators]);

  return (
    <div className="ce-content">
      <div className="ce-card ce-section-card">
        <h1 className="ce-h1">Dashboard</h1>
        <p className="ce-p">Controllo operativo attività, report, operatori e crediti</p>
      </div>

      <div className="ce-grid kpi">
        <KpiCard title="Crediti disponibili" value={kpis.credits_available} subtitle="Da /dashboard/summary" />
        <KpiCard title="Attività aperte" value={kpis.activities_open} subtitle="Da /dashboard/summary" />
        <KpiCard title="Relazioni PDF disponibili" value={kpis.reports_available} subtitle="Da /dashboard/summary" />
        <KpiCard title="Operatori attivi" value={kpis.operators_active} subtitle="Da /dashboard/summary" />
      </div>

      <div className="ce-grid main-2-1">
        <div className="ce-card ce-section-card">
          <div className="ce-row" style={{ marginBottom: 10 }}>
            <h2 className="ce-h2">Ultime attività</h2>
            <button className="ce-btn small ghost" onClick={() => setView("activities")}>Vedi tutte</button>
          </div>

          <div className="ce-table-wrap">
            <table className="ce-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Cliente</th>
                  <th>Stato</th>
                  <th>Esito</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ce-muted">Nessuna attività disponibile</td>
                  </tr>
                ) : (
                  activities.slice(0, 8).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.public_code || `AT-${a.id}`}</div>
                        <div className="subline">{formatDateTime(a.activity_at)}</div>
                      </td>
                      <td>{a.customer_reference_name || "—"}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td>{outcomeBadge(a.outcome)}</td>
                      <td>
                        <button className="ce-btn small" onClick={() => onOpenActivity(a.id)}>
                          Apri
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ce-col ce-gap12">
          <div className="ce-card ce-section-card">
            <h2 className="ce-h2">Azioni rapide</h2>
            <div className="ce-col ce-gap8" style={{ marginTop: 10 }}>
              <button className="ce-btn block" onClick={() => setView("activities")}>Vai ad Attività</button>
              <button className="ce-btn block" onClick={() => setView("reports")}>Apri Relazioni PDF</button>
              <button className="ce-btn block" onClick={() => setView("operators")}>Gestisci Operatori</button>
              <button className="ce-btn block" onClick={() => setView("credits")}>Gestisci Crediti</button>
              <button className="ce-btn block" onClick={() => setView("branding")}>Branding Agenzia</button>
            </div>
          </div>

          <div className="ce-card ce-section-card">
            <h2 className="ce-h2">Stato sincronizzazione</h2>
            <div className="ce-p ce-small">
              KPI e attività letti dal backend. Le sezioni Crediti / Operatori / Branding restano in mock finché non colleghiamo i rispettivi endpoint.
            </div>
            <div className="ce-divider" />
            <div className="ce-mini ce-muted">
              Ultimo riferimento: {formatDateTime(kpis.latest_activity_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivitiesView({ activities, selectedId, onOpenActivity }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [outcome, setOutcome] = useState("all");

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const pool = [
        a.customer_reference_name,
        a.customer_reference_code,
        a.public_code,
        a.site_city,
        a.operator_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const queryOk = !q || pool.includes(q.toLowerCase());
      const statusOk = status === "all" || (a.status || "") === status;
      const outcomeOk = outcome === "all" || (a.outcome || "") === outcome;
      return queryOk && statusOk && outcomeOk;
    });
  }, [activities, q, status, outcome]);

  const selected =
    activities.find((a) => a.id === selectedId) ||
    filtered[0] ||
    null;

  return (
    <div className="ce-content">
      <div className="ce-card ce-section-card">
        <h1 className="ce-h1">Attività</h1>
        <p className="ce-p">Archivio attività, stato interventi e relazioni PDF generate</p>
      </div>

      <div className="ce-card ce-section-card">
        <div className="ce-grid three">
          <input
            className="ce-input"
            placeholder="Cerca cliente, codice attività, città..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="ce-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tutti gli stati</option>
            <option value="completed">Completata</option>
            <option value="report_available">Report disponibile</option>
            <option value="closed">Chiusa</option>
          </select>
          <select className="ce-select" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="all">Tutti gli esiti</option>
            <option value="compatible">Compatibile</option>
            <option value="to_review">Da approfondire</option>
            <option value="not_compatible">Non compatibile</option>
          </select>
        </div>
      </div>

      <div className="ce-grid main-2-1">
        <div className="ce-card ce-section-card">
          <h2 className="ce-h2" style={{ marginBottom: 10 }}>Elenco attività</h2>

          <div className="ce-table-wrap">
            <table className="ce-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Cliente</th>
                  <th>Stato</th>
                  <th>Esito</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="ce-muted">Nessuna attività trovata</td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.id} className={selected?.id === a.id ? "selected" : ""}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.public_code || `AT-${a.id}`}</div>
                        <div className="subline">{formatDateTime(a.activity_at)}</div>
                      </td>
                      <td>
                        <div>{a.customer_reference_name || "—"}</div>
                        {a.site_city ? <div className="subline">{a.site_city}</div> : null}
                      </td>
                      <td>{statusBadge(a.status)}</td>
                      <td>{outcomeBadge(a.outcome)}</td>
                      <td>
                        <button className="ce-btn small" onClick={() => onOpenActivity(a.id)}>Apri</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ce-card ce-section-card">
          <h2 className="ce-h2" style={{ marginBottom: 10 }}>Dettaglio attività</h2>

          {!selected ? (
            <div className="ce-muted">Nessuna attività selezionata</div>
          ) : (
            <div className="ce-col ce-gap12">
              <div className="ce-row">
                <div>
                  <div className="ce-title">{selected.public_code || `AT-${selected.id}`}</div>
                  <div className="ce-small ce-muted">
                    {selected.customer_reference_name || "—"}
                    {selected.site_city ? ` • ${selected.site_city}` : ""}
                  </div>
                </div>
                <div className="ce-row ce-gap8" style={{ flexWrap: "wrap" }}>
                  {statusBadge(selected.status)}
                  {outcomeBadge(selected.outcome)}
                </div>
              </div>

              <div className="ce-box">
                <div className="ce-box-title">Dati principali</div>
                <div className="ce-box-grid ce-mini">
                  <div><span className="ce-muted">ID:</span> {selected.id}</div>
                  <div><span className="ce-muted">Codice:</span> {selected.public_code || "—"}</div>
                  <div><span className="ce-muted">Cliente:</span> {selected.customer_reference_name || "—"}</div>
                  <div><span className="ce-muted">Comune:</span> {selected.site_city || "—"}</div>
                  <div><span className="ce-muted">Operatore:</span> {selected.operator_name || "—"}</div>
                  <div><span className="ce-muted">Data:</span> {formatDateTime(selected.activity_at)}</div>
                </div>
              </div>

              <div className="ce-box">
                <div className="ce-box-title">Report PDF</div>
                {selected.report_available ? (
                  <div className="ce-mini">
                    <Badge kind="ok">Disponibile</Badge>
                    <div className="ce-p ce-small" style={{ marginTop: 8 }}>
                      Endpoint download report da collegare nel prossimo step.
                    </div>
                  </div>
                ) : (
                  <div className="ce-mini ce-muted">Relazione non disponibile</div>
                )}
              </div>

              <div className="ce-box">
                <div className="ce-box-title">Nota</div>
                <div className="ce-mini ce-muted">
                  Se il backend in futuro esporrà un endpoint dettaglio attività (es. <code>/api/v1/activities/:id</code>),
                  qui mostreremo cronologia, note, sintesi prova e dettagli PDF reali.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsView({ activities }) {
  const reports = useMemo(
    () =>
      activities
        .filter((a) => a.report_available)
        .map((a) => ({
          id: a.id,
          public_code: a.public_code,
          customer_reference_name: a.customer_reference_name,
          operator_name: a.operator_name,
          status: a.status,
          outcome: a.outcome,
          generated_at: a.activity_at,
        })),
    [activities]
  );

  const [q, setQ] = useState("");

  const rows = reports.filter((r) =>
    [r.public_code, r.customer_reference_name, r.operator_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  return (
    <div className="ce-content">
      <div className="ce-card ce-section-card">
        <h1 className="ce-h1">Relazioni PDF</h1>
        <p className="ce-p">Archivio relazioni (derivato dalle attività con report disponibile)</p>
      </div>

      <div className="ce-card ce-section-card">
        <input
          className="ce-input"
          placeholder="Cerca per codice attività, cliente, operatore..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="ce-card ce-section-card">
        <div className="ce-table-wrap">
          <table className="ce-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Attività</th>
                <th>Cliente</th>
                <th>Operatore</th>
                <th>Stato</th>
                <th>Esito</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="ce-muted">Nessuna relazione trovata</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateTime(r.generated_at)}</td>
                    <td>{r.public_code || `AT-${r.id}`}</td>
                    <td>{r.customer_reference_name || "—"}</td>
                    <td>{r.operator_name || "—"}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>{outcomeBadge(r.outcome)}</td>
                    <td>
                      <button className="ce-btn small" disabled title="Endpoint download da collegare">
                        Scarica
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreditsView({ activities, operators }) {
  const totalCredits = 34;
  const assigned = operators.reduce((s, o) => s + (o.credits_balance || 0), 0);
  const used30d = 3;

  return (
    <div className="ce-content">
      <div className="ce-card ce-section-card">
        <h1 className="ce-h1">Crediti</h1>
        <p className="ce-p">Vista mock (in attesa endpoint crediti). Struttura pronta.</p>
      </div>

      <div className="ce-grid kpi">
        <KpiCard title="Crediti disponibili" value={totalCredits} subtitle="Mock" />
        <KpiCard title="Crediti assegnati operatori" value={assigned} subtitle="Mock" />
        <KpiCard title="Crediti utilizzati (30 gg)" value={used30d} subtitle="Mock" />
        <KpiCard title="Attività caricate" value={activities.length} subtitle="Dato reale (activities)" />
      </div>

      <div className="ce-grid two">
        <div className="ce-card ce-section-card">
          <h2 className="ce-h2">Crediti per operatore</h2>
          <div className="ce-list" style={{ marginTop: 10 }}>
            {operators.map((o) => (
              <div className="ce-item" key={o.id}>
                <div className="ce-row">
                  <div>
                    <div className="ce-item-title">{o.first_name} {o.last_name}</div>
                    <div className="ce-item-sub">{o.email}</div>
                  </div>
                  {statusBadge(o.status)}
                </div>
                <div className="ce-item-sub" style={{ marginTop: 8 }}>
                  Crediti assegnati: <strong style={{ color: "var(--text)" }}>{o.credits_balance}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ce-card ce-section-card">
          <h2 className="ce-h2">Storico movimenti (mock)</h2>
          <div className="ce-list" style={{ marginTop: 10 }}>
            {DEMO_CREDIT_MOVEMENTS.map((m) => (
              <div className="ce-item" key={m.id}>
                <div className="ce-row">
                  <div className="ce-item-title">{m.transaction_type}</div>
                  <div style={{ fontWeight: 700 }}>
                    {m.direction === "credit" ? "+" : "-"}{m.amount}
                  </div>
                </div>
                <div className="ce-item-sub">{m.description}</div>
                <div className="ce-item-sub">{formatDateTime(m.created_at)} • {m.created_by_name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OperatorsView({ operators, activities }) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(operators[0]?.id ?? null);

  const filtered = operators.filter((o) =>
    `${o.first_name} ${o.last_name} ${o.email}`.toLowerCase().includes(q.toLowerCase())
  );

  const selected = operators.find((o) => o.id === selectedId) || filtered[0] || null;
  const selectedActivities = activities.filter((a) => a.assigned_user_id === selected?.id);

  return (
    <div className="ce-content">
      <div className="ce-card ce-section-card">
        <h1 className="ce-h1">Operatori</h1>
        <p className="ce-p">Vista mock avanzata (in attesa endpoint operatori reali)</p>
      </div>

      <div className="ce-card ce-section-card">
        <input
          className="ce-input"
          placeholder="Cerca nome o email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="ce-grid main-2-1">
        <div className="ce-card ce-section-card">
          <h2 className="ce-h2" style={{ marginBottom: 10 }}>Elenco operatori</h2>
          <div className="ce-table-wrap">
            <table className="ce-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Stato</th>
                  <th>Crediti</th>
                  <th>Ultimo accesso</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className={selected?.id === o.id ? "selected" : ""}>
                    <td>{o.first_name} {o.last_name}</td>
                    <td>{o.email}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td>{o.credits_balance}</td>
                    <td>{formatDateTime(o.last_login_at)}</td>
                    <td>
                      <button className="ce-btn small" onClick={() => setSelectedId(o.id)}>Apri</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="ce-muted">Nessun operatore trovato</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ce-card ce-section-card">
          <h2 className="ce-h2" style={{ marginBottom: 10 }}>Scheda operatore</h2>
          {!selected ? (
            <div className="ce-muted">Nessun operatore selezionato</div>
          ) : (
            <div className="ce-col ce-gap12">
              <div className="ce-row">
                <div>
                  <div className="ce-title">{selected.first_name} {selected.last_name}</div>
                  <div className="ce-small ce-muted">{selected.email}</div>
                </div>
                {statusBadge(selected.status)}
              </div>

              <div className="ce-box">
                <div className="ce-box-title">Dati operatore</div>
                <div className="ce-box-grid ce-mini">
                  <div><span className="ce-muted">Telefono:</span> {selected.phone || "—"}</div>
                  <div><span className="ce-muted">Crediti:</span> {selected.credits_balance}</div>
                  <div><span className="ce-muted">Attività 30 gg:</span> {selected.activities_count_30d || 0}</div>
                  <div><span className="ce-muted">Ultimo accesso:</span> {formatDateTime(selected.last_login_at)}</div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span className="ce-muted">Strumento:</span> {selected.instrument?.serial_number || "—"}
                  </div>
                </div>
              </div>

              <div className="ce-box">
                <div className="ce-box-title">Attività recenti (reali se mappate)</div>
                <div className="ce-list">
                  {selectedActivities.length ? selectedActivities.map((a) => (
                    <div className="ce-item" key={a.id}>
                      <div className="ce-row">
                        <div>
                          <div className="ce-item-title">{a.public_code || `AT-${a.id}`}</div>
                          <div className="ce-item-sub">{a.customer_reference_name || "—"}</div>
                        </div>
                        {statusBadge(a.status)}
                      </div>
                    </div>
                  )) : <div className="ce-muted ce-small">Nessuna attività associata</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandingView() {
  return (
    <div className="ce-content">
      <div className="ce-card ce-section-card">
        <h1 className="ce-h1">Branding Agenzia</h1>
        <p className="ce-p">Sezione mock pronta da collegare agli endpoint/configurazioni reali</p>
      </div>

      <div className="ce-grid two">
        <div className="ce-card ce-section-card">
          <h2 className="ce-h2">Configurazione testata PDF</h2>
          <div className="ce-grid two" style={{ marginTop: 12 }}>
            <div>
              <label className="ce-label">Nome agenzia</label>
              <input className="ce-input" defaultValue="Agenzia Energia Milano Centro" />
            </div>
            <div>
              <label className="ce-label">Email</label>
              <input className="ce-input" defaultValue="info@checks.energy" />
            </div>
            <div>
              <label className="ce-label">Telefono</label>
              <input className="ce-input" defaultValue="+39 02 000000" />
            </div>
            <div>
              <label className="ce-label">Indirizzo (riga breve)</label>
              <input className="ce-input" defaultValue="Milano (MI)" />
            </div>
          </div>
          <div className="ce-row ce-gap8" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <button className="ce-btn primary">Salva configurazione</button>
            <button className="ce-btn">Anteprima PDF demo</button>
          </div>
        </div>

        <div className="ce-card ce-section-card">
          <h2 className="ce-h2">Logo agenzia</h2>
          <div className="ce-box" style={{ marginTop: 12, minHeight: 130, display: "grid", placeItems: "center" }}>
            <div className="ce-muted">Preview logo</div>
          </div>
          <div className="ce-col ce-gap8" style={{ marginTop: 12 }}>
            <div className="ce-small">Stato: <Badge outline>Attivo</Badge></div>
            <div className="ce-small ce-muted">Ultimo caricamento: 21/02/2026</div>
            <button className="ce-btn primary block">Carica logo</button>
            <button className="ce-btn block">Rimuovi / sostituisci</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Main App
========================= */
export default function App() {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("ce_token") || "");
  const [sessionUser, setSessionUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ce_user") || "null");
    } catch {
      return null;
    }
  });

  const [view, setView] = useState("dashboard");
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  const [apiOnline, setApiOnline] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBooting(true);
      setLoadError("");

      if (!token) {
        setBooting(false);
        return;
      }

      try {
        const me = await meApi(token);
        if (cancelled) return;

        setSessionUser(me?.user || sessionUser || null);

        const [sumRes, actRes] = await Promise.allSettled([
          summaryApi(token),
          activitiesApi(token),
        ]);

        if (cancelled) return;

        let partialError = "";

        if (sumRes.status === "fulfilled") {
          setSummary(sumRes.value || null);
          setApiOnline(true);
        } else {
          partialError += `Summary non disponibile: ${sumRes.reason?.message || "errore"}. `;
          setSummary(null);
        }

        if (actRes.status === "fulfilled") {
          const items = Array.isArray(actRes.value?.items) ? actRes.value.items : [];
          const mapped = items.map((a) => ({
            ...a,
            // Manteniamo compatibilità con viste ricche:
            activity_at: a.activity_at || a.created_at || summary?.generated_at || null,
            site_city: a.site_city || null,
            operator_name: a.operator_name || null,
            assigned_user_id: a.assigned_user_id || null,
            report_available: typeof a.report_available === "boolean"
              ? a.report_available
              : a.status === "report_available",
          }));
          setActivities(mapped);
          if (!selectedActivityId && mapped[0]?.id) setSelectedActivityId(mapped[0].id);
          setApiOnline(true);
        } else {
          partialError += `Activities non disponibili: ${actRes.reason?.message || "errore"}. `;
          setActivities([]);
        }

        if (partialError) setLoadError(partialError.trim());
      } catch (err) {
        if (cancelled) return;
        // Token scaduto/non valido: logout
        localStorage.removeItem("ce_token");
        localStorage.removeItem("ce_user");
        setToken("");
        setSessionUser(null);
        setSummary(null);
        setActivities([]);
        setApiOnline(false);
        setLoadError(`Sessione non valida o scaduta: ${err.message}`);
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleLoggedIn({ token, user }) {
    setToken(token);
    setSessionUser(user || null);
  }

  function handleLogout() {
    localStorage.removeItem("ce_token");
    localStorage.removeItem("ce_user");
    setToken("");
    setSessionUser(null);
    setSummary(null);
    setActivities([]);
    setApiOnline(false);
    setLoadError("");
    setView("dashboard");
  }

  const content = (() => {
    if (view === "dashboard") {
      return (
        <DashboardView
          summary={summary}
          activities={activities}
          setView={setView}
          onOpenActivity={(id) => {
            setSelectedActivityId(id);
            setView("activities");
          }}
        />
      );
    }

    if (view === "activities") {
      return (
        <ActivitiesView
          activities={activities}
          selectedId={selectedActivityId}
          onOpenActivity={(id) => setSelectedActivityId(id)}
        />
      );
    }

    if (view === "reports") {
      return <ReportsView activities={activities} />;
    }

    if (view === "credits") {
      return <CreditsView activities={activities} operators={DEMO_OPERATORS} />;
    }

    if (view === "operators") {
      return <OperatorsView operators={DEMO_OPERATORS} activities={activities} />;
    }

    if (view === "branding") {
      return <BrandingView />;
    }

    return null;
  })();

  return (
    <>
      <ShellStyles />

      {!token ? (
        <LoginView onLoggedIn={handleLoggedIn} />
      ) : (
        <div className="ce-page">
          <div className="ce-wrap">
            <TopBar sessionUser={sessionUser} onLogout={handleLogout} apiOnline={apiOnline} />

            {booting ? (
              <div className="ce-card ce-section-card">
                <div className="ce-info">Caricamento dati dashboard...</div>
              </div>
            ) : null}

            {loadError ? (
              <div className="ce-card ce-section-card">
                <div className="ce-alert">{loadError}</div>
              </div>
            ) : null}

            <div className="ce-layout">
              <Sidebar view={view} setView={setView} />
              <main className="ce-main">{content}</main>
            </div>

            <div className="ce-footer-note">
              API base configurata: <strong>{API_BASE}</strong>
            </div>
          </div>
        </div>
      )}
    </>
  );
}