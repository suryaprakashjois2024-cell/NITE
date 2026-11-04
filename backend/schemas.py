"""
N.I.T.E. — Pydantic Schemas
Field bounds strictly match the internship report specifications.
"""

from enum import Enum
from typing import Dict
from pydantic import BaseModel, Field


class ProtocolType(str, Enum):
    TCP = "TCP"
    UDP = "UDP"
    ICMP = "ICMP"


class ConnectionRecord(BaseModel):
    """Five telemetry features for a single network connection."""

    connection_duration: float = Field(
        ...,
        ge=0.0,
        le=3600.0,
        description="Duration of the connection in seconds (0 – 3600 s).",
        json_schema_extra={"example": 12.5},
    )
    src_bytes: int = Field(
        ...,
        ge=0,
        le=10_000_000,
        description="Bytes sent from source to destination (0 – 10 MB).",
        json_schema_extra={"example": 1024},
    )
    dst_bytes: int = Field(
        ...,
        ge=0,
        le=10_000_000,
        description="Bytes sent from destination to source (0 – 10 MB).",
        json_schema_extra={"example": 2048},
    )
    failed_logins: int = Field(
        ...,
        ge=0,
        le=10,
        description="Number of failed login attempts (0 – 10).",
        json_schema_extra={"example": 0},
    )
    protocol_type: ProtocolType = Field(
        ...,
        description="Network protocol used: TCP, UDP, or ICMP.",
        json_schema_extra={"example": "TCP"},
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "connection_duration": 12.5,
                "src_bytes": 1024,
                "dst_bytes": 2048,
                "failed_logins": 0,
                "protocol_type": "TCP",
            }
        }
    }


class PredictionResponse(BaseModel):
    """Structured prediction result returned by /predict."""

    predicted_tier: str = Field(..., description="Predicted threat tier label.")
    probabilities: Dict[str, float] = Field(
        ..., description="Per-class probability scores."
    )
    advisory: str = Field(..., description="Responsible-use advisory note.")
