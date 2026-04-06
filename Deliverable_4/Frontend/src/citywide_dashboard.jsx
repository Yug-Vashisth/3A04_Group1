import { useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:8000";

// ─── Static Data ──────────────────────────────────────────────────────────────
const SENSOR_METRICS = [
  { label: "Air Quality", key: "air_quality", icon: "◎", unit: "AQI avg", trend: -3, color: "#f59e0b" },
  { label: "Temperature", key: "temperature", icon: "◈", unit: "°C avg", trend: +1.4, color: "#ef4444" },
  { label: "Soil Quality", key: "soil_quality", icon: "◉", unit: "pH avg", trend: +0.5, color: "#22c55e" },
  { label: "Forest Health", key: "forest_health", icon: "◇", unit: "defoliation rate", trend: -7, color: "#f97316" },
];

const TREND_HOURS = ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22"];
const generateTrendData = (base, variance) =>
  TREND_HOURS.map(() => base + (Math.random() - 0.5) * variance * 2);

const TRENDS = {
  "Air Quality": generateTrendData(72, 18),
  Temperature: generateTrendData(33, 5),
  "Soil Quality": generateTrendData(87, 6),
  "Forest Health": generateTrendData(63, 12),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mapAlert(a) {
  return {
    ...a,
    id: a.alert_id,
    status: (a.status || "active").toLowerCase(),
    severity: (a.severity || "warning").toLowerCase(),
    type: (a.metric || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase()),
    message: `${a.metric} value ${a.value} ${a.unit} crossed threshold ${a.threshold}`,
    time: a.triggered_at
      ? new Date(a.triggered_at).toLocaleTimeString("en-CA", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "--:--",
    district: a.zone || "Unknown",
    sensor: a.sensor_id || "N/A",
  };
}

// ─── MiniBar ──────────────────────────────────────────────────────────────────
function MiniBar({ data, color }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
      {data.map((v, i) => (
        <div key={i} style={{ width: 8, height: `${(v / max) * 100}%`, background: i === data.length - 1 ? color : `${color}55`, borderRadius: 1, transition: "height 0.4s" }} />
      ))}
    </div>
  );
}

// ─── AlertRow ─────────────────────────────────────────────────────────────────
function AlertRow({ alert, idx }) {
  const sevColor = { critical: "#ef4444", warning: "#f59e0b", info: "#60a5fa" }[alert.severity] || "#6b7280";
  const STATUS_STYLE = {
    active: { bg: "#ef444418", color: "#ef4444", label: "ACTIVE" },
    acknowledged: { bg: "#f59e0b18", color: "#f59e0b", label: "ACKNOWLEDGED" },
    resolved: { bg: "#22c55e18", color: "#22c55e", label: "RESOLVED" },
  };
  const s = STATUS_STYLE[alert.status] || {
    bg: "#ffffff10",
    color: "#6b7280",
    label: alert.status,
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "6px 80px 1fr 90px 100px 70px", alignItems: "center", gap: "0 12px", padding: "8px 14px", background: idx % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent", borderLeft: `3px solid ${sevColor}`, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
      <div />
      <span style={{ color: "#9ca3af", letterSpacing: 0.5 }}>{alert.time} — {alert.id?.slice(0, 8)}</span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 4,
          color: "#e5e7eb",
          textAlign: "left",
        }}
      >
        <span
          style={{
            color: sevColor,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          [{alert.type}]
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#9ca3af",
            lineHeight: 1.35,
          }}
        >
          {alert.message}
        </span>
      </span>
      <span style={{ color: "#6b7280" }}>{alert.district}</span>
      <span style={{ color: "#6b7280" }}>{alert.sensor}</span>
      <span
        style={{
          display: "inline-flex",
          justifyContent: "center",
          alignItems: "center",
          minWidth: 84,
          height: 22,
          padding: "0 8px",
          borderRadius: 4,
          background: s.bg,
          color: s.color,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {s.label}
      </span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function SCEMASDashboard() {
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTrend, setSelectedTrend] = useState("Air Quality");

  // live data from API
  const [alerts, setAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState({ active: 0, acknowledged: 0, resolved: 0, total: 0 });
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // alerts tab
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertLogs, setAlertLogs] = useState([]);
  const [alertFilter, setAlertFilter] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);  
  const [ruleForm, setRuleForm] = useState({
    name: "",
    metric: "air_quality",
    comparator: "gt",
    threshold: "",
    severity: "warning",
    zone: "",
  });
  const [alertRules, setAlertRules] = useState([]);

  // operator (set by Login)
  const operatorId = localStorage.getItem("email");
  const role = localStorage.getItem("role");

  // trend data from DB
  const [trendPoints, setTrendPoints] = useState({});

  // analysis tab
  const [envResult, setEnvResult] = useState(null);
  const [envInputs, setEnvInputs] = useState({ aqi: "", soil_moisture: "", ndvi: "", temperature: "" });
  const [envLoading, setEnvLoading] = useState(false);

  const inputStyle = {
    marginTop: 4,
    width: "100%",
    padding: "6px 8px",
    borderRadius: 4,
    border: "1px solid #1c2330",
    background: "#0a0f16",
    color: "#e5e7eb",
    fontSize: 11,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  // clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // fetch alerts + stats + zones every 10s
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [alertsRes, statsRes, zonesRes] = await Promise.all([
          fetch(`${API}/api/alerts/`),
          fetch(`${API}/api/alerts/stats`),
          fetch(`${API}/api/zones/`),
        ]);
        const alertsData = await alertsRes.json();
        const statsData = await statsRes.json();
        const zonesData = await zonesRes.json();
        setAlerts(Array.isArray(alertsData) ? alertsData.map(mapAlert) : []);
        setAlertStats(statsData);
        setZones(Array.isArray(zonesData) ? zonesData : []);
      } catch (err) {
        console.error("API fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "alerts") {
      loadAlerts(alertFilter);
    }
  }, [activeTab, alertFilter]);

  // ── Alert details & actions (backend-authoritative) ──  
  async function fetchAlertDetails(alertId) {
    try {
      const res = await fetch(`${API}/api/alerts/${alertId}`);
      const data = await res.json();

      // normalize backend alert to the same shape used by AlertRow
      setSelectedAlert(mapAlert(data));
    } catch (err) {
      console.error("Failed to fetch alert details:", err);
      setSelectedAlert(null);
    }
  }

  async function fetchAlertLogs(alertId) {
    try {
      const res = await fetch(`${API}/api/audit-logs?entity_id=${alertId}`);
      setAlertLogs(await res.json());
    } catch {
      setAlertLogs([]);
    }
  }

  async function loadAlerts(filter = "") {
    try {
      const url = filter
        ? `${API}/api/alerts?status=${filter}`
        : `${API}/api/alerts`;

      const res = await fetch(url);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data.map(mapAlert) : []);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    }
  }

    async function acknowledgeAlert(alertId) {
    await fetch(`${API}/api/alerts/${alertId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_id: operatorId }),
    });

    await loadAlerts(alertFilter);
  }

  async function resolveAlert(alertId) {
    await fetch(`${API}/api/alerts/${alertId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_id: operatorId }),
    });

    await loadAlerts(alertFilter);
  }

  async function acknowledgeSelectedAlert() {
    if (!selectedAlertId) return;

    await fetch(`${API}/api/alerts/${selectedAlertId}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_id: operatorId }),
    });

    await fetchAlertDetails(selectedAlertId);
    await loadAlerts(alertFilter);
  }

  async function resolveSelectedAlert() {
    if (!selectedAlertId) return;

    await fetch(`${API}/api/alerts/${selectedAlertId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_id: operatorId }),
    });

    await fetchAlertDetails(selectedAlertId);
    await loadAlerts(alertFilter);
  }

  async function createRule() {
    const payload = {
      ...ruleForm,
      threshold: Number(ruleForm.threshold),
    };

    const res = await fetch(`${API}/api/alert-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // later: show validation errors
      return;
    }

    // rule created and ACTIVE
    setRuleForm({
      name: "",
      metric: "air_quality",
      comparator: "gt",
      threshold: "",
      severity: "warning",
      zone: "",
    });

    // refresh rules list (next step)
    loadAlertRules();
  }

  async function loadAlertRules() {
    try {
      const res = await fetch(`${API}/api/alert-rules`);
      const data = await res.json();
      setAlertRules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load alert rules:", err);
    }
  }

  async function disableRule(ruleId) {
    try {
      const res = await fetch(`${API}/api/alert-rules/${ruleId}/disable`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed to disable rule");

      // refresh rules list
      loadAlertRules();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteRule(rule) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the alert rule "${rule.name}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API}/api/alert-rules/${rule.rule_id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete rule");

      // remove immediately from UI
      setAlertRules(prev =>
        prev.filter(r => r.rule_id !== rule.rule_id)
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (showAdminPanel) {
      loadAlertRules();
    }
  }, [showAdminPanel]);

  // fetch telemetry for selected trend from DB
  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const metricKey = SENSOR_METRICS.find(m => m.label === selectedTrend)?.key;
        if (!metricKey) return;
        const res = await fetch(`${API}/api/telemetry/?metric=${metricKey}&hours=24`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1) {
          setTrendPoints(prev => ({ ...prev, [selectedTrend]: data.map(d => d.value) }));
        }
      } catch (err) {
        console.error("Trend fetch failed:", err);
      }
    };
    fetchTrend();
  }, [selectedTrend]);

  // use real DB data if available, otherwise fall back to simulated
  const trendData = (trendPoints[selectedTrend] && trendPoints[selectedTrend].length > 1)
    ? trendPoints[selectedTrend]
    : TRENDS[selectedTrend];

  const trendColor = SENSOR_METRICS.find((m) => m.label === selectedTrend)?.color ?? "#60a5fa";
  const isRealTrendData = !!(trendPoints[selectedTrend] && trendPoints[selectedTrend].length > 1);

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const criticalCount = alerts.filter(
    (a) => a.severity === "critical" && a.status === "active"
  ).length;

  const liveStats = [
    { label: "Active Alerts", value: String(alertStats.active), sub: `${criticalCount} critical`, ok: alertStats.active === 0 },
    { label: "Acknowledged", value: String(alertStats.acknowledged), sub: "pending review", ok: true },
    { label: "Resolved", value: String(alertStats.resolved), sub: "total resolved", ok: true },
    { label: "Total Alerts", value: String(alertStats.total), sub: "all time", ok: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", color: "#d1d5db", fontFamily: "'DM Mono', 'Courier New', monospace", fontSize: 13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f141a; }
        ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(239,68,68,0.35)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .card { background: #0d1117; border: 1px solid #1c2330; border-radius: 6px; }
        .tab { cursor:pointer; padding: 6px 10px; border-radius:4px; transition: all 0.15s; font-size:11px; letter-spacing:1px; text-transform:uppercase; border: 1px solid transparent; background: none; white-space: nowrap; }
        .tab:hover { background: #161c25; }
        .tab.active { background: #161c25; border-color: #2d3f55; color: #93c5fd; }
        .district-row:hover { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ borderBottom: "1px solid #1c2330", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, background: "#0a0f16", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⬡</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: "#f3f4f6", letterSpacing: 1 }}>SCEMAS</span>
            <span style={{ fontSize: 10, color: "#4b5563", borderLeft: "1px solid #1f2937", paddingLeft: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>City Wide Dashboard</span>
          </div>
          <nav style={{ display: "flex", gap: 4, marginLeft: 16 }}>
            {["overview", "alerts", "districts", "trends", "analysis"].map((tab) => (
              <button key={tab} className={`tab ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)} style={{ color: activeTab === tab ? "#93c5fd" : "#6b7280" }}>{tab}</button>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {criticalCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px", background: "#ef444415", border: "1px solid #ef444440", borderRadius: 4, animation: "pulse-ring 2s infinite" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "blink 1s infinite" }} />
              <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 500, letterSpacing: 0.8 }}>{criticalCount} CRITICAL ALERT{criticalCount > 1 ? "S" : ""}</span>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#e5e7eb", fontSize: 14, fontWeight: 500 }}>{time.toLocaleTimeString("en-CA", { hour12: false })}</div>
            <div style={{ color: "#4b5563", fontSize: 10, letterSpacing: 0.5 }}>{time.toLocaleDateString("en-CA")} · UTC-5</div>
          </div>
        </div>
      </header>

      <main style={{ padding: "20px 28px", maxWidth: 1440, margin: "0 auto" }}>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {liveStats.map((s) => (
                <div key={s.label} className="card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ color: s.ok ? "#e5e7eb" : "#ef4444", fontSize: 22, fontWeight: 500, fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>{s.value}</div>
                    <div style={{ color: "#4b5563", fontSize: 10, marginTop: 2 }}>{s.sub}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.ok ? "#22c55e" : "#ef4444", boxShadow: `0 0 6px ${s.ok ? "#22c55e" : "#ef4444"}` }} />
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {SENSOR_METRICS.map((m) => {
                const barData = TRENDS[m.label].slice(-8);
                return (
                  <div key={m.label} className="card" style={{ padding: "16px 18px", cursor: "pointer", borderColor: selectedTrend === m.label ? `${m.color}55` : "#1c2330" }} onClick={() => { setSelectedTrend(m.label); setActiveTab("trends"); }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ color: m.color, fontSize: 16 }}>{m.icon}</span>
                        <span style={{ color: "#9ca3af", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" }}>{m.label}</span>
                      </div>
                      <span style={{ fontSize: 10, color: m.trend < 0 ? "#22c55e" : "#f59e0b", fontWeight: 500 }}>{m.trend > 0 ? "▲" : "▼"} {Math.abs(m.trend)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <span style={{ color: m.color, fontSize: 26, fontWeight: 500, fontFamily: "'Syne', sans-serif" }}>—</span>
                        <span style={{ color: "#4b5563", fontSize: 11, marginLeft: 5 }}>{m.unit}</span>
                      </div>
                      <MiniBar data={barData} color={m.color} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 12 }}>
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid #1c2330", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#ef4444", fontSize: 10, animation: "blink 1.5s infinite" }}>●</span>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, color: "#e5e7eb", letterSpacing: 0.5 }}>ACTIVE ALERTS</span>
                    <span style={{ background: "#ef444420", color: "#ef4444", fontSize: 10, padding: "1px 7px", borderRadius: 3, fontWeight: 600 }}>{activeAlerts.length}</span>
                  </div>
                  <button onClick={() => setActiveTab("alerts")} style={{ color: "#3b82f6", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}>View all →</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "6px 80px 1fr 90px 100px 70px", gap: "0 12px", padding: "6px 14px", borderBottom: "1px solid #161c25", fontSize: 10, color: "#374151", letterSpacing: 1, textTransform: "uppercase" }}>
                  <div /><div>Time · ID</div><div>Message</div><div>District</div><div>Sensor</div><div>Status</div>
                </div>
                {loading ? (
                  <div style={{ padding: 20, color: "#4b5563", fontSize: 12 }}>Loading alerts...</div>
                ) : alerts.length === 0 ? (
                  <div style={{ padding: 20, color: "#4b5563", fontSize: 12 }}>No alerts found.</div>
                ) : (
                  alerts.slice(0, 6).map((a, i) => <AlertRow key={a.id || i} alert={a} idx={i} />)
                )}
              </div>

              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ padding: "12px 18px", borderBottom: "1px solid #1c2330", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, color: "#e5e7eb", letterSpacing: 0.5 }}>ZONE HEALTH</span>
                  <span style={{ color: "#374151", fontSize: 10 }}>LIVE</span>
                </div>
                {zones.length === 0 ? (
                  <div style={{ padding: 20, color: "#4b5563", fontSize: 12 }}>No zone data yet.</div>
                ) : (
                  zones.map((z, i) => {
                    const alertCount = z.active_alerts || 0;
                    const hColor = alertCount === 0 ? "#22c55e" : alertCount <= 1 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={z.zone} className="district-row" style={{ padding: "12px 18px", borderBottom: "1px solid #111620", cursor: "pointer", transition: "background 0.15s" }} onClick={() => setActiveTab("districts")}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#374151", fontSize: 10 }}>Z{i + 1}</span>
                            <span style={{ color: "#d1d5db", fontSize: 12 }}>{z.zone}</span>
                            {alertCount > 0 && <span style={{ background: "#ef444420", color: "#ef4444", fontSize: 9, padding: "1px 5px", borderRadius: 2 }}>{alertCount} alert{alertCount > 1 ? "s" : ""}</span>}
                          </div>
                          <span style={{ color: hColor, fontSize: 12, fontWeight: 500 }}>{z.sensor_count} sensors</span>
                        </div>
                        <div style={{ height: 3, background: "#1c2330", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: alertCount === 0 ? "100%" : alertCount <= 1 ? "70%" : "40%", background: hColor, borderRadius: 2, boxShadow: `0 0 4px ${hColor}` }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: "#374151" }}>
                          <span>{z.sensor_count} sensors active</span>
                          <span style={{ color: hColor }}>{alertCount === 0 ? "● Nominal" : "● Attention"}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Alerts Tab ── */}
        {activeTab === "alerts" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: showAdminPanel ? "360px 1fr" : "1fr",
                gap: 12,
              }}
            >
              {/* ADMIN SIDE PANEL */}
              {showAdminPanel && (
                <div className="card" style={{ padding: 16 }}>
                  {/* create rule form */}
                  <div className="card" style={{ padding: 16 }}>
                    <div
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 14,
                        color: "#e5e7eb",
                        marginBottom: 12,
                      }}
                    >
                      CREATE ALERT RULE
                    </div>

                    {/* Rule name */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 10, color: "#6b7280" }}>
                        Rule name
                      </label>
                      <input
                        value={ruleForm.name}
                        onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                        placeholder="e.g. High AQI – Downtown"
                        style={{
                          marginTop: 4,
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 4,
                          border: "1px solid #1c2330",
                          background: "#0a0f16",
                          color: "#e5e7eb",
                          fontSize: 11,
                        }}
                      />
                    </div>

                    {/* Metric + comparator */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, color: "#6b7280" }}>Metric</label>
                        <select
                          value={ruleForm.metric}
                          onChange={e => setRuleForm({ ...ruleForm, metric: e.target.value })}
                          style={selectStyle}
                        >
                          <option value="air_quality">Air Quality</option>
                          <option value="temperature">Temperature</option>
                          <option value="soil_quality">Soil Quality</option>
                          <option value="forest_health">Forest Health</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 10, color: "#6b7280" }}>Condition</label>
                        <select
                          value={ruleForm.comparator}
                          onChange={e => setRuleForm({ ...ruleForm, comparator: e.target.value })}
                          style={selectStyle}
                        >
                          <option value="gt">Greater than</option>
                          <option value="lt">Less than</option>
                        </select>
                      </div>
                    </div>

                    {/* Threshold + severity */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 10, color: "#6b7280" }}>Threshold</label>
                        <input
                          type="number"
                          value={ruleForm.threshold}
                          onChange={e => setRuleForm({ ...ruleForm, threshold: e.target.value })}
                          style={{
                            ...inputStyle,
                            textAlign: "right",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 10, color: "#6b7280" }}>Severity</label>
                        <select
                          value={ruleForm.severity}
                          onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value })}
                          style={selectStyle}
                        >
                          <option value="warning">Warning</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    {/* Submit */}
                    <button
                      onClick={createRule}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 4,
                        border: "1px solid #1d4ed8",
                        background: "#1d4ed8",
                        color: "#f3f4f6",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                      }}
                    >
                      Create Rule
                    </button>
                  </div>

                  {/* existing rules */}
                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: 14,
                        color: "#e5e7eb",
                        marginBottom: 12,
                      }}
                    >
                      EXISTING ALERT RULES
                    </div>

                    {alertRules.length === 0 ? (
                      <div style={{ fontSize: 11, color: "#4b5563" }}>
                        No alert rules defined.
                      </div>
                    ) : (
                      alertRules.map(rule => (
                        <div
                          key={rule.rule_id}
                          style={{
                            padding: "10px 12px",
                            borderRadius: 6,
                            background: "#0a0f16",
                            border: "1px solid #1c2330",
                            marginBottom: 8,
                            fontSize: 11,
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 12,
                          }}
                        >
                        {/* RULE INFO */}
                          <div>
                            {/* SEVERITY */}
                            <div style={{ marginBottom: 4 }}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  fontSize: 10,
                                  borderRadius: 4,
                                  background:
                                    rule.severity === "critical"
                                      ? "#ef444420"
                                      : "#f59e0b20",
                                  color:
                                    rule.severity === "critical"
                                      ? "#ef4444"
                                      : "#f59e0b",
                                  fontWeight: 700,
                                  letterSpacing: 0.8,
                                  textTransform: "uppercase",
                                }}
                              >
                                {rule.severity}
                              </span>
                            </div>

                            {/* RULE NAME */}
                            <div
                              style={{
                                color: "#e5e7eb",
                                fontWeight: 600,
                                fontSize: 13,
                                marginBottom: 2,
                              }}
                            >
                              {rule.name}
                            </div>

                            {/* CONDITION */}
                            <div style={{ color: "#6b7280", fontSize: 10 }}>
                              {rule.metric} {rule.comparator} {rule.threshold}
                            </div>

                            {!rule.enabled && (
                              <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 2 }}>
                                Disabled
                              </div>
                            )}
                          </div>


                          {/* ACTIONS */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              alignItems: "flex-end",
                            }}
                          >
                            {rule.enabled && (
                              <button
                                className="tab"
                                onClick={() => disableRule(rule.rule_id)}
                              >
                                Disable
                              </button>
                            )}

                            <button
                              className="tab"
                              onClick={() => deleteRule(rule)}
                              style={{ color: "#ef4444" }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* ALERT LIST */}
              <div className="card" style={{ overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1c2330" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {/* LEFT: Title + Manage */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14 }}>
                        ALL ALERTS
                      </span>

                      {/* MANAGE TOGGLE */}
                      {role === "admin" && (<button
                        className={`tab ${showAdminPanel ? "active" : ""}`}
                        onClick={() => setShowAdminPanel(v => !v)}
                        style={{
                          color: showAdminPanel ? "#93c5fd" : "#6b7280",
                          borderColor: showAdminPanel ? "#2d3f55" : "transparent",
                        }}
                      >
                        MANAGE
                      </button>)}
                    </div>

                    {/* RIGHT: FILTERS */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {["", "active", "acknowledged", "resolved"].map(s => (
                        <button
                          key={s || "all"}
                          className={`tab ${alertFilter === s ? "active" : ""}`}
                          onClick={() => setAlertFilter(s)}
                        >
                          {s === "" ? "ALL" : s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column Labels */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "6px 80px 1fr 90px 100px 96px 96px",
                    padding: "7px 14px",
                    fontSize: 10,
                    color: "#374151",
                  }}
                >
                  <div />
                  <div>Time · ID</div>
                  <div>Message</div>
                  <div>District</div>
                  <div>Sensor</div>
                  <div>Status</div>
                  <div /> {/* actions */}
                </div>

                {/* ALERT ROWS */}
                {alerts.map((a, i) => (
                  <div
                    key={a.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px",
                      alignItems: "center",
                      background: "transparent",
                    }}
                  >
                    <AlertRow alert={a} idx={i} />

                  {/* INLINE ACTIONS */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {a.status === "active" && (
                      <button
                        onClick={() => acknowledgeAlert(a.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#f59e0b";
                          e.currentTarget.style.borderColor = "#f59e0b55";
                          e.currentTarget.style.background = "#f59e0b12";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#9ca3af";
                          e.currentTarget.style.borderColor = "#374151";
                          e.currentTarget.style.background = "transparent";
                        }}
                        style={{
                          display: "inline-flex",
                          justifyContent: "center",
                          alignItems: "center",
                          minWidth: 84,
                          height: 22,
                          padding: "0 8px",
                          borderRadius: 4,
                          background: "transparent",
                          border: "1px solid #374151",
                          color: "#9ca3af",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        ACKNOWLEDGE
                      </button>
                    )}
                    {a.status === "acknowledged" && (
                      <button
                        onClick={() => resolveAlert(a.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#22c55e";
                          e.currentTarget.style.borderColor = "#22c55e55";
                          e.currentTarget.style.background = "#22c55e12";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "#9ca3af";
                          e.currentTarget.style.borderColor = "#374151";
                          e.currentTarget.style.background = "transparent";
                        }}
                        style={{
                          display: "inline-flex",
                          justifyContent: "center",
                          alignItems: "center",
                          minWidth: 84,
                          height: 22,
                          padding: "0 8px",
                          borderRadius: 4,
                          background: "transparent",
                          border: "1px solid #374151",
                          color: "#9ca3af",
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        RESOLVE
                      </button>
                    )}
                  </div>
                </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Districts Tab ── */}
        {activeTab === "districts" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            {zones.length === 0 ? (
              <div style={{ color: "#4b5563", padding: 20 }}>No zone data available yet. Add telemetry data to populate zones.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {zones.map((z, i) => {
                  const alertCount = z.active_alerts || 0;
                  const hColor = alertCount === 0 ? "#22c55e" : alertCount <= 1 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={z.zone} className="card" style={{ padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                        <div>
                          <div style={{ color: "#4b5563", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>ZONE {i + 1}</div>
                          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: "#f3f4f6" }}>{z.zone}</div>
                        </div>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${hColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: hColor, fontSize: 11, fontWeight: 600 }}>
                          {alertCount === 0 ? "OK" : `${alertCount}⚠`}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {[
                          { label: "Sensors Active", value: z.sensor_count },
                          { label: "Active Alerts", value: alertCount },
                          { label: "Critical", value: z.alerts_by_severity?.critical || 0 },
                          { label: "Warning", value: z.alerts_by_severity?.warning || 0 },
                        ].map((item) => (
                          <div key={item.label} style={{ background: "#111620", borderRadius: 4, padding: "8px 10px" }}>
                            <div style={{ color: "#374151", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{item.label}</div>
                            <div style={{ color: "#d1d5db", fontSize: 14, fontWeight: 500 }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Trends Tab ── */}
        {activeTab === "trends" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {SENSOR_METRICS.map((m) => (
                <button key={m.label} onClick={() => setSelectedTrend(m.label)} style={{ padding: "6px 16px", borderRadius: 4, border: `1px solid ${selectedTrend === m.label ? m.color : "#1c2330"}`, background: selectedTrend === m.label ? `${m.color}15` : "#0d1117", color: selectedTrend === m.label ? m.color : "#6b7280", cursor: "pointer", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "'DM Mono', monospace", transition: "all 0.15s" }}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ color: "#4b5563", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                    24-HOUR TREND
                    <span style={{ marginLeft: 8, color: isRealTrendData ? "#22c55e" : "#374151" }}>
                      {isRealTrendData ? "● LIVE" : "● SIMULATED"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, color: trendColor }}>{selectedTrend}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: trendColor, fontSize: 28, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{trendData[trendData.length - 1].toFixed(1)}</div>
                  <div style={{ color: "#4b5563", fontSize: 11 }}>{SENSOR_METRICS.find((m) => m.label === selectedTrend)?.unit}</div>
                </div>
              </div>
              <svg width="100%" viewBox="0 0 600 120" style={{ overflow: "visible", marginBottom: 8 }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendColor} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={trendColor} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={trendColor} stopOpacity="1" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="0" y1={i * 24} x2="600" y2={i * 24} stroke="#1c2330" strokeWidth="1" />)}
                {(() => {
                  const min = Math.min(...trendData), max = Math.max(...trendData);
                  const sy = (v) => 96 - ((v - min) / (max - min || 1)) * 90;
                  const pts = trendData.map((v, i) => `${(i / (trendData.length - 1)) * 600},${sy(v)}`).join(" ");
                  return (
                    <>
                      <polygon points={`0,96 ${pts} 600,96`} fill="url(#areaGrad)" />
                      <polyline points={pts} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinejoin="round" />
                      <circle cx={600} cy={sy(trendData[trendData.length - 1])} r="4" fill={trendColor} style={{ filter: `drop-shadow(0 0 4px ${trendColor})` }} />
                    </>
                  );
                })()}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#374151" }}>
                {isRealTrendData
                  ? trendData.map((_, i) => <span key={i}>{i}</span>)
                  : TREND_HOURS.map((h) => <span key={h}>{h}:00</span>)
                }
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid #1c2330" }}>
                {[
                  { label: "Min", value: Math.min(...trendData).toFixed(1) },
                  { label: "Max", value: Math.max(...trendData).toFixed(1) },
                  { label: "Avg", value: (trendData.reduce((a, b) => a + b) / trendData.length).toFixed(1) },
                  { label: "Δ 24h", value: (trendData[trendData.length - 1] - trendData[0]).toFixed(1) },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#111620", borderRadius: 4, padding: "10px 14px" }}>
                    <div style={{ color: "#374151", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ color: trendColor, fontSize: 18, fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Environmental Analysis Tab (unchanged from teammate) ── */}
        {activeTab === "analysis" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, color: "#f3f4f6", marginBottom: 12 }}>
                  Environmental Analysis
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {[
                    { label: "AQI", key: "aqi", type: "number" },
                    { label: "Soil Moisture", key: "soil_moisture", type: "number" },
                    { label: "NDVI", key: "ndvi", type: "number" },
                    { label: "Temperature", key: "temperature", type: "number" },
                  ].map(({ label, key, type }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                      <label style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>{label} *</label>
                      <input
                        type={type}
                        value={envInputs[key]}
                        onChange={(e) => setEnvInputs({ ...envInputs, [key]: e.target.value })}
                        style={{ padding: 6, borderRadius: 4, border: "1px solid #4b5563", background: "#0a0f16", color: "#f3f4f6" }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    try {
                      const query = new URLSearchParams(envInputs).toString();
                      setEnvLoading(true);
                      setEnvResult(null);
                      const res = await fetch(`http://127.0.0.1:8000/api/disaster/rating?${query}`);
                      const data = await res.json();
                      setEnvResult(data.answer);
                    } catch (err) {
                      console.error(err);
                      setEnvResult("Error fetching data");
                    } finally {
                      setEnvLoading(false);
                    }
                  }}
                  style={{ padding: "8px 12px", background: "#1d4ed8", color: "#f3f4f6", border: "none", borderRadius: 4, cursor: "pointer", width: 150 }}
                >
                  Get Rating
                </button>
                <div style={{ marginTop: 16, padding: 16, borderRadius: 6, background: "#111827", color: "#f3f4f6", fontSize: 12, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {envLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 24, height: 24, border: "3px solid #1c2330", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Analyzing environment...</div>
                    </div>
                  ) : envResult ? (
                    <div style={{ whiteSpace: "pre-wrap", width: "100%" }}>{envResult}</div>
                  ) : (
                    <div style={{ color: "#374151", fontSize: 11 }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}