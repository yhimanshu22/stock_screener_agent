import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from app.flow import run_screener_flow, get_stock_info, get_company_news
import yfinance as yf
from typing import Any, Dict, List, Optional

# Initialize FastAPI app
app = FastAPI(
    title="Stock Screener Agent API",
    description="An API for interacting with the LangGraph-based stock screener agent and additional stock analysis routes.",
    version="1.1.0"
)

# --- CORS Configuration ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class ScreenerQuery(BaseModel):
    query: str

class GenericResponse(BaseModel):
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# --- Helper utilities ---

def safe_ticker(ticker: str) -> yf.Ticker:
    """Return a yfinance Ticker object; raise HTTPException on obviously bad tickers."""
    if not ticker or not isinstance(ticker, str):
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")
    return yf.Ticker(ticker.upper())


def numeric_or_none(x):
    try:
        return float(x)
    except Exception:
        return None


def summarize_financials(ticker: str, periods: int = 4) -> Dict[str, Any]:
    """Fetch and normalize financial statements (Income, Balance Sheet, Cashflow).
    Returns a dict with recent columns converted to simple dicts.
    """
    t = safe_ticker(ticker)
    out: Dict[str, Any] = {}
    try:
        # these return pandas.DataFrame; convert to dict-of-dicts safely
        fin = getattr(t, "financials", None)
        bal = getattr(t, "balance_sheet", None)
        cf = getattr(t, "cashflow", None)
        out["income_statement"] = fin.fillna("").to_dict(orient="index") if fin is not None else {}
        out["balance_sheet"] = bal.fillna("").to_dict(orient="index") if bal is not None else {}
        out["cash_flow"] = cf.fillna("").to_dict(orient="index") if cf is not None else {}
    except Exception as e:
        out["error"] = f"Financials fetch failed: {e}"
    return out


def simple_recommendation_logic(stock_info: Dict[str, Any], price_history: Optional[List[float]] = None) -> Dict[str, Any]:
    """Produce a simple rule-based recommendation (not financial advice).
    - Uses market cap and PE heuristics and recent momentum if available.
    - Always returns a rationale and risk flag.
    """
    # Defaults
    rec = {"recommendation": "HOLD", "confidence": "low", "rationale": [], "risk": "moderate"}

    try:
        mc = numeric_or_none(stock_info.get("marketCap"))
        pe = numeric_or_none(stock_info.get("trailingPE"))
        fpe = numeric_or_none(stock_info.get("forwardPE"))

        # simple rules
        if mc and mc > 10_000_000_000 and pe and pe < 25:
            rec["recommendation"] = "BUY"
            rec["confidence"] = "medium"
            rec["rationale"].append("Large market cap with attractive trailing P/E < 25")
        elif pe and pe > 60:
            rec["recommendation"] = "SELL"
            rec["confidence"] = "medium"
            rec["rationale"].append("High trailing P/E suggests valuation risk")
        else:
            rec["recommendation"] = "HOLD"
            rec["confidence"] = "low"
            rec["rationale"].append("No clear buy/sell signal from simple metrics")

        # momentum: if price_history provided, check last vs average
        if price_history and len(price_history) >= 5:
            last = price_history[-1]
            avg = sum(price_history[-5:]) / 5
            if last > avg * 1.05:
                rec["rationale"].append("Short-term upward momentum detected")
                if rec["recommendation"] == "HOLD":
                    rec["recommendation"] = "BUY"
                    rec["confidence"] = "low"
            elif last < avg * 0.95:
                rec["rationale"].append("Short-term downward momentum detected")
                if rec["recommendation"] == "BUY":
                    rec["recommendation"] = "HOLD"
                    rec["confidence"] = "low"

        # risk assignment
        if mc and mc < 2_000_000_000:
            rec["risk"] = "high"
        elif mc and mc < 10_000_000_000:
            rec["risk"] = "medium"
        else:
            rec["risk"] = "low"

    except Exception as e:
        rec["rationale"].append(f"Recommendation logic error: {e}")

    return rec


# --- API Endpoints ---
@app.get("/", summary="Root endpoint")
def read_root():
    return {"message": "Welcome to the Stock Screener Agent API!"}


@app.post("/screener", response_model=GenericResponse)
async def run_screener(query: ScreenerQuery):
    """Legacy screener endpoint that returns the full structured analysis (keeps backward compatibility).
    The data field contains the structured JSON (same as previous output).
    """
    print(f"Received query: {query.query}")
    analysis_result = run_screener_flow(query.query)
    print(f"Generated analysis: {analysis_result}")

    # If run_screener_flow returns a JSON string, try to parse it
    if isinstance(analysis_result, str):
        try:
            analysis_data = json.loads(analysis_result)
        except Exception:
            analysis_data = {"raw": analysis_result}
    else:
        analysis_data = analysis_result

    return GenericResponse(ok=True, data=analysis_data)


@app.get("/summary/{symbol}", response_model=GenericResponse)
async def get_summary(symbol: str):
    """Return a quick summary + key metrics and short deterministic summary."""
    try:
        res = run_screener_flow(f"Give me a summary of {symbol} and its recent news", include_summary=True)
        # ensure dict
        if isinstance(res, str):
            res = json.loads(res)
        return GenericResponse(ok=True, data=res)
    except Exception as e:
        return GenericResponse(ok=False, error=str(e))


@app.get("/news/{symbol}", response_model=GenericResponse)
async def get_news(symbol: str):
    """Return up to 10 recent news items for a symbol."""
    try:
        t = safe_ticker(symbol)
        news = getattr(t, "news", []) or []
        out = []
        for item in news[:10]:
            out.append({
                "title": item.get("title") or item.get("headline") or "",
                "link": item.get("link") or item.get("url") or "",
                "provider": item.get("providerPublishTime") or None,
            })
        return GenericResponse(ok=True, data={"symbol": symbol.upper(), "news": out})
    except Exception as e:
        return GenericResponse(ok=False, error=str(e))


@app.get("/financials/{symbol}", response_model=GenericResponse)
async def get_financials(symbol: str):
    """Return normalized recent financial statements (income, balance sheet, cashflow)."""
    try:
        fin = summarize_financials(symbol)
        return GenericResponse(ok=True, data={"symbol": symbol.upper(), "financials": fin})
    except Exception as e:
        return GenericResponse(ok=False, error=str(e))


@app.get("/recommendation/{symbol}", response_model=GenericResponse)
async def get_recommendation(symbol: str):
    """Return a simple rule-based recommendation (NOT financial advice).
    We fetch fundamentals and a short history to compute momentum.
    """
    try:
        t = safe_ticker(symbol)
        info = getattr(t, "info", {}) or {}
        history = []
        try:
            hist = t.history(period="30d", interval="1d")
            # convert to list of closing prices
            history = [float(x) for x in hist["Close"].tolist()] if not hist.empty else []
        except Exception:
            history = []

        rec = simple_recommendation_logic(info, price_history=history)
        return GenericResponse(ok=True, data={"symbol": symbol.upper(), "recommendation": rec, "price_history_count": len(history)})
    except Exception as e:
        return GenericResponse(ok=False, error=str(e))


# --- Routes listing (debug) ---
@app.get("/routes", response_model=GenericResponse)
async def list_routes():
    routes = [{"path": r.path, "name": r.name, "methods": list(r.methods)} for r in app.router.routes if hasattr(r, "path")]
    return GenericResponse(ok=True, data={"routes": routes})


# --- Main execution ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
