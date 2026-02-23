import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Coins,
  Users,
  Building2,
  Search,
  LogOut,
  Shield,
  RefreshCw,
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://checks-energy-api.onrender.com').replace(/\/$/, '');
const TOKEN_KEY = 'checks_dashboard_token';

const demoAgency = {
  id: 1001,
  name: 'Agenzia Energia Milano Centro',
  user: 'Mario Rossi',
  role: 'Responsabile Agenzia',
  creditsAvailable: 34,
};

const demoOperators = [
  {
    id: 2003,
    first_name: 'Luca',
    last_name: 'Bianchi',
    email: 'l.bianchi@agenzia-milano-demo.it',
    status: 'active',
    activities_count_30d: 12,
    last_login_at: '2026-02-23T08:55:00',
    credits_balance: 7,
    credits_used_30d: 8,
    phone: '+39 333 2222222',
    instrument: { serial_number: 'CHK-STR-0001', model: 'Checks Energy Meter Unit', status: 'assigned' },
  },
  {
    id: 2004,
    first_name: 'Giulia',
    last_name: 'Verdi',
    email: 'g.verdi@agenzia-milano-demo.it',
    status: 'active',
    activities_count_30d: 6,
    last_login_at: '2026-02-22T16:10:00',
    credits_balance: 3,
    credits_used_30d: 4,
    phone: '+39 333 3333333',
    instrument: { serial_number: 'CHK-STR-0002', model: 'Checks Energy Meter Unit', status: 'assigned' },
  },
];

const demoActivities = [
  {
    id: 5001,
    public_code: 'AT-2026-00124',
    activity_at: '2026-02-23T09:14:00',
    customer_reference_name: 'Mario Rossi',
    customer_reference_code: 'RIF-2026-014',
    site_city: 'Milano',
    site_address: 'Via Torino 10',
    status: 'report_available',
    outcome: 'compatible',
    assigned_user_id: 2003,
    operator_name: 'Luca Bianchi',
    report_available: true,
    request_type: 'controllo_contatore',
    source_type: 'retention',
    pod_code: 'IT001E12345678',
    test_summary: {
      test_duration_seconds: 900,
      optical_reader_status: 'ok',
      measurement_status: 'ok',
      comparison_status: 'completed',
      error_percent: 0.42,
      notes_auto: 'Acquisizione impulsi corretta; confronto energia eseguito.',
    },
    report: {
      id: 7001,
      status: 'generated',
      file_name: 'AT-2026-00124-relazione.pdf',
      generated_at: '2026-02-23T09:25:00',
      branding_applied: true,
      delivery_status: 'to_send',
    },
    notes: [{ id: 8001, author_name: 'Mario Rossi', note_text: 'Cliente informato che la relazione è disponibile.', created_at: '2026-02-23T09:40:00' }],
    events: [
      { id: 9001, event_label: 'Attività creata', created_at: '2026-02-23T08:40:00', author_name: 'Mario Rossi' },
      { id: 9003, event_label: 'Intervento avviato', created_at: '2026-02-23T09:00:00', author_name: 'Luca Bianchi' },
      { id: 9005, event_label: 'Relazione PDF generata', created_at: '2026-02-23T09:25:00', author_name: 'Sistema' },
    ],
  },
  {
    id: 5002,
    public_code: 'AT-2026-00125',
    activity_at: '2026-02-22T14:20:00',
    customer_reference_name: 'Condominio Aurora',
    customer_reference_code: 'RIF-2026-015',
    site_city: 'Milano',
    site_address: 'Viale Monza 125',
    status: 'completed',
    outcome: 'to_review',
    assigned_user_id: 2004,
    operator_name: 'Giulia Verdi',
    report_available: false,
    request_type: 'dubbi_consumi',
    source_type: 'agency',
    pod_code: 'IT001E87654321',
    test_summary: {
      test_duration_seconds: 900,
      optical_reader_status: 'ok',
      measurement_status: 'ok',
      comparison_status: 'completed',
      error_percent: 2.85,
      notes_auto: 'Scostamento da approfondire nelle condizioni osservate.',
    },
    report: null,
    notes: [{ id: 8002, author_name: 'Mario Rossi', note_text: 'Valutare passaggio a iter ufficiale del distributore.', created_at: '2026-02-22T15:10:00' }],
    events: [{ id: 9010, event_label: 'Attività creata', created_at: '2026-02-22T13:00:00', author_name: 'Mario Rossi' }],
  },
];

