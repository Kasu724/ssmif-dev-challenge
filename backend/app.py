"""
Minimal FastAPI app to verify backend runs.
Run: uvicorn backend.app:app --reload
"""

from fastapi import FastAPI

app = FastAPI(title="SSMIF Dev Challenge - Backend")

@app.get("/health")
async def health():
    """Simple health check endpoint."""
    return {"status": "ok"}