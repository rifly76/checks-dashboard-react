import { useEffect, useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://checks-energy-api.onrender.com";

function App() {
  const [token, setToken] = useState(localStorage.getItem("ce_token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [me, setMe] = useState(null);

  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [reports, setReports] = useState([]);
  const [operators, setOperators] = useState([]);
  const [credits, setCredits] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [dataErrors, setDataErrors] = useState({});

  const isLogged = !!token;

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    let body = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    if (!res.ok) {
      const msg =
        (body && body.message) ||
        (typeof body === "string" && body) ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return body;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // compatibile con diverse risposte possibili
      const receivedToken =
        data?.token || data?.accessToken || data?.access_token || "";

      if (!receivedToken) {
        throw new Error("Token non presente nella risposta di login");
      }

      localStorage.setItem("ce_token", receivedToken);
      setToken(receivedToken);
    } catch (err) {
      setError(err.message || "Errore login");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("ce_token");
    setToken("");
    setMe(null);
    setSummary(null);
    setActivities([]);
    setReports([]);
    setOperators([]);
    setCredits(null);
    setDataErrors({});
  }

  async function fetchProtectedData() {
    setLoadingData(true);
    setDataErrors({});

    const nextErrors = {};

    const safeLoad = async (label, path, setter, fallbackValue) => {
      try {
        const data = await apiFetch(path, { headers: authHeaders });
        setter(data);
      } catch (err) {
        nextErrors[label] = err.message || "Errore";
        setter(fallbackValue);
      }
    };

    await Promise.all([
      safeLoad("me", "/api/v1/auth/me", setMe, null),
      safeLoad("summary", "/api/v1/dashboard/summary", setSummary, null),
      safeLoad("activities", "/api/v1/activities", setActivities, []),

      // endpoint aggiunti (assunti)
      safeLoad("reports", "/api/v1/reports", setReports, []),
      safeLoad("operators", "/api/v1/operators", setOperators, []),
      safeLoad("credits", "/api/v1/credits", setCredits, null),
    ]);

    setDataErrors(nextErrors);
    setLoadingData(false);
  }

  useEffect(() => {
    if (!token) return;
    fetchProtectedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const summaryCards = [
    {
      label: "Attività",
      value:
        summary?.activities ??
        summary?.totalActivities ??
        (Array.isArray(activities) ? activities.length : "—"),
    },
    {
      label: "Report",
      value:
        summary?.reports ??
        summary?.totalReports ??
        (Array.isArray(reports) ? reports.length : "—"),
    },
    {
      label: "Operatori",
      value:
        summary?.operators ??
        summary?.totalOperators ??
        (Array.isArray(operators) ? operators.length : "—"),
    },
    {
      label: "Crediti",
      value:
        summary?.credits ??
        credits?.available ??
        credits?.balance ??
        credits?.remaining ??
        "—",
    },
  ];

  if (!isLogged) {
    return (
      <div style={styles.page}>
        <div style={styles.bgGlowA} />
        <div style={styles.bgGlowB} />
        <div style={styles.loginWrap}>
          <div style={styles.card}>
            <h1 style={styles.title}>Checks Energy Dashboard</h1>
            <p style={styles.subtitle}>
              Accesso area riservata (backend API reale)
            </p>

            <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
              <input
                style={styles.input}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
              <input
                style={styles.input}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button style={styles.primaryBtn} type="submit" disabled={loading}>
                {loading ? "Accesso..." : "Accedi"}
              </button>
            </form>

            {error ? <div style={styles.errorBox}>{error}</div> : null}

            <div style={styles.microNote}>
              API base: <code>{API_BASE}</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgGlowA} />
      <div style={styles.bgGlowB} />

      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={{ ...styles.title, margin: 0 }}>Checks Energy Dashboard</h1>
            <p style={{ ...styles.subtitle, marginTop: 6 }}>
              Area riservata • Portale operativo
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={styles.secondaryBtn} onClick={fetchProtectedData} disabled={loadingData}>
              {loadingData ? "Aggiorno..." : "Aggiorna dati"}
            </button>
            <button style={styles.secondaryBtn} onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {me && (
          <section style={styles.card}>
            <div style={styles.sectionHeader}>Profilo</div>
            <div style={styles.grid2}>
              <InfoRow label="Utente" value={me.name || me.email || "—"} />
              <InfoRow label="Ruolo" value={me.role || "—"} />
            </div>
          </section>
        )}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>Riepilogo</div>
          <div style={styles.kpiGrid}>
            {summaryCards.map((c) => (
              <div key={c.label} style={styles.kpiCard}>
                <div style={styles.kpiValue}>{c.value ?? "—"}</div>
                <div style={styles.kpiLabel}>{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.grid2}>
          <PanelList
            title="Attività recenti"
            error={dataErrors.activities}
            items={normalizeList(activities)}
            renderItem={(a, i) => (
              <div key={a.id || i} style={styles.listRow}>
                <div>
                  <div style={styles.rowTitle}>
                    {a.title || a.name || `Attività #${a.id || i + 1}`}
                  </div>
                  <div style={styles.rowMeta}>
                    {a.status || "stato n/d"} • {a.createdAt || a.date || "data n/d"}
                  </div>
                </div>
              </div>
            )}
          />

          <PanelList
            title="Report"
            error={dataErrors.reports}
            items={normalizeList(reports)}
            renderItem={(r, i) => (
              <div key={r.id || i} style={styles.listRow}>
                <div>
                  <div style={styles.rowTitle}>
                    {r.title || r.code || `Report #${r.id || i + 1}`}
                  </div>
                  <div style={styles.rowMeta}>
                    {r.status || "stato n/d"} • {r.createdAt || r.date || "data n/d"}
                  </div>
                </div>
              </div>
            )}
          />
        </section>

        <section style={styles.grid2}>
          <PanelList
            title="Operatori"
            error={dataErrors.operators}
            items={normalizeList(operators)}
            renderItem={(op, i) => (
              <div key={op.id || i} style={styles.listRow}>
                <div>
                  <div style={styles.rowTitle}>
                    {op.name || op.fullName || op.email || `Operatore #${i + 1}`}
                  </div>
                  <div style={styles.rowMeta}>
                    {op.role || "ruolo n/d"} {op.active === false ? "• inattivo" : ""}
                  </div>
                </div>
              </div>
            )}
          />

          <div style={styles.cardInner}>
            <div style={styles.sectionHeader}>Crediti</div>
            {dataErrors.credits ? (
              <div style={styles.warnBox}>Endpoint credits: {dataErrors.credits}</div>
            ) : credits ? (
              <div style={styles.grid2}>
                {Object.entries(credits).map(([k, v]) => (
                  <InfoRow key={k} label={k} value={String(v)} />
                ))}
              </div>
            ) : (
              <div style={styles.emptyBox}>Nessun dato crediti disponibile</div>
            )}
          </div>
        </section>

        {Object.keys(dataErrors).length > 0 && (
          <section style={styles.card}>
            <div style={styles.sectionHeader}>Note integrazione endpoint</div>
            <div style={styles.microNote}>
              Alcuni endpoint non hanno risposto (path diversi / non ancora esposti). La dashboard resta operativa.
            </div>
            <ul style={{ marginTop: 10, color: "#b9c8ea" }}>
              {Object.entries(dataErrors).map(([k, v]) => (
                <li key={k}>
                  <strong>{k}</strong>: {v}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function PanelList({ title, items, error, renderItem }) {
  return (
    <div style={styles.cardInner}>
      <div style={styles.sectionHeader}>{title}</div>

      {error ? (
        <div style={styles.warnBox}>{error}</div>
      ) : items.length === 0 ? (
        <div style={styles.emptyBox}>Nessun elemento</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.slice(0, 8).map(renderItem)}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 15% -5%, rgba(77,163,255,.16), transparent 40%), radial-gradient(circle at 90% 5%, rgba(120,224,194,.10), transparent 42%), #0b1020",
    color: "#eef3ff",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  bgGlowA: {
    position: "absolute",
    inset: "auto auto 10% -10%",
    width: 320,
    height: 320,
    background: "rgba(77,163,255,.10)",
    filter: "blur(60px)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  bgGlowB: {
    position: "absolute",
    inset: "5% -8% auto auto",
    width: 260,
    height: 260,
    background: "rgba(120,224,194,.08)",
    filter: "blur(60px)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  container: {
    width: "min(1180px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "24px 0 40px",
    display: "grid",
    gap: 16,
    position: "relative",
    zIndex: 1,
  },
  loginWrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    width: "min(520px, calc(100% - 24px))",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },
  card: {
    background: "linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01))",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 18,
    boxShadow: "0 20px 40px rgba(0,0,0,.25)",
    padding: 18,
  },
  cardInner: {
    background: "linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01))",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 18,
    boxShadow: "0 20px 40px rgba(0,0,0,.15)",
    padding: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    fontSize: "1.45rem",
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "#9fb0d1",
    margin: 0,
  },
  sectionHeader: {
    fontWeight: 700,
    marginBottom: 12,
    color: "#dbe8ff",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.03)",
    color: "#eef3ff",
    outline: "none",
  },
  primaryBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    color: "white",
    background: "linear-gradient(135deg, #4da3ff, #3579ff)",
  },
  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.10)",
    cursor: "pointer",
    fontWeight: 600,
    color: "#eef3ff",
    background: "rgba(255,255,255,.03)",
  },
  errorBox: {
    marginTop: 12,
    border: "1px solid rgba(255,100,100,.25)",
    background: "rgba(255,100,100,.08)",
    color: "#ffd5d5",
    borderRadius: 12,
    padding: 12,
  },
  warnBox: {
    border: "1px solid rgba(255,209,102,.20)",
    background: "rgba(255,209,102,.06)",
    color: "#ffefbe",
    borderRadius: 12,
    padding: 12,
  },
  emptyBox: {
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.02)",
    color: "#9fb0d1",
    borderRadius: 12,
    padding: 12,
  },
  microNote: {
    marginTop: 10,
    color: "#9fb0d1",
    fontSize: ".9rem",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 10,
  },
  kpiCard: {
    background: "rgba(255,255,255,.02)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 14,
    padding: 14,
  },
  kpiValue: {
    fontSize: "1.25rem",
    fontWeight: 700,
    marginBottom: 4,
  },
  kpiLabel: {
    color: "#9fb0d1",
    fontSize: ".9rem",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },
  listRow: {
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.02)",
    borderRadius: 12,
    padding: 12,
  },
  rowTitle: {
    fontWeight: 600,
    color: "#eef3ff",
  },
  rowMeta: {
    color: "#9fb0d1",
    fontSize: ".9rem",
    marginTop: 4,
  },
  infoRow: {
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.02)",
    borderRadius: 12,
    padding: 12,
  },
  infoLabel: {
    color: "#9fb0d1",
    fontSize: ".85rem",
    marginBottom: 4,
  },
  infoValue: {
    color: "#eef3ff",
    fontWeight: 600,
    wordBreak: "break-word",
  },
};

export default App;