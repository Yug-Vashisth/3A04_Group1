import { useState, useEffect, useRef } from "react";

// ─── Mock Data ───────────────────────────────────────────────────────────────
// Used mock data for now, need to change when we meet tdy
const DISTRICTS = ["North End", "Eastside", "Downtown", "Westport", "Southgate"];

const generateAlerts = () => [
  { id: "ALT-001", district: "North End", type: "Air Quality", severity: "critical", message: "PM2.5 threshold exceeded: 185 µg/m³", time: "08:43", status: "ACTIVE", sensor: "AQ-N-04" },
  { id: "ALT-002", district: "Eastside", type: "Temperature", severity: "warning", message: "Heat index above 38°C for >2h", time: "09:11", status: "ACKNOWLEDGED", sensor: "TMP-E-07" },
  { id: "ALT-003", district: "Downtown", type: "Soil Quality", severity: "warning", message: "Nitrate levels elevated: 52 mg/L", time: "07:58", status: "ACTIVE", sensor: "SQ-D-02" },
  { id: "ALT-004", district: "Westport", type: "Forest Health", severity: "critical", message: "Canopy moisture critically low: 12%", time: "06:30", status: "ACTIVE", sensor: "FH-W-09" },
  { id: "ALT-005", district: "Southgate", type: "Air Quality", severity: "info", message: "NO₂ slightly elevated: 62 µg/m³", time: "10:02", status: "RESOLVED", sensor: "AQ-S-01" },
  { id: "ALT-006", district: "North End", type: "Forest Health", severity: "warning", message: "Wind speed anomaly in sensor cluster", time: "10:15", status: "ACTIVE", sensor: "FH-N-03" },
];

const SENSOR_METRICS = [
  { label: "Air Quality", icon: "◎", value: 74, unit: "AQI avg", trend: -3, color: "#f59e0b" },
  { label: "Temperature", icon: "◈", value: 34.2, unit: "°C avg", trend: +1.4, color: "#ef4444" },
  { label: "Soil Quality", icon: "◉", value: 88, unit: "% nominal", trend: +0.5, color: "#22c55e" },
  { label: "Forest Health", icon: "◇", value: 61, unit: "health index", trend: -7, color: "#f97316" },
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

const DISTRICT_STATUS = DISTRICTS.map((name, i) => ({
  name,
  sensorCount: 18 + i * 4,
  online: 17 + i * 4 - (i === 1 ? 1 : 0),
  alerts: [2, 1, 1, 2, 0][i],
  health: [72, 85, 91, 68, 97][i],
}));

const SYSTEM_STATS = [
  { label: "Sensors Online", value: "94 / 97", sub: "96.9% uptime", ok: true },
  { label: "Active Alerts", value: "4", sub: "2 critical", ok: false },
  { label: "Data Latency", value: "1.2s", sub: "avg last 5min", ok: true },
  { label: "API Requests", value: "1,847", sub: "last hour", ok: true },
];

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 36 }) {
  const w = 120, h = height;
  const min = Math.min(...data), max = Math.max(...data);
  const scale = (v) => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${scale(v)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle
        cx={(data.length - 1) / (data.length - 1) * w}
        cy={scale(data[data.length - 1])}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

// ─── MiniBarChart ─────────────────────────────────────────────────────────────
function MiniBar({ data, color }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: `${(v / max) * 100}%`,
            background: i === data.length - 1 ? color : `${color}55`,
            borderRadius: 1,
            transition: "height 0.4s",
          }}
        />
      ))}
    </div>
  );
}

