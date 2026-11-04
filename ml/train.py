# -*- coding: utf-8 -*-
# encoding: utf-8
"""
N.I.T.E. — ML Training Pipeline
Synthesizes 5,000 connection records and trains a RandomForest pipeline.
Run from project root: python ml/train.py
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import classification_report
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# ── Reproducibility ──────────────────────────────────────────────────────────
np.random.seed(42)
N_SAMPLES = 5_000

# ── Synthetic Dataset Generation ─────────────────────────────────────────────
# Class distribution: ~49.5% Normal, ~22% Probe, ~28.5% DoS
labels = np.random.choice(
    ["Normal", "Probe", "DoS"],
    size=N_SAMPLES,
    p=[0.495, 0.220, 0.285],
)

# Protocol distribution (independent of class)
protocols = np.random.choice(
    ["TCP", "UDP", "ICMP"], size=N_SAMPLES, p=[0.70, 0.20, 0.10]
)

duration, src_bytes, dst_bytes, failed_logins = [], [], [], []

for lbl in labels:
    if lbl == "Normal":
        duration.append(np.random.uniform(5.0, 300.0))
        src_bytes.append(int(np.random.randint(200, 25_000)))
        dst_bytes.append(int(np.random.randint(500, 500_000)))
        failed_logins.append(0 if np.random.rand() > 0.05 else 1)

    elif lbl == "Probe":
        duration.append(np.random.uniform(0.01, 5.0))
        src_bytes.append(int(np.random.randint(40, 500)))
        dst_bytes.append(0)
        failed_logins.append(int(np.random.randint(2, 7)))

    else:  # DoS
        duration.append(np.random.uniform(1.0, 30.0))
        src_bytes.append(int(np.random.randint(500_000, 5_000_000)))
        dst_bytes.append(int(np.random.randint(0, 100)))
        failed_logins.append(0)

df = pd.DataFrame(
    {
        "connection_duration": duration,
        "src_bytes": src_bytes,
        "dst_bytes": dst_bytes,
        "failed_logins": failed_logins,
        "protocol_type": protocols,
        "threat_tier": labels,
    }
)

print(f"Dataset shape: {df.shape}")
print("Class distribution:\n", df["threat_tier"].value_counts(normalize=True).round(3))

# ── Feature / Label Split ─────────────────────────────────────────────────────
NUMERIC_FEATURES = ["connection_duration", "src_bytes", "dst_bytes", "failed_logins"]
CATEGORICAL_FEATURES = ["protocol_type"]
FEATURE_COLS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

X = df[FEATURE_COLS]
y = df["threat_tier"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── Scikit-learn Pipeline ─────────────────────────────────────────────────────
preprocessor = ColumnTransformer(
    transformers=[
        ("num", SimpleImputer(strategy="median"), NUMERIC_FEATURES),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
    ]
)

pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=250, random_state=42, n_jobs=-1)),
    ]
)

# ── Train ─────────────────────────────────────────────────────────────────────
print("\nTraining RandomForest pipeline ...")
pipeline.fit(X_train, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────────────
print("\n-- Test-set Classification Report ------------------------------")
y_pred = pipeline.predict(X_test)
print(classification_report(y_test, y_pred))

cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="f1_macro", n_jobs=-1)
print(f"5-Fold CV macro-F1: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Export ────────────────────────────────────────────────────────────────────
# Always resolve output path relative to this file so the script can be run
# from any working directory.
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "model_pipeline.joblib")
joblib.dump(pipeline, output_path)
print(f"\n[OK] Pipeline exported -> {output_path}")