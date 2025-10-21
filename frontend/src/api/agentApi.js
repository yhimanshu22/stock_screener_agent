// Simple wrapper used by App.jsx -> queryAgent(prompt)
const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function queryAgent(prompt) {
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, '')}/screener`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: prompt }),
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      return { ok: false, error: payload?.detail || `HTTP ${res.status}` };
    }

    // backend returns a Pydantic object like { analysis: "<json-string>" }
    // Try to parse .analysis if it's a JSON string, otherwise return raw
    let content = payload?.analysis ?? payload;
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        content = parsed;
      } catch (e) {
        // leave as string if not JSON
      }
    }

    return { ok: true, content, raw: payload };
  } catch (e) {
    return { ok: false, error: e.message || 'network error' };
  }
}
