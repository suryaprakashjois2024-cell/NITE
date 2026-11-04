"""
N.I.T.E. — FastAPI Backend
Run from project root: uvicorn backend.main:app --reload --port 8000
"""

import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import ConnectionRecord, PredictionResponse

# ── Load Model ────────────────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).resolve().parent.parent / "ml" / "model_pipeline.joblib"

try:
    pipeline = joblib.load(MODEL_PATH)
    CLASS_LABELS: list[str] = list(pipeline.classes_)
except FileNotFoundError:
    raise RuntimeError(
        f"Model not found at {MODEL_PATH}. "
        "Run `python ml/train.py` from the project root first."
    )

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="N.I.T.E. — Network Intrusion & Threat Evaluation API",
    description=(
        "Educational anomaly-detection API. "
        "Predictions are a secondary triage aid, not an automatic firewall blocking decision."
    ),
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # fine for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Responsible-use Advisory ──────────────────────────────────────────────────
ADVISORY = (
    "Educational anomaly score learned from a dataset. "
    "A secondary triage alert, not an automatic firewall blocking decision."
)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def health_check():
    return {"status": "online", "service": "N.I.T.E. Threat Evaluation API"}


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(record: ConnectionRecord):
    """
    Accept a single ConnectionRecord, run it through the trained pipeline,
    and return the predicted threat tier with class probabilities.
    """
    # Build a single-row DataFrame matching the training feature order
    features = pd.DataFrame(
        [
            {
                "connection_duration": record.connection_duration,
                "src_bytes": record.src_bytes,
                "dst_bytes": record.dst_bytes,
                "failed_logins": record.failed_logins,
                "protocol_type": record.protocol_type.value,
            }
        ]
    )

    try:
        predicted_label: str = pipeline.predict(features)[0]
        proba: np.ndarray = pipeline.predict_proba(features)[0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")

    probabilities = {cls: round(float(p), 4) for cls, p in zip(CLASS_LABELS, proba)}

    return PredictionResponse(
        predicted_tier=predicted_label,
        probabilities=probabilities,
        advisory=ADVISORY,
    )
