import json
import yfinance as yf
from typing import TypedDict, Annotated
from langchain_core.messages import AnyMessage, SystemMessage, ToolMessage
from langchain_community.tools import tool
from langchain_ollama import ChatOllama
import operator
import os
from dotenv import load_dotenv
import re
import uuid

# Load environment variables
load_dotenv()

# Set up the Ollama model
llm = ChatOllama(model=os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b"))

# --- Tool Definitions ---
@tool
def get_stock_info(ticker: str) -> dict:
    """
    Retrieve selected summary fields for a stock ticker using yfinance.

    Returns a dict with keys:
      symbol, longName, sector, industry, marketCap, trailingPE, forwardPE,
      dividendYield, fiftyTwoWeekHigh, fiftyTwoWeekLow, averageVolume
    On failure returns {"error": "<message>"}.
    """
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
    """
    Fetch recent news items for a given ticker via yfinance.

    Returns a list of {"title": "...", "link": "..."} (max 5).
    On failure returns {"error": "<message>"}.
    """
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

# --- Simple Screener Tool (added) ---
@tool
def simple_screener(screen_type: str, offset: int = 0) -> str:
    """
    Returns screened assets (stocks, funds, bonds) for a given screener type.

    Args:
        screen_type: One of the predefined screener keys (e.g., "day_gainers", "most_actives")
                     or a raw query string fallback.
        offset: the pagination start point (default 0)

    Returns:
        JSON string with the screened results. On error returns a JSON object with "error".
    """
    try:
        # try to resolve a predefined query; otherwise treat screen_type as raw query
        predefined = getattr(yf, "PREDEFINED_SCREENER_QUERIES", {})
        query = None
        if isinstance(predefined, dict) and screen_type in predefined:
            query = predefined[screen_type].get("query")
        if not query:
            query = screen_type

        # call yfinance screener API (may raise if not available)
        result = yf.screen(query, offset=offset, size=5)
    except Exception as e:
        return json.dumps({"error": f"Screener execution failed: {e}"})

    # persist raw output for debugging (optional)
    try:
        out_path = os.path.join(os.path.dirname(__file__), "screener_output.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, default=str)
    except Exception:
        pass

    # select useful fields
    fields = [
        "shortName", "bid", "ask", "exchange",
        "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
        "averageAnalystRating", "dividendYield", "symbol"
    ]

    output_data = []
    for stock_detail in result.get("quotes", []) if isinstance(result, dict) else []:
        details = {}
        for key in fields:
            if key in stock_detail:
                details[key] = stock_detail.get(key)
        # include symbol if missing from fields
        if "symbol" not in details and "symbol" in stock_detail:
            details["symbol"] = stock_detail.get("symbol")
        output_data.append(details)

    return json.dumps({"screen_type": screen_type, "offset": offset, "results": output_data}, default=str)

# --- LangGraph Agent State ---
class AgentState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]

# --- Graph Definition ---
class StockScreenerAgent:
    def __init__(self, model, tools_map: dict):
        # DO NOT call model.bind_tools - not implemented for this model
        self.model = model
        # tools_map: name -> callable
        self.tools = tools_map

    def should_continue(self, state: AgentState):
        # Continue if last message requests a tool (we encode that as a dict marker),
        # otherwise end.
        if not state['messages']:
            return "continue"
        last = state['messages'][-1]
        # If last is a ToolMessage -> continue to allow model to consume it
        if isinstance(last, ToolMessage):
            return "continue"
        # If last content is JSON with {"tool":...} then continue
        content = getattr(last, "content", None)
        if isinstance(content, str):
            try:
                parsed = json.loads(content)
                if isinstance(parsed, dict) and parsed.get("tool"):
                    return "continue"
            except Exception:
                pass
        return "end"

    def call_model(self, state: AgentState):
        # call the LLM with the current messages
        response = self.model.invoke(state['messages'])
        return {"messages": [response]}

    def call_tool(self, state: AgentState):
        """
        Inspect the last model message for a JSON tool request:
        {"tool": "get_stock_info", "args": ["NVDA"]}
        Execute the tool if found and return its output as a ToolMessage so the model can consume it.
        """
        last_message = state['messages'][-1]
        content = getattr(last_message, "content", None)

        # default - no tool output
        tool_outputs = []

        if not isinstance(content, str):
            return {"messages": tool_outputs}

        # try parse JSON instruction
        try:
            payload = json.loads(content.strip())
        except Exception:
            # Not a tool request JSON, nothing to do
            return {"messages": tool_outputs}

        # payload must be a dict with 'tool' key
        if not isinstance(payload, dict) or "tool" not in payload:
            return {"messages": tool_outputs}

        tool_name = payload.get("tool")
        args = payload.get("args", [])
        if not isinstance(args, list):
            args = [args]

        tool_fn = self.tools.get(tool_name)
        if tool_fn is None:
            tool_outputs.append(
                ToolMessage(content=f"Tool '{tool_name}' not found.", tool_call_id=str(uuid.uuid4()))
            )
            return {"messages": tool_outputs}

        # execute tool safely
        try:
            result = run_tool(tool_fn, *args)
            # ensure JSON-serializable
            try:
                result_json = json.dumps(result, default=str)
            except Exception:
                result_json = str(result)
            tool_outputs.append(ToolMessage(content=result_json, tool_call_id=str(uuid.uuid4())))
        except Exception as e:
            tool_outputs.append(ToolMessage(content=f"Error executing {tool_name}: {e}", tool_call_id=str(uuid.uuid4())))

        return {"messages": tool_outputs}

# --- Main workflow runner ---
def run_screener_flow(user_query: str, max_steps: int = 6, include_summary: bool = False):
    """
    Deterministic screener: extract tickers from the query, fetch tool data directly,
    and return a structured JSON result. When include_summary=True, also ask the LLM
    to produce a 2-4 sentence deterministic summary based only on the fetched data.
    """
    # simple ticker extraction (uppercase 1-5 char symbols)
    tickers = re.findall(r"\b[A-Z]{1,5}\b", user_query)
    if not tickers:
        return json.dumps({"error": "No ticker symbol detected in the query. Please provide ticker(s) like 'NVDA'."})

    results = []
    for ticker in tickers:
        # fetch fundamentals and news using run_tool (handles StructuredTool)
        try:
            stock_info = run_tool(get_stock_info, ticker)
        except Exception as e:
            stock_info = {"error": f"get_stock_info failed: {e}"}

        try:
            news_items = run_tool(get_company_news, ticker)
        except Exception as e:
            news_items = {"error": f"get_company_news failed: {e}"}

        # normalize fields and respect "missing" rule
        fields = [
            ("symbol", "Symbol"),
            ("longName", "Company Name"),
            ("sector", "Sector"),
            ("industry", "Industry"),
            ("marketCap", "Market Cap"),
            ("trailingPE", "Trailing PE"),
            ("forwardPE", "Forward PE"),
            ("dividendYield", "Dividend Yield"),
            ("fiftyTwoWeekHigh", "52w High"),
            ("fiftyTwoWeekLow", "52w Low"),
            ("averageVolume", "Average Volume"),
        ]

        key_information = {}
        if isinstance(stock_info, dict) and "error" in stock_info:
            key_information = {"error": stock_info["error"]}
        else:
            for k, label in fields:
                if isinstance(stock_info, dict) and k in stock_info and stock_info[k] is not None:
                    key_information[label] = stock_info[k]
                else:
                    key_information[label] = f"{label} was not available from the data source."

        # summarize news titles (preserve up to 5) and avoid empty titles
        recent_news = []
        if isinstance(news_items, list):
            for it in news_items[:5]:
                if isinstance(it, dict):
                    title = (it.get("title") or it.get("headline") or "").strip()
                    if not title:
                        title = "No headline available"
                    link = it.get("link") or it.get("url") or None
                else:
                    title = str(it) if str(it).strip() else "No headline available"
                    link = None
                recent_news.append({"title": title, "link": link})
            if not recent_news:
                recent_news = [{"note": "No recent news returned by tool."}]
        else:
            recent_news = [{"error": news_items.get("error") if isinstance(news_items, dict) else str(news_items)}]

        results.append({
            "ticker": ticker,
            "key_information": key_information,
            "recent_news": recent_news,
        })

    response = {
        "screen_query": user_query,
        "results": results,
        "disclaimer": "This analysis is based on data retrieved in real-time and should not be considered financial advice.",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    }

    # Optional deterministic LLM summary (2-4 sentences) based only on fetched data
    if include_summary:
        try:
            # concise instruction; explicit: do not invent facts, only use provided data
            summ_prompt = (
                "You are a concise summarizer. Produce a 2–4 sentence neutral summary "
                "based ONLY on the following structured JSON (no new facts, no speculation). "
                "Mention key metrics and top news takeaways where available."
            )
            # give the model only the structured results (stringified) to avoid access to other context
            from langchain_core.messages import SystemMessage
            summ_messages = [
                SystemMessage(content=summ_prompt),
                {"role": "user", "content": json.dumps(response["results"], default=str)}
            ]
            llm_response = llm.invoke(summ_messages)
            # extract content from returned message object if available
            summary_text = getattr(llm_response, "content", None) or str(llm_response)
            response["summary"] = summary_text.strip()
        except Exception as e:
            response["summary_error"] = f"Summary generation failed: {e}"

    # RETURN a JSON string so FastAPI/Pydantic endpoint expecting a string receives valid data
    return json.dumps(response, default=str)

def run_tool(tool_obj, *args, **kwargs):
    """
    Execute a tool whether it's a plain function or a LangChain StructuredTool.
    Tries common attributes (.func, .run) then falls back to callable().
    """
    # StructuredTool created by @tool often exposes .func
    if hasattr(tool_obj, "func") and callable(tool_obj.func):
        return tool_obj.func(*args, **kwargs)
    # Some tool wrappers expose .run
    if hasattr(tool_obj, "run") and callable(tool_obj.run):
        return tool_obj.run(*args, **kwargs)
    # plain function
    if callable(tool_obj):
        return tool_obj(*args, **kwargs)
    raise TypeError(f"Tool object {tool_obj!r} is not callable")

