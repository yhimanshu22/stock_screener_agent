# 🧠 Stock Screener AI Agent

An **AI-powered stock analysis and screening tool** built using **FastAPI**, **LangGraph**, and **React (Vite)**.
It fetches real-time financial data, generates company summaries, and provides structured insights like valuation metrics and news analysis — all with a Screener.in-style UI.

---

## 🚀 Features

* FastAPI backend with LangGraph AI integration
* Beautiful React frontend styled like [Screener.in](https://www.screener.in/)
* Real-time company financials, valuation, and key ratios
* AI-generated insights and recommendations
* Persistent search history stored locally

---

## ⚙️ Prerequisites

Make sure you have installed:

* **Python 3.10+**
* **Node.js 18+** (for frontend)
* **pip / uv** (for Python dependency management)

---

## 🧩 Backend Setup (FastAPI)

1. **Clone the repository**

   ```bash
   git clone https://github.com/yhimanshu22/stock_screener_agent.git
   cd stock_screener_agent/backend
   ```

2. **Create and activate virtual environment**

   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows
   # OR
   source venv/bin/activate      # On macOS/Linux
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

   or if using [uv](https://github.com/astral-sh/uv):

   ```bash
   pip install uv
   uv pip install -r requirements.txt
   ```

4. **Run the backend**

   ```bash
   uvicorn app.main:app --reload
   ```

   The FastAPI server will start at 👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 💻 Frontend Setup (React + Vite)

1. **Navigate to frontend**

   ```bash
   cd ../frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

   The frontend runs at 👉 **[http://127.0.0.1:5173](http://127.0.0.1:5173)**

---

## 🔗 Connecting Frontend & Backend

The frontend already connects to your FastAPI backend using:

```js
const API_BASE = 'http://localhost:8000';
```

Make sure both servers are running simultaneously:

* FastAPI → port **8000**
* React → port **5173**

---

## 🧭 Directory Structure

```
stock_screener_agent/
│
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── flow.py           # LangGraph flow logic
│   │   └── ...
│   ├── requirements.txt
│   └── venv/
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React UI components
│   │   ├── pages/            # StockDetail page
│   │   ├── api/              # API wrappers
│   │   └── App.jsx
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## 🧠 Example Usage

1. Run backend and frontend.
2. Open your browser at **[http://localhost:5173](http://localhost:5173)**.
3. Search for any stock (e.g., `TSLA` or `AAPL`).
4. Get instant AI-powered company analysis with:

   * Market cap
   * PE ratios
   * Book value
   * Dividend yield
   * Real-time news

---
<img width="1868" height="812" alt="image" src="https://github.com/user-attachments/assets/36092110-ec0e-4f20-876b-e7625a7036dd" />
<img width="1423" height="681" alt="image" src="https://github.com/user-attachments/assets/4b768b5d-4782-4075-83f6-ac1b0be61a78" />
<img width="1358" height="770" alt="image" src="https://github.com/user-attachments/assets/69691db0-f34a-4310-97c3-3c434757b513" />


