// API wrapper for frontend -> backend calls
const API_BASE = 'http://localhost:8000';

async function postJSON(path, data = {}) {
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: payload?.detail || `HTTP ${res.status}` };
    }

    // handle cases where backend returns { analysis: "<json-string>" }
    let content = payload?.analysis ?? payload;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch { // ignore
      }
    }

    return { ok: true, data: content, raw: payload };
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

async function getJSON(path) {
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, '')}${path}`);
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: payload?.detail || `HTTP ${res.status}` };
    }
    return { ok: true, data: payload };
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

// --------------------------------------------------
// 🔹 MAIN API ENDPOINTS
// --------------------------------------------------

// 1️⃣ AI Stock Screener
export async function queryAgent(prompt) {
  return postJSON('/screener', { query: prompt });
}

// 2️⃣ Company Financials
export async function getFinancials(ticker) {
  return postJSON('/financials', { ticker });
}

// 3️⃣ Buy / Sell / Hold Recommendation
export async function getRecommendation(ticker) {
  return postJSON('/recommendation', { ticker });
}

// 4️⃣ Company Recent News
export async function getCompanyNews(ticker) {
  return postJSON('/news', { ticker });
}

// 5️⃣ Compare multiple tickers (e.g., TSLA vs AAPL)
export async function compareStocks(tickers = []) {
  return postJSON('/compare', { tickers });
}

// 6️⃣ Quick health check or root message
export async function getServerStatus() {
  return getJSON('/');
}

// --------------------------------------------------
// Example usage:
// const { ok, data, error } = await getFinancials("AAPL");
// if (ok) console.log(data);
// --------------------------------------------------
