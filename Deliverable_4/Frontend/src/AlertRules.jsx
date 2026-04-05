import { useEffect, useState } from "react";

export default function AlertRules() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({
    name: "",
    metric: "air_quality",
    comparator: "gt",
    threshold: "",
    severity: "warning"
  });

  async function loadRules() {
    const res = await fetch("http://localhost:8000/api/alert-rules");
    setRules(await res.json());
  }

  async function createRule() {
    await fetch("http://localhost:8000/api/alert-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, threshold: Number(form.threshold) })
    });
    loadRules();
  }

  async function disableRule(id) {
    await fetch(`http://localhost:8000/api/alert-rules/${id}/disable`, {
      method: "PATCH"
    });
    loadRules();
  }

  useEffect(() => {
    loadRules();
  }, []);

  return (
    <div style={{ padding: 24, color: "#d1d5db" }}>
      <h2>Alert Rules (Admin)</h2>

      <div style={{ marginBottom: 16 }}>
        <input placeholder="Name" onChange={e => setForm({ ...form, name: e.target.value })} />
        <input type="number" placeholder="Threshold"
          onChange={e => setForm({ ...form, threshold: e.target.value })} />
        <button onClick={createRule}>Create</button>
      </div>

      <ul>
        {rules.map(r => (
          <li key={r.rule_id}>
            {r.name} — {r.metric} {r.comparator} {r.threshold}
            {r.enabled && <button onClick={() => disableRule(r.rule_id)}>Disable</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}