const demoCreditMovements = [
  { id: 10010, created_at: '2026-02-23T08:45:00', transaction_type: 'assign_to_operator', direction: 'debit', amount: 1, description: 'Riassegnazione a Luca Bianchi', operator_id: 2003, activity_id: null, created_by_name: 'Mario Rossi' },
  { id: 10002, created_at: '2026-02-20T10:00:00', transaction_type: 'topup', direction: 'credit', amount: 20, description: 'Carico crediti agenzia', operator_id: null, activity_id: null, created_by_name: 'Checks Admin' },
];

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status) {
  return {
    scheduled: 'Programmata',
    in_progress: 'In corso',
    completed: 'Completata',
    report_available: 'Report disponibile',
    closed: 'Chiusa',
    active: 'Attivo',
    inactive: 'Non attivo',
    generated: 'Generato',
    updated: 'Aggiornato',
  }[status] || status || '—';
}

function outcomeLabel(outcome) {
  return {
    compatible: 'Compatibile',
    not_compatible: 'Non compatibile',
    to_review: 'Da approfondire',
    na: 'N/D',
  }[outcome] || outcome || '—';
}

function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function KpiCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="card kpi-card">
      <div className="kpi-head">
        <div>
          <div className="muted small">{title}</div>
          <div className="kpi-value">{value}</div>
          {subtitle ? <div className="muted xsmall">{subtitle}</div> : null}
        </div>
        {Icon ? <Icon size={18} className="muted" /> : null}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) throw new Error(data?.error || 'Login non riuscito');
      sessionStorage.setItem(TOKEN_KEY, data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message || 'Errore di login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand"><Shield size={20} /> Checks Energy Dashboard</div>
        <h1>Accesso area riservata</h1>
        <p className="muted">Login via API Render (`/api/v1/auth/login`).</p>
        <form onSubmit={submit} className="form-grid">
          <label>
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error ? <div className="error-box">{error}</div> : null}
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Accesso...' : 'Entra'}</button>
        </form>
        <div className="muted xsmall">API base: {API_BASE}</div>
      </div>
    </div>
  );
}

