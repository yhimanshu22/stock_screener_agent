import json
import yfinance as yf
from typing import TypedDict, Annotated, Dict, Any, Generator
from langchain_core.messages import AnyMessage, SystemMessage, ToolMessage
from langchain_community.tools import tool
from langchain_ollama import ChatOllama
import operator
import os
from dotenv import load_dotenv
import re
import uuid
import asyncio

# Load environment variables
load_dotenv()

# Set up the Ollama model
llm = ChatOllama(model=os.getenv("OLLAMA_MODEL", "qwen2.5:7b"))

# --- Tool Definitions ---
@tool
def get_stock_info(ticker: str) -> dict:
    """Retrieve key company metrics (PE ratios, market cap, etc.) using yfinance."""
    try:
        stock = yf.Ticker(ticker)
        info = getattr(stock, "info", {}) or {}
        fields = [
            "symbol", "longName", "sector", "industry", "marketCap",
            "trailingPE", "forwardPE", "dividendYield",
            "fiftyTwoWeekHigh", "fiftyTwoWeekLow", "averageVolume"
        ]
        return {k: info.get(k) for k in fields}
    except Exception as e:
        return {"error": f"Error fetching stock info for {ticker}: {e}"}


@tool
def get_company_news(ticker: str):
    """Fetch the latest 5 news headlines for the given stock ticker using yfinance."""
    try:
        stock = yf.Ticker(ticker)
        news = getattr(stock, "news", []) or []
        out = []
        for item in news[:5]:
            title = item.get("title") or item.get("headline") or ""
            link = item.get("link") or item.get("url") or ""
            out.append({"title": title, "link": link})
        return out
    except Exception as e:
        return {"error": f"Error fetching news for {ticker}: {e}"}


@tool
def get_financials(ticker: str) -> dict:
    """Fetch financial statements (income statement, balance sheet, cash flow) for a given stock."""
    try:
        stock = yf.Ticker(ticker)
        fin = stock.financials.fillna("").to_dict(orient="index") if hasattr(stock, "financials") else {}
        bs = stock.balance_sheet.fillna("").to_dict(orient="index") if hasattr(stock, "balance_sheet") else {}
        cf = stock.cashflow.fillna("").to_dict(orient="index") if hasattr(stock, "cashflow") else {}
        return {"income_statement": fin, "balance_sheet": bs, "cash_flow": cf}
    except Exception as e:
        return {"error": f"Error fetching financial data for {ticker}: {e}"}



# --- LangGraph Agent State ---
class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]


# --- Helper ---
def format_large_number(num):
    if num is None:
        return "N/A"
    for unit in ["", "K", "M", "B", "T"]:
        if abs(num) < 1000:
            return f"{num:.2f}{unit}"
        num /= 1000
    return f"{num:.2f}T"


def run_tool(tool_obj, *args, **kwargs):
    if hasattr(tool_obj, "func") and callable(tool_obj.func):
        return tool_obj.func(*args, **kwargs)
    if hasattr(tool_obj, "run") and callable(tool_obj.run):
        return tool_obj.run(*args, **kwargs)
    if callable(tool_obj):
        return tool_obj(*args, **kwargs)
    raise TypeError(f"Tool object {tool_obj!r} is not callable")


# --- Streaming and Live Feedback Support ---
async def async_stream_feedback(generator: Generator[str, None, None]):
    """Asynchronous generator to simulate live feedback to the frontend."""
    for chunk in generator:
        await asyncio.sleep(0.2)
        yield f"data: {chunk}\n\n"


def progress_feedback(stage: str, detail: str) -> str:
    return json.dumps({"stage": stage, "detail": detail})


# --- Main Workflow Runner ---
def run_screener_flow(user_query: str, max_steps: int = 6, include_summary: bool = True) -> Dict[str, Any]:
    tickers = re.findall(r"\b[A-Z]{1,5}\b", user_query)
    if not tickers:
        return {"error": "No ticker symbol detected. Please include one like 'AAPL' or 'TSLA'."}

    feedback_steps = []
    results = []

    for ticker in tickers:
        feedback_steps.append(progress_feedback("fetch", f"Retrieving data for {ticker}"))
        stock_info = run_tool(get_stock_info, ticker)

        feedback_steps.append(progress_feedback("news", f"Fetching latest news for {ticker}"))
        news_items = run_tool(get_company_news, ticker)

        feedback_steps.append(progress_feedback("financials", f"Gathering financial data for {ticker}"))
        financials = run_tool(get_financials, ticker)

        mc = stock_info.get("marketCap")
        avg_vol = stock_info.get("averageVolume")

        company = {
            "symbol": stock_info.get("symbol", ticker),
            "name": stock_info.get("longName", "N/A"),
            "sector": stock_info.get("sector", "N/A"),
            "industry": stock_info.get("industry", "N/A"),
            "market_cap": f"{format_large_number(mc)} USD",
            "valuation": {
                "trailing_pe": round(stock_info.get("trailingPE", 0), 2),
                "forward_pe": round(stock_info.get("forwardPE", 0), 2),
                "dividend_yield": stock_info.get("dividendYield", "N/A"),
            },
            "performance": {
                "52_week_high": stock_info.get("fiftyTwoWeekHigh"),
                "52_week_low": stock_info.get("fiftyTwoWeekLow"),
                "average_volume": format_large_number(avg_vol),
            },
            "financials": financials,
        }

        news = [{"headline": n.get("title"), "url": n.get("link")} for n in news_items if n.get("title")]

        results.append({"company": company, "latest_news": news})

    response = {
        "query": user_query,
        "results": results,
        "feedback_steps": feedback_steps,
        "disclaimer": "Data fetched in real time. Not financial advice.",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }

    if include_summary:
        try:
            summary_prompt = (
                "Provide a concise, factual 3–5 sentence summary about the following stock data, "
                "including company overview, valuation, and recent news (no speculation): "
                f"{json.dumps(results, default=str)}"
            )
            llm_response = llm.invoke([SystemMessage(content=summary_prompt)])
            response["summary"] = getattr(llm_response, "content", str(llm_response))
        except Exception as e:
            response["summary_error"] = f"Summary generation failed: {e}"

    return response
