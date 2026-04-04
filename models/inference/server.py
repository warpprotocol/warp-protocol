"""
Warp Protocol - FastAPI Inference Server

Serves the ONNX agent classifier model via a REST API.
Accepts feature vectors and returns classification probabilities.
"""

import os
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

NUM_FEATURES = 47
CLASS_NAMES = ["AUTONOMOUS", "HYBRID", "HUMAN"]
MODEL_PATH = os.environ.get(
    "ONNX_MODEL_PATH",
    str(Path(__file__).parent.parent / "training" / "exports" / "classifier_v4.onnx"),
)

app = FastAPI(
    title="Warp Protocol Inference Server",
    version="0.4.0",
    description="ONNX model inference for agent classification",
)

session: ort.InferenceSession | None = None


class FeatureInput(BaseModel):
    """Input schema for a single classification request."""
    features: list[float] = Field(
        ...,
        min_length=NUM_FEATURES,
        max_length=NUM_FEATURES,
        description=f"Feature vector of length {NUM_FEATURES}",
    )


class BatchFeatureInput(BaseModel):
    """Input schema for batch classification."""
    batch: list[FeatureInput] = Field(
        ...,
        min_length=1,
        max_length=128,
        description="List of feature vectors to classify",
    )


class ClassificationOutput(BaseModel):
    label: str
    confidence: float
    probabilities: dict[str, float]
    latency_ms: float


class BatchClassificationOutput(BaseModel):
    results: list[ClassificationOutput]
    total_latency_ms: float
    batch_size: int


class HealthOutput(BaseModel):
    status: str
    model_loaded: bool
    model_path: str


@app.on_event("startup")
async def load_model() -> None:
    """Load the ONNX model on server startup."""
    global session
    if not Path(MODEL_PATH).exists():
        print(f"WARNING: Model file not found at {MODEL_PATH}")
        print("Server will start but inference requests will fail.")
        return

    sess_options = ort.SessionOptions()
    sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess_options.intra_op_num_threads = 4

    session = ort.InferenceSession(MODEL_PATH, sess_options)
    print(f"Model loaded from {MODEL_PATH}")


@app.get("/health", response_model=HealthOutput)
async def health() -> HealthOutput:
    return HealthOutput(
        status="ok" if session is not None else "no_model",
        model_loaded=session is not None,
        model_path=MODEL_PATH,
    )


@app.post("/classify", response_model=ClassificationOutput)
async def classify(input_data: FeatureInput) -> ClassificationOutput:
    """Classify a single agent from its feature vector."""
    if session is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    start = time.perf_counter()

    features = np.array([input_data.features], dtype=np.float32)
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    raw_output = session.run([output_name], {input_name: features})[0]
    probabilities = softmax(raw_output[0])

    label_idx = int(np.argmax(probabilities))
    label = CLASS_NAMES[label_idx]
    confidence = float(probabilities[label_idx])

    latency_ms = (time.perf_counter() - start) * 1000

    return ClassificationOutput(
        label=label,
        confidence=round(confidence, 6),
        probabilities={
            name: round(float(prob), 6)
            for name, prob in zip(CLASS_NAMES, probabilities)
        },
        latency_ms=round(latency_ms, 3),
    )


@app.post("/classify/batch", response_model=BatchClassificationOutput)
async def classify_batch(input_data: BatchFeatureInput) -> BatchClassificationOutput:
    """Classify a batch of agents from their feature vectors."""
    if session is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    start = time.perf_counter()

    features = np.array(
        [item.features for item in input_data.batch], dtype=np.float32
    )
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    raw_output = session.run([output_name], {input_name: features})[0]

    results = []
    for i in range(len(input_data.batch)):
        probs = softmax(raw_output[i])
        label_idx = int(np.argmax(probs))

        results.append(
            ClassificationOutput(
                label=CLASS_NAMES[label_idx],
                confidence=round(float(probs[label_idx]), 6),
                probabilities={
                    name: round(float(p), 6) for name, p in zip(CLASS_NAMES, probs)
                },
                latency_ms=0,
            )
        )

    total_latency = (time.perf_counter() - start) * 1000

    return BatchClassificationOutput(
        results=results,
        total_latency_ms=round(total_latency, 3),
        batch_size=len(input_data.batch),
    )


def softmax(logits: np.ndarray) -> np.ndarray:
    """Compute softmax probabilities from raw logits."""
    exp_logits = np.exp(logits - np.max(logits))
    return exp_logits / exp_logits.sum()