function Sidebar({ view, setView }) {
  const items = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['activities', 'Attività', ClipboardList],
    ['reports', 'Relazioni PDF', FileText],
    ['credits', 'Crediti', Coins],
    ['operators', 'Operatori', Users],
    ['branding', 'Branding Agenzia', Building2],
  ];

  return (
    <aside className="sidebar card">
      <div className="sidebar-title">Checks Energy Portal</div>
      <div className="muted small">Agenzia Energia Milano Centro</div>
      <div className="sidebar-list">
        {items.map(([key, label, Icon]) => (
          <button key={key} className={`nav-btn ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>
            <Icon size={16} /> <span>{label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function TopBar({ authUser, onLogout, onRefresh, loading }) {
  return (
    <div className="card topbar">
      <div>
        <div className="muted small">Agenzia</div>
        <div className="title">{demoAgency.name}</div>
      </div>
      <div className="topbar-right">
        <Badge>{demoAgency.role}</Badge>
        <span className="muted small">{authUser || demoAgency.user}</span>
        <Badge tone="brand">Crediti: {demoAgency.creditsAvailable}</Badge>
        <button className="btn" onClick={onRefresh} disabled={loading}><RefreshCw size={14} /> Aggiorna</button>
        <button className="btn" onClick={onLogout}><LogOut size={14} /> Esci</button>
      </div>
    </div>
  );
}

function DashboardView({ data, setView, openActivity }) {
  const reports = data.reports;
  const operators = data.operators;
  const activities = data.activities;
  const summary = data.summary;

  return (
    <div className="stack">
      <div>
        <h1>Dashboard</h1>
        <p className="muted">Controllo operativo attività, report, operatori e crediti</p>
      </div>
      <div className="grid-4">
        <KpiCard title="Attività aperte" value={summary.kpis.activities_open ?? activities.length} subtitle="Richiedono attenzione" icon={ClipboardList} />
        <KpiCard title="Relazioni PDF disponibili" value={summary.kpis.reports_available ?? reports.length} subtitle="Pronte da consultare" icon={FileText} />
        <KpiCard title="Crediti disponibili" value={summary.kpis.credits_available ?? demoAgency.creditsAvailable} subtitle="Gestione attività" icon={Coins} />
        <KpiCard title="Operatori attivi" value={summary.kpis.operators_active ?? operators.length} subtitle="Rete operativa" icon={Users} />
      </div>

      <div className="layout-main">
        <div className="card">
          <div className="section-head"><h2>Ultime attività</h2><button className="btn" onClick={() => setView('activities')}>Vedi tutte</button></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Codice</th><th>Cliente</th><th>Operatore</th><th>Stato</th><th>Esito</th><th></th></tr></thead>
              <tbody>
                {activities.slice(0, 8).map((a) => (
                  <tr key={a.id}>
                    <td>{a.public_code}</td>
                    <td>{a.customer_reference_name}</td>
                    <td>{a.operator_name || '—'}</td>
                    <td><Badge>{statusLabel(a.status)}</Badge></td>
                    <td><Badge tone={a.outcome === 'compatible' ? 'success' : a.outcome === 'to_review' ? 'warn' : 'neutral'}>{outcomeLabel(a.outcome)}</Badge></td>
                    <td><button className="btn btn-small" onClick={() => openActivity(a.id)}>Apri</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="side-col stack">
          <div className="card">
            <h2>Azioni rapide</h2>
            <div className="stack-sm">
              <button className="btn btn-block" onClick={() => setView('activities')}>Vai ad Attività</button>
              <button className="btn btn-block" onClick={() => setView('reports')}>Apri Relazioni PDF</button>
              <button className="btn btn-block" onClick={() => setView('operators')}>Gestisci Operatori</button>
              <button className="btn btn-block" onClick={() => setView('credits')}>Gestisci Crediti</button>
              <button className="btn btn-block" onClick={() => setView('branding')}>Gestisci Logo Agenzia</button>
            </div>
          </div>
          <div className="card">
            <h2>Crediti</h2>
            <div className="kv"><span>Disponibili</span><b>{summary.kpis.credits_available ?? demoAgency.creditsAvailable}</b></div>
            <div className="kv"><span>Assegnati operatori</span><b>{operators.reduce((s, o) => s + (o.credits_balance || 0), 0)}</b></div>
            <div className="kv"><span>Utilizzati (30 gg)</span><b>{operators.reduce((s, o) => s + (o.credits_used_30d || 0), 0)}</b></div>
            <div className="muted xsmall">Ultimo movimento: {formatDateTime(data.creditMovements[0]?.created_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivitiesView({ data, selectedActivityId, setSelectedActivityId }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const rows = data.activities.filter((a) => {
    const queryOk = !q || `${a.public_code} ${a.customer_reference_name} ${a.operator_name || ''}`.toLowerCase().includes(q.toLowerCase());
    const statusOk = status === 'all' || a.status === status;
    return queryOk && statusOk;
  });
  const selected = rows.find((r) => r.id === selectedActivityId) || rows[0] || null;

  return (
    <div className="stack">
      <div>
        <h1>Attività</h1>
        <p className="muted">Archivio attività, stato interventi e relazioni PDF generate</p>
      </div>
      <div className="card filters-row">
        <div className="search-box"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca cliente o codice attività" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Tutti gli stati</option>
          <option value="completed">Completata</option>
          <option value="report_available">Report disponibile</option>
          <option value="closed">Chiusa</option>
        </select>
      </div>
      <div className="split-2">
        <div className="card">
          <h2>Elenco attività</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data/Ora</th><th>Cliente</th><th>Comune</th><th>Operatore</th><th>Stato</th><th>Esito</th><th></th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className={selected?.id === a.id ? 'row-selected' : ''}>
                    <td>{formatDateTime(a.activity_at)}</td>
                    <td><div>{a.customer_reference_name}</div><div className="muted xsmall">{a.public_code}</div></td>
                    <td>{a.site_city || '—'}</td>
                    <td>{a.operator_name || '—'}</td>
                    <td><Badge>{statusLabel(a.status)}</Badge></td>
                    <td><Badge tone={a.outcome === 'compatible' ? 'success' : a.outcome === 'to_review' ? 'warn' : 'neutral'}>{outcomeLabel(a.outcome)}</Badge></td>
                    <td><button className="btn btn-small" onClick={() => setSelectedActivityId(a.id)}>Apri</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Dettaglio attività</h2>
          {!selected ? <div className="muted">Nessuna attività selezionata</div> : (
            <div className="stack-sm">
              <div className="detail-header">
                <div>
                  <div className="title">{selected.public_code}</div>
                  <div className="muted small">{selected.customer_reference_name} • {selected.site_city || '—'}</div>
                </div>
                <div className="stack-inline">
                  <Badge>{statusLabel(selected.status)}</Badge>
                  <Badge tone={selected.outcome === 'compatible' ? 'success' : 'warn'}>{outcomeLabel(selected.outcome)}</Badge>
                </div>
              </div>

              <div className="mini-grid">
                <div className="mini-card"><span>Operatore</span><b>{selected.operator_name || '—'}</b></div>
                <div className="mini-card"><span>Data attività</span><b>{formatDateTime(selected.activity_at)}</b></div>
                <div className="mini-card"><span>Tipo richiesta</span><b>{selected.request_type?.replaceAll('_', ' ') || '—'}</b></div>
                <div className="mini-card"><span>Origine</span><b>{selected.source_type || '—'}</b></div>
              </div>

              <div className="panel">
                <div className="panel-title">Sintesi prova</div>
                <div className="detail-list">
                  <div>Errore percentuale <b>{selected.test_summary?.error_percent?.toFixed?.(2) ?? '—'}%</b></div>
                  <div>Lettore ottico <b>{selected.test_summary?.optical_reader_status || '—'}</b></div>
                  <div>Misura <b>{selected.test_summary?.measurement_status || '—'}</b></div>
                  <div>Confronto <b>{selected.test_summary?.comparison_status || '—'}</b></div>
                </div>
                {selected.test_summary?.notes_auto ? <div className="muted xsmall">{selected.test_summary.notes_auto}</div> : null}
              </div>

              <div className="panel">
                <div className="panel-title">Relazione PDF</div>
                {selected.report ? (
                  <div className="stack-sm">
                    <div>File: <b>{selected.report.file_name}</b></div>
                    <div>Generata: <b>{formatDateTime(selected.report.generated_at)}</b></div>
                    <div className="stack-inline"><button className="btn btn-small">Scarica PDF</button><button className="btn btn-small">Anteprima</button></div>
                  </div>
                ) : <div className="muted small">Relazione non ancora disponibile</div>}
              </div>

              <div className="panel">
                <div className="panel-title">Cronologia</div>
                <div className="stack-sm">
                  {(selected.events || []).map((e) => (
                    <div key={e.id} className="event-row">
                      <div>
                        <div>{e.event_label}</div>
                        <div className="muted xsmall">{e.author_name || 'Sistema'}</div>
                      </div>
                      <div className="muted xsmall">{formatDateTime(e.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportsView({ data }) {
  const [q, setQ] = useState('');
  const rows = data.reports.filter((r) => `${r.public_code} ${r.customer_reference_name} ${r.file_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="stack">
      <div><h1>Relazioni PDF</h1><p className="muted">Archivio relazioni finali generate per le attività</p></div>
      <div className="card"><div className="search-box"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca attività, cliente o file PDF" /></div></div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Attività</th><th>Cliente</th><th>Operatore</th><th>Stato</th><th>Branding</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.generated_at)}</td>
                <td>{r.public_code}</td>
                <td>{r.customer_reference_name}</td>
                <td>{r.operator_name || '—'}</td>
                <td><Badge>{statusLabel(r.status)}</Badge></td>
                <td>{r.branding_applied ? <Badge>Logo agenzia</Badge> : '—'}</td>
                <td className="stack-inline"><button className="btn btn-small">Scarica</button><button className="btn btn-small">Dettaglio</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreditsView({ data }) {
  const operators = data.operators;
  const assigned = operators.reduce((s, o) => s + (o.credits_balance || 0), 0);
  const used30d = operators.reduce((s, o) => s + (o.credits_used_30d || 0), 0);
  return (
    <div className="stack">
      <div className="row-between"><div><h1>Crediti</h1><p className="muted">Saldo, assegnazioni e movimenti dei crediti dell’agenzia</p></div><div className="stack-inline"><button className="btn btn-primary">Assegna crediti</button><button className="btn">Revoca crediti</button></div></div>
      <div className="grid-4">
        <KpiCard title="Crediti disponibili" value={data.summary.kpis.credits_available ?? demoAgency.creditsAvailable} subtitle="Utilizzabili per nuove attività" icon={Coins} />
        <KpiCard title="Crediti assegnati operatori" value={assigned} subtitle="Attualmente distribuiti" icon={Users} />
        <KpiCard title="Crediti usati (30 gg)" value={used30d} subtitle="Consumo periodo" icon={Coins} />
        <KpiCard title="Ultimo movimento" value={formatDateTime(data.creditMovements[0]?.created_at)} subtitle={data.creditMovements[0]?.description || ''} icon={ClipboardList} />
      </div>
      <div className="split-2">
        <div className="card"><h2>Crediti per operatore</h2><div className="table-wrap"><table><thead><tr><th>Operatore</th><th>Stato</th><th>Crediti</th><th>Usati 30 gg</th></tr></thead><tbody>{operators.map((o)=><tr key={o.id}><td>{o.first_name} {o.last_name}</td><td><Badge>{statusLabel(o.status)}</Badge></td><td>{o.credits_balance}</td><td>{o.credits_used_30d || 0}</td></tr>)}</tbody></table></div></div>
        <div className="card"><h2>Storico movimenti</h2><div className="stack-sm">{data.creditMovements.map((m)=><div key={m.id} className="event-row"><div><div>{m.description}</div><div className="muted xsmall">{m.transaction_type}</div></div><div className="muted small">{m.direction==='credit'?'+':'-'}{m.amount}</div></div>)}</div></div>
      </div>
    </div>
  );
}

function OperatorsView({ data, selectedOperatorId, setSelectedOperatorId }) {
  const [q, setQ] = useState('');
  const filtered = data.operators.filter((o) => `${o.first_name} ${o.last_name} ${o.email}`.toLowerCase().includes(q.toLowerCase()));
  const selected = filtered.find((o) => o.id === selectedOperatorId) || filtered[0] || null;
  const selectedActivities = data.activities.filter((a) => a.assigned_user_id === selected?.id);
  return (
    <div className="stack">
      <div className="row-between"><div><h1>Operatori</h1><p className="muted">Gestione rete operativa, stato utenti e assegnazioni</p></div><div className="stack-inline"><button className="btn btn-primary">+ Nuovo operatore</button><button className="btn">Invita operatore</button></div></div>
      <div className="card"><div className="search-box"><Search size={16} /><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cerca nome o email" /></div></div>
      <div className="split-2">
        <div className="card table-wrap">
          <h2>Elenco operatori</h2>
          <table>
            <thead><tr><th>Nome</th><th>Email</th><th>Stato</th><th>Crediti</th><th>Attività 30 gg</th><th></th></tr></thead>
            <tbody>
              {filtered.map((o)=>(<tr key={o.id} className={selected?.id===o.id?'row-selected':''}><td>{o.first_name} {o.last_name}</td><td>{o.email}</td><td><Badge>{statusLabel(o.status)}</Badge></td><td>{o.credits_balance}</td><td>{o.activities_count_30d||0}</td><td><button className="btn btn-small" onClick={()=>setSelectedOperatorId(o.id)}>Apri</button></td></tr>))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Scheda operatore</h2>
          {!selected ? <div className="muted">Nessun operatore selezionato</div> : (
            <div className="stack-sm">
              <div className="detail-header"><div><div className="title">{selected.first_name} {selected.last_name}</div><div className="muted small">{selected.email}</div></div><Badge>{statusLabel(selected.status)}</Badge></div>
              <div className="mini-grid">
                <div className="mini-card"><span>Telefono</span><b>{selected.phone || '—'}</b></div>
                <div className="mini-card"><span>Ultimo accesso</span><b>{formatDateTime(selected.last_login_at)}</b></div>
                <div className="mini-card"><span>Crediti</span><b>{selected.credits_balance}</b></div>
                <div className="mini-card"><span>Strumento</span><b>{selected.instrument?.serial_number || '—'}</b></div>
              </div>
              <div className="panel"><div className="panel-title">Attività recenti</div>{selectedActivities.length ? selectedActivities.map((a)=><div key={a.id} className="event-row"><div><div>{a.public_code}</div><div className="muted xsmall">{a.customer_reference_name}</div></div><div className="muted xsmall">{formatDateTime(a.activity_at)}</div></div>) : <div className="muted small">Nessuna attività</div>}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandingView() {
  return (
    <div className="stack">
      <div><h1>Branding Agenzia</h1><p className="muted">Gestione logo e testata per la relazione PDF customer-friendly</p></div>
      <div className="split-2">
        <div className="card">
          <h2>Configurazione testata PDF</h2>
          <div className="form-2">
            <label><span>Nome agenzia in testata</span><input defaultValue={demoAgency.name} /></label>
            <label><span>Email contatto</span><input defaultValue="info@checks.energy" /></label>
            <label><span>Telefono</span><input defaultValue="+39 02 000000" /></label>
            <label><span>Riga indirizzo</span><input defaultValue="Milano (MI)" /></label>
          </div>
          <div className="stack-inline"><button className="btn btn-primary">Salva configurazione</button><button className="btn">Anteprima PDF demo</button></div>
        </div>
        <div className="card">
          <h2>Logo agenzia</h2>
          <div className="logo-box">Preview logo</div>
          <div className="kv"><span>Stato</span><Badge>Attivo</Badge></div>
          <div className="kv"><span>Ultimo caricamento</span><b>21/02/2026</b></div>
          <div className="stack-sm"><button className="btn btn-primary btn-block">Carica logo</button><button className="btn btn-block">Rimuovi / sostituisci</button></div>
        </div>
      </div>
    </div>
  );
}

function buildReports(activities) {
  return activities.filter((a) => a.report).map((a) => ({
    id: a.report.id,
    activity_id: a.id,
    public_code: a.public_code,
    customer_reference_name: a.customer_reference_name,
    operator_name: a.operator_name,
    outcome: a.outcome,
    ...a.report,
  }));
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState('');
  const [view, setView] = useState('dashboard');
  const [selectedActivityId, setSelectedActivityId] = useState(5001);
  const [selectedOperatorId, setSelectedOperatorId] = useState(2003);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [summary, setSummary] = useState({ kpis: {} });
  const [activitiesApi, setActivitiesApi] = useState([]);

  const mergedData = useMemo(() => {
    const apiItems = (activitiesApi || []).map((a) => {
      const demo = demoActivities.find((d) => d.id === a.id || d.public_code === a.public_code);
      return {
        ...demo,
        ...a,
        activity_at: a.activity_at || demo?.activity_at || new Date().toISOString(),
        site_city: a.site_city || demo?.site_city || '—',
        operator_name: a.operator_name || demo?.operator_name || '—',
        test_summary: demo?.test_summary || null,
        report: demo?.report || null,
        notes: demo?.notes || [],
        events: demo?.events || [],
      };
    });

    const mergedActivities = apiItems.length
      ? [...apiItems, ...demoActivities.filter((d) => !apiItems.some((a) => a.public_code === d.public_code))]
      : demoActivities;

    return {
      summary,
      activities: mergedActivities,
      operators: demoOperators,
      creditMovements: demoCreditMovements,
      reports: buildReports(mergedActivities),
    };
  }, [summary, activitiesApi]);

  async function apiGet(path, tk = token) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${tk}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken('');
      throw new Error('Sessione scaduta o token non valido');
    }
    if (!res.ok) throw new Error(data?.error || `Errore ${res.status}`);
    return data;
  }

  async function loadProtectedData(tk = token) {
    setLoading(true);
    setApiError('');
    try {
      const [me, summaryResp, activitiesResp] = await Promise.all([
        apiGet('/api/v1/auth/me', tk),
        apiGet('/api/v1/dashboard/summary', tk),
        apiGet('/api/v1/activities', tk),
      ]);
      setAuthUser(me?.user?.username || '');
      setSummary(summaryResp || { kpis: {} });
      setActivitiesApi(activitiesResp?.items || []);
    } catch (err) {
      setApiError(err.message || 'Errore caricamento dashboard');
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  }

  useEffect(() => {
    if (!token) {
      setAuthChecked(true);
      return;
    }
    loadProtectedData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function logout() {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/v1/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // ignore
    }
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setAuthUser('');
    setSummary({ kpis: {} });
    setActivitiesApi([]);
    setApiError('');
  }

  if (!token) return <LoginScreen onLogin={setToken} />;
  if (!authChecked && loading) return <div className="loading-screen">Caricamento dashboard…</div>;

  let content = null;
  if (view === 'dashboard') content = <DashboardView data={mergedData} setView={setView} openActivity={(id)=>{setSelectedActivityId(id); setView('activities');}} />;
  if (view === 'activities') content = <ActivitiesView data={mergedData} selectedActivityId={selectedActivityId} setSelectedActivityId={setSelectedActivityId} />;
  if (view === 'reports') content = <ReportsView data={mergedData} />;
  if (view === 'credits') content = <CreditsView data={mergedData} />;
  if (view === 'operators') content = <OperatorsView data={mergedData} selectedOperatorId={selectedOperatorId} setSelectedOperatorId={setSelectedOperatorId} />;
  if (view === 'branding') content = <BrandingView />;

  return (
    <div className="app-shell">
      <div className="container-app">
        <TopBar authUser={authUser} onLogout={logout} onRefresh={() => loadProtectedData()} loading={loading} />
        {apiError ? <div className="error-box">{apiError}</div> : null}
        <div className="app-layout">
          <Sidebar view={view} setView={setView} />
          <main className="main-area">{content}</main>
        </div>
      </div>
    </div>
  );
}