// ─── AlertRow ─────────────────────────────────────────────────────────────────
function AlertRow({ alert, idx }) {
  const sevColor = { critical: "#ef4444", warning: "#f59e0b", info: "#60a5fa" }[alert.severity];
  const statusBg = { ACTIVE: "#ef444418", ACKNOWLEDGED: "#f59e0b18", RESOLVED: "#22c55e18" }[alert.status];
  const statusColor = { ACTIVE: "#ef4444", ACKNOWLEDGED: "#f59e0b", RESOLVED: "#22c55e" }[alert.status];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "6px 80px 1fr 90px 100px 70px",
        alignItems: "center",
        gap: "0 12px",
        padding: "8px 14px",
        background: idx % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent",
        borderLeft: `3px solid ${sevColor}`,
        fontSize: 12,
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <div />
      <span style={{ color: "#9ca3af", letterSpacing: 0.5 }}>{alert.time} — {alert.id}</span>
      <span style={{ color: "#e5e7eb" }}>
        <span style={{ color: sevColor, marginRight: 6 }}>[{alert.type}]</span>
        {alert.message}
      </span>
      <span style={{ color: "#6b7280" }}>{alert.district}</span>
      <span style={{ color: "#6b7280" }}>{alert.sensor}</span>
      <span
        style={{
          padding: "2px 7px",
          borderRadius: 3,
          background: statusBg,
          color: statusColor,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.8,
          textAlign: "center",
        }}
      >
        {alert.status}
      </span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function SCEMASDashboard() {
  const [time, setTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const [alerts] = useState(generateAlerts);
  const [selectedTrend, setSelectedTrend] = useState("Air Quality");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date());
      setPulse((p) => !p);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const trendData = TRENDS[selectedTrend];
  const trendColor = SENSOR_METRICS.find((m) => m.label === selectedTrend)?.color ?? "#60a5fa";

  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE");
  const criticalCount = alerts.filter((a) => a.severity === "critical" && a.status === "ACTIVE").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c10",
        color: "#d1d5db",
        fontFamily: "'DM Mono', 'Courier New', monospace",
        fontSize: 13,
      }}
    >
      {/* Google Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f141a; }
        ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(239,68,68,0.35)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
        .card { background: #0d1117; border: 1px solid #1c2330; border-radius: 6px; }
        .tab { cursor:pointer; padding: 6px 18px; border-radius:4px; transition: all 0.15s; font-size:11px; letter-spacing:1px; text-transform:uppercase; border: 1px solid transparent; }
        .tab:hover { background: #161c25; }
        .tab.active { background: #161c25; border-color: #2d3f55; color: #93c5fd; }
        .district-row:hover { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      {/* ── Header ── */}
      <header
        style={{
          borderBottom: "1px solid #1c2330",
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
          background: "#0a0f16",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
                borderRadius: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              ⬡
            </div>
            <span
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: 17,
                color: "#f3f4f6",
                letterSpacing: 1,
              }}
            >
              SCEMAS
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#4b5563",
                borderLeft: "1px solid #1f2937",
                paddingLeft: 10,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              City Wide Dashboard
            </span>
          </div>

          <nav style={{ display: "flex", gap: 4, marginLeft: 16 }}>
            {["overview", "alerts", "districts", "trends"].map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
                style={{ color: activeTab === tab ? "#93c5fd" : "#6b7280", background: "none" }}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {criticalCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "4px 12px",
                background: "#ef444415",
                border: "1px solid #ef444440",
                borderRadius: 4,
                animation: "pulse-ring 2s infinite",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ef4444",
                  animation: "blink 1s infinite",
                }}
              />
              <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 500, letterSpacing: 0.8 }}>
                {criticalCount} CRITICAL ALERT{criticalCount > 1 ? "S" : ""}
              </span>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#e5e7eb", fontSize: 14, fontWeight: 500 }}>
              {time.toLocaleTimeString("en-CA", { hour12: false })}
            </div>
            <div style={{ color: "#4b5563", fontSize: 10, letterSpacing: 0.5 }}>
              {time.toLocaleDateString("en-CA")} · UTC-5
            </div>
          </div>
        </div>
      </header>

      <main style={{ padding: "20px 28px", maxWidth: 1440, margin: "0 auto" }}>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>

            {/* System Status Strip */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {SYSTEM_STATS.map((s) => (
                <div key={s.label} className="card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                      {s.label}
                    </div>
                    <div style={{ color: s.ok ? "#e5e7eb" : "#ef4444", fontSize: 22, fontWeight: 500, fontFamily: "'Syne', sans-serif", letterSpacing: -0.5 }}>
                      {s.value}
                    </div>
                    <div style={{ color: "#4b5563", fontSize: 10, marginTop: 2 }}>{s.sub}</div>
                  </div>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: s.ok ? "#22c55e" : "#ef4444",
                      boxShadow: `0 0 6px ${s.ok ? "#22c55e" : "#ef4444"}`,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Sensor Metrics Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {SENSOR_METRICS.map((m) => {
                const barData = TRENDS[m.label].slice(-8);
                return (
                  <div
                    key={m.label}
                    className="card"
                    style={{ padding: "16px 18px", cursor: "pointer", borderColor: selectedTrend === m.label ? `${m.color}55` : "#1c2330" }}
                    onClick={() => { setSelectedTrend(m.label); setActiveTab("trends"); }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ color: m.color, fontSize: 16 }}>{m.icon}</span>
                        <span style={{ color: "#9ca3af", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" }}>
                          {m.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: m.trend < 0 ? "#22c55e" : "#f59e0b",
                          fontWeight: 500,
                        }}
                      >
                        {m.trend > 0 ? "▲" : "▼"} {Math.abs(m.trend)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <span style={{ color: m.color, fontSize: 26, fontWeight: 500, fontFamily: "'Syne', sans-serif" }}>
                          {m.value}
                        </span>
                        <span style={{ color: "#4b5563", fontSize: 11, marginLeft: 5 }}>{m.unit}</span>
                      </div>
                      <MiniBar data={barData} color={m.color} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Alerts + District Map side-by-side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 12 }}>

              {/* Active Alerts */}
              <div className="card" style={{ overflow: "hidden" }}>
                <div
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid #1c2330",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#ef4444", fontSize: 10, animation: "blink 1.5s infinite" }}>●</span>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, color: "#e5e7eb", letterSpacing: 0.5 }}>
                      ACTIVE ALERTS
                    </span>
                    <span
                      style={{
                        background: "#ef444420",
                        color: "#ef4444",
                        fontSize: 10,
                        padding: "1px 7px",
                        borderRadius: 3,
                        fontWeight: 600,
                      }}
                    >
                      {activeAlerts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("alerts")}
                    style={{ color: "#3b82f6", fontSize: 11, background: "none", border: "none", cursor: "pointer" }}
                  >
                    View all →
                  </button>
                </div>
                {/* Header row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "6px 80px 1fr 90px 100px 70px",
                    gap: "0 12px",
                    padding: "6px 14px",
                    borderBottom: "1px solid #161c25",
                    fontSize: 10,
                    color: "#374151",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  <div /><div>Time · ID</div><div>Message</div><div>District</div><div>Sensor</div><div>Status</div>
                </div>
                {alerts.map((a, i) => <AlertRow key={a.id} alert={a} idx={i} />)}
              </div>

              {/* District Health */}
              <div className="card" style={{ overflow: "hidden" }}>
                <div
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid #1c2330",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, color: "#e5e7eb", letterSpacing: 0.5 }}>
                    DISTRICT HEALTH
                  </span>
                  <span style={{ color: "#374151", fontSize: 10 }}>LIVE</span>
                </div>
                <div>
                  {DISTRICT_STATUS.map((d, i) => {
                    const hColor = d.health >= 90 ? "#22c55e" : d.health >= 75 ? "#f59e0b" : "#ef4444";
                    return (
                      <div
                        key={d.name}
                        className="district-row"
                        style={{
                          padding: "12px 18px",
                          borderBottom: "1px solid #111620",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onClick={() => setActiveTab("districts")}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#374151", fontSize: 10 }}>D{i + 1}</span>
                            <span style={{ color: "#d1d5db", fontSize: 12 }}>{d.name}</span>
                            {d.alerts > 0 && (
                              <span
                                style={{
                                  background: "#ef444420",
                                  color: "#ef4444",
                                  fontSize: 9,
                                  padding: "1px 5px",
                                  borderRadius: 2,
                                }}
                              >
                                {d.alerts} alert{d.alerts > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <span style={{ color: hColor, fontSize: 12, fontWeight: 500 }}>{d.health}%</span>
                        </div>
                        {/* Health bar */}
                        <div style={{ height: 3, background: "#1c2330", borderRadius: 2 }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${d.health}%`,
                              background: hColor,
                              borderRadius: 2,
                              transition: "width 0.8s ease",
                              boxShadow: `0 0 4px ${hColor}`,
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: "#374151" }}>
                          <span>{d.online}/{d.sensorCount} sensors online</span>
                          <span>{d.online === d.sensorCount ? "●" : "○"} {((d.online / d.sensorCount) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── Alerts Tab ── */}
        {activeTab === "alerts" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1c2330", display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, color: "#e5e7eb" }}>ALL ALERTS</span>
                {["ACTIVE", "ACKNOWLEDGED", "RESOLVED"].map((s) => {
                  const c = { ACTIVE: "#ef4444", ACKNOWLEDGED: "#f59e0b", RESOLVED: "#22c55e" }[s];
                  const count = alerts.filter((a) => a.status === s).length;
                  return (
                    <span key={s} style={{ fontSize: 10, color: c, padding: "2px 8px", border: `1px solid ${c}40`, borderRadius: 3 }}>
                      {s} · {count}
                    </span>
                  );
                })}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "6px 80px 1fr 90px 100px 70px",
                  gap: "0 12px",
                  padding: "7px 14px",
                  borderBottom: "1px solid #161c25",
                  fontSize: 10,
                  color: "#374151",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                <div /><div>Time · ID</div><div>Message</div><div>District</div><div>Sensor</div><div>Status</div>
              </div>
              {alerts.map((a, i) => <AlertRow key={a.id} alert={a} idx={i} />)}
            </div>
          </div>
        )}

        {/* ── Districts Tab ── */}
        {activeTab === "districts" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {DISTRICT_STATUS.map((d, i) => {
                const hColor = d.health >= 90 ? "#22c55e" : d.health >= 75 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={d.name} className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                      <div>
                        <div style={{ color: "#4b5563", fontSize: 10, letterSpacing: 1, marginBottom: 3 }}>DISTRICT {i + 1}</div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, color: "#f3f4f6" }}>{d.name}</div>
                      </div>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          border: `2px solid ${hColor}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: hColor,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {d.health}%
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                      {[
                        { label: "Sensors", value: `${d.online}/${d.sensorCount}` },
                        { label: "Active Alerts", value: d.alerts },
                        { label: "Uptime", value: `${((d.online / d.sensorCount) * 100).toFixed(1)}%` },
                        { label: "Status", value: d.alerts === 0 ? "Nominal" : "Attention" },
                      ].map((item) => (
                        <div key={item.label} style={{ background: "#111620", borderRadius: 4, padding: "8px 10px" }}>
                          <div style={{ color: "#374151", fontSize: 9, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
                            {item.label}
                          </div>
                          <div style={{ color: "#d1d5db", fontSize: 14, fontWeight: 500 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      {["Air", "Temp", "Soil", "Forest"].map((type, j) => {
                        const vals = [72, 34, 88, 61];
                        const colors = ["#f59e0b", "#ef4444", "#22c55e", "#f97316"];
                        return (
                          <div
                            key={type}
                            style={{
                              flex: 1,
                              background: "#111620",
                              borderRadius: 3,
                              padding: "6px 4px",
                              textAlign: "center",
                              borderTop: `2px solid ${colors[j]}`,
                            }}
                          >
                            <div style={{ color: colors[j], fontSize: 12, fontWeight: 600 }}>
                              {vals[j] + Math.round((Math.random() - 0.5) * 10)}
                            </div>
                            <div style={{ color: "#374151", fontSize: 9 }}>{type}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Trends Tab ── */}
        {activeTab === "trends" && (
          <div style={{ animation: "fadeIn 0.2s ease" }}>
            {/* Selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {SENSOR_METRICS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setSelectedTrend(m.label)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 4,
                    border: `1px solid ${selectedTrend === m.label ? m.color : "#1c2330"}`,
                    background: selectedTrend === m.label ? `${m.color}15` : "#0d1117",
                    color: selectedTrend === m.label ? m.color : "#6b7280",
                    cursor: "pointer",
                    fontSize: 11,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    fontFamily: "'DM Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ color: "#4b5563", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                    24-HOUR TREND
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, color: trendColor }}>
                    {selectedTrend}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: trendColor, fontSize: 28, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
                    {trendData[trendData.length - 1].toFixed(1)}
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 11 }}>
                    {SENSOR_METRICS.find((m) => m.label === selectedTrend)?.unit}
                  </div>
                </div>
              </div>

              {/* Full-width chart */}
              <svg
                width="100%"
                viewBox={`0 0 600 120`}
                style={{ overflow: "visible", marginBottom: 8 }}
                preserveAspectRatio="none"
              >
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
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <line
                    key={i}
                    x1="0" y1={i * 24} x2="600" y2={i * 24}
                    stroke="#1c2330" strokeWidth="1"
                  />
                ))}
                {/* Area fill */}
                {(() => {
                  const min = Math.min(...trendData), max = Math.max(...trendData);
                  const sy = (v) => 96 - ((v - min) / (max - min || 1)) * 90;
                  const pts = trendData.map((v, i) => `${(i / (trendData.length - 1)) * 600},${sy(v)}`).join(" ");
                  const last = trendData[trendData.length - 1];
                  return (
                    <>
                      <polygon
                        points={`0,96 ${pts} 600,96`}
                        fill="url(#areaGrad)"
                      />
                      <polyline
                        points={pts}
                        fill="none"
                        stroke="url(#lineGrad)"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx={600}
                        cy={sy(last)}
                        r="4"
                        fill={trendColor}
                        style={{ filter: `drop-shadow(0 0 4px ${trendColor})` }}
                      />
                    </>
                  );
                })()}
              </svg>

              {/* X axis labels */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#374151" }}>
                {TREND_HOURS.map((h) => <span key={h}>{h}:00</span>)}
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 10,
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "1px solid #1c2330",
                }}
              >
                {[
                  { label: "Min", value: Math.min(...trendData).toFixed(1) },
                  { label: "Max", value: Math.max(...trendData).toFixed(1) },
                  { label: "Avg", value: (trendData.reduce((a, b) => a + b) / trendData.length).toFixed(1) },
                  { label: "Δ 24h", value: (trendData[trendData.length - 1] - trendData[0]).toFixed(1) },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#111620", borderRadius: 4, padding: "10px 14px" }}>
                    <div style={{ color: "#374151", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                      {s.label}
                    </div>
                    <div style={{ color: trendColor, fontSize: 18, fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
