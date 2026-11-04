# N.I.T.E. — Network Intrusion & Threat Evaluation System

[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E?style=flat&logo=scikitlearn)](https://scikit-learn.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Academic-blue.svg)]()

> **Summer Internship-II Project (120 Hours)**  
> **Student:** Suryaprakash Jois (Register No: U25UV24T064050)  
> **Degree:** B.Tech in Information Science and Engineering (V Semester), UVCE, Bengaluru  
> **Conducted by:** Honeywell Future Skills Edge Program, powered by BharatCares  
> **Academic Guide:** Dr. Thanuja R, Associate Professor, Dept. of CSE, UVCE  

---

## 📌 Overview

Modern enterprise and cloud networks generate far more connection logs than security teams can manually inspect. **N.I.T.E.** is a supervised multiclass classification system designed to analyze connection-level telemetry and assign an advisory security state:
1. **Normal Traffic**
2. **Reconnaissance Probe**
3. **Denial of Service (DoS)**

The system delivers a reproducible machine-learning pipeline, a high-performance **FastAPI** REST prediction service (<35 ms latency), and an interactive **web dashboard** featuring real-time inference, parameter sensitivity (what-if analysis), CSV batch audits, and Chart.js performance visualizations.

---

## 📊 Telemetry Attributes & Bounds

The model relies on five connection-level attributes, avoiding sensitive payload inspection or personal data storage:

| Feature | Data Type | Valid Range | Description |
| :--- | :--- | :--- | :--- |
| `connection_duration` | Float | `0.0` – `3600.0` sec | Total elapsed time of the network socket session |
| `src_bytes` | Integer | `0` – `10,000,000` B | Payload volume sent from client/source host |
| `dst_bytes` | Integer | `0` – `10,000,000` B | Response volume returned to client host |
| `failed_logins` | Integer | `0` – `10` attempts | Count of failed authentication handshakes |
| `protocol_type` | Categorical | `TCP`, `UDP`, `ICMP` | Transport-layer protocol used |
| **`threat_tier`** *(Target)* | Categorical | `Normal`, `Probe`, `DoS` | Evaluated network security classification |

---

## 🧠 Machine Learning & Benchmarking

The system pre-processes numeric features via **median imputation** and categorical features via **one-hot encoding** (`handle_unknown='ignore'`). Preprocessing is packaged inside a Scikit-learn `Pipeline` to prevent data leakage between training and inference.

Five algorithms were evaluated using stratified 5-fold cross-validation on 4,000 training records and tested against a held-out set of 1,000 records:

| Model | 5-Fold CV Macro-F1 | Test Accuracy | Test Macro-F1 | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Random Forest (Selected)** | **0.952** | **0.956** | **0.951** | **250 estimators; robust against heavy-tailed byte counts** |
| Gradient Boosting | 0.948 | 0.951 | 0.947 | 200 estimators, learning rate = 0.08 |
| Decision Tree | 0.894 | 0.891 | 0.887 | `max_depth=6`, `min_samples_leaf=4` |
| K-Nearest Neighbours (KNN) | 0.876 | 0.880 | 0.874 | $k=7$, standardized features |
| Logistic Regression | 0.812 | 0.818 | 0.809 | L2 regularized linear baseline |

### Selected Model Per-Class Breakdown (Random Forest)
- **Normal:** Precision: 0.966 | Recall: 0.974 | F1: 0.970 (Support: 495)
- **DoS:** Precision: 0.955 | Recall: 0.968 | F1: 0.962 (Support: 285)
- **Probe:** Precision: 0.934 | Recall: 0.900 | F1: 0.917 (Support: 220)

---

## 🏗️ Project Architecture

```text
NITE/
├── backend/
│   ├── main.py              # FastAPI server & prediction endpoints
│   └── schemas.py           # Pydantic schemas with strict boundary validation
├── ml/
│   ├── train.py             # Data generation, pipeline assembly & training
│   └── model_pipeline.joblib# Serialized, leak-free Scikit-learn model
├── frontend/
│   ├── index.html           # Single-page dashboard & analyzer layout
│   ├── styles.css           # Modern SOC-styled responsive UI
│   └── app.js               # Form validation, API calls & Chart.js plots
├── reports/
│   └── model_metrics.json   # Exported evaluation metrics & confusion matrices
├── requirements.txt         # Project dependencies
└── README.md                # Project documentation
