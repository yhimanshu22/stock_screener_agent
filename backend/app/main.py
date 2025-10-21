from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from app.flow import run_screener_flow

# Initialize FastAPI app
app = FastAPI(
    title="Stock Screener Agent API",
    description="An API for interacting with the LangGraph-based stock screener agent.",
    version="1.0.0"
)

# --- CORS Configuration ---
# This allows the React frontend to communicate with the backend.
origins = [
    "http://localhost:5173",  # Default Vite dev server port
    "http://127.0.0.1:5173",
    # Add any other origins you need to support
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
# These define the structure of the request and response bodies.
class ScreenerQuery(BaseModel):
    query: str

class ScreenerResponse(BaseModel):
    analysis: str

# --- API Endpoints ---
@app.get("/", summary="Root endpoint", description="Provides a welcome message.")
def read_root():
    return {"message": "Welcome to the Stock Screener Agent API!"}

@app.post("/screener", response_model=ScreenerResponse, summary="Run the stock screener agent")
async def run_screener(query: ScreenerQuery):
    """
    This endpoint receives a user query, passes it to the LangGraph agent,
    and returns the structured analysis.
    
    - **query**: The natural language query for the stock screener.
    """
    print(f"Received query: {query.query}")
    analysis_result = run_screener_flow(query.query)
    print(f"Generated analysis: {analysis_result}")
    return ScreenerResponse(analysis=analysis_result)

# --- Main execution ---
if __name__ == "__main__":
    # To run the backend: `uvicorn app.main:app --reload`
    uvicorn.run(app, host="0.0.0.0", port=8000)

