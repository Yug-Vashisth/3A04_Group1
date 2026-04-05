import { useEffect, useState } from "react";

export default function AlertManagement() {
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const operatorId = localStorage.getItem("email");

  async function loadAlerts() {
    setLoading(true);
    const url = status
      ? `http://localhost:8000/api/alerts?status=${status}`
      : `http://localhost:8000/api/alerts`;

    const res = await fetch(url);
    setAlerts(await res.json());
    setLoading(false);
  }

  async function acknowledge(id) {
    await fetch(`http://localhost:8000/api/alerts/${id}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_id: operatorId })
    });
    loadAlerts();
  }

  async function resolve(id) {
    await fetch(`http://localhost:8000/api/alerts/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_id: operatorId })
    });
    loadAlerts();
  }

  useEffect(() => {
    loadAlerts();
  }, [status]);

  return (
    <div style={{ padding: 24, color: "#d1d5db" }}>
      <h2 style={{ marginBottom: 12 }}>Alert Management</h2>

      <select onChange={(e) => setStatus(e.target.value)} style={{ marginBottom: 12 }}>
        <option value="">All</option>
        <option value="active">Active</option>
        <option value="acknowledged">Acknowledged</option>
        <option value="resolved">Resolved</option>
      </select>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table width="100%" style={{ fontSize: 12 }}>
          <thead>
            <tr style={{ color: "#6b7280" }}>
              <th>Rule</th>
              <th>Zone</th>
              <th>Metric</th>
              <th>Value</th>
              <th>Status</th>
              <th>Triggered</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(a => (
              <tr key={a.alert_id}>
                <td>{a.rule_name}</td>
                <td>{a.zone}</td>
                <td>{a.metric}</td>
                <td>{a.value} / {a.threshold}</td>
                <td>{a.status}</td>
                <td>{new Date(a.triggered_at).toLocaleString()}</td>
                <td>
                  {a.status === "active" && (
                    <button onClick={() => acknowledge(a.alert_id)}>Ack</button>
                  )}
                  {a.status === "acknowledged" && (
                    <button onClick={() => resolve(a.alert_id)}>Resolve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}