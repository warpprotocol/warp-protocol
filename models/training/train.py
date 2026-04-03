"""
Warp Protocol - Agent Classifier Training Script

Trains a neural network to classify Solana agents as AUTONOMOUS, HYBRID, or HUMAN
based on 47 behavioral features. Exports the trained model to ONNX format for
inference in the TypeScript classifier package.
"""

import argparse
import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, TensorDataset
from tqdm import tqdm

NUM_FEATURES = 47
NUM_CLASSES = 3
CLASS_NAMES = ["AUTONOMOUS", "HYBRID", "HUMAN"]

FEATURE_COLUMNS = [
    "timing_mean_interval", "timing_interval_stddev", "timing_interval_cv",
    "timing_burst_count", "timing_max_burst_size", "timing_periodicity_score",
    "timing_night_ratio", "timing_weekend_ratio",
    "freq_tx_per_hour_1h", "freq_tx_per_hour_6h", "freq_tx_per_hour_24h",
    "freq_total_tx_count", "freq_active_hours_count", "freq_active_days_count",
    "prog_unique_programs_invoked", "prog_dominant_program_ratio",
    "prog_cpi_depth_mean", "prog_cpi_depth_max", "prog_known_dex_ratio",
    "prog_known_lending_ratio", "prog_system_program_ratio",
    "bal_mean_fee", "bal_fee_stddev", "bal_mean_sol_delta",
    "bal_sol_delta_stddev", "bal_token_transfer_count", "bal_unique_token_mints",
    "ix_mean_instruction_count", "ix_max_instruction_count",
    "ix_mean_inner_ix_count", "ix_unique_instruction_data_hashes",
    "ix_data_entropy_mean", "ix_data_length_mean", "ix_data_length_stddev",
    "graph_unique_counterparties", "graph_repeat_counterparty_ratio",
    "graph_self_transfer_ratio", "graph_funding_source_count",
    "graph_fan_out_degree", "graph_fan_in_degree", "graph_clustering_coefficient",
    "err_error_rate", "err_total_errors", "err_max_consecutive_errors",
    "err_retry_pattern_score", "err_slippage_error_ratio",
    "err_compute_exceeded_ratio",
]


class AgentClassifier(nn.Module):
    """Three-layer neural network for agent classification."""

    def __init__(self, input_dim: int = NUM_FEATURES, hidden_dim: int = 128):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim // 2, hidden_dim // 4),
            nn.ReLU(),
            nn.Linear(hidden_dim // 4, NUM_CLASSES),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


def load_dataset(data_path: str) -> tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    """Load the labeled dataset from a parquet or CSV file."""
    path = Path(data_path)
    if path.suffix == ".parquet":
        df = pd.read_parquet(path)
    elif path.suffix == ".csv":
        df = pd.read_csv(path)
    else:
        raise ValueError(f"Unsupported file format: {path.suffix}")

    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing feature columns: {missing}")

    X = df[FEATURE_COLUMNS].values.astype(np.float32)
    label_map = {"AUTONOMOUS": 0, "HYBRID": 1, "HUMAN": 2}
    y = df["label"].map(label_map).values.astype(np.int64)

    print(f"Loaded {len(df)} samples from {data_path}")
    for cls_name, cls_id in label_map.items():
        count = (y == cls_id).sum()
        print(f"  {cls_name}: {count} ({count / len(y) * 100:.1f}%)")

    return df, X, y


def train_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    epochs: int = 100,
    batch_size: int = 64,
    learning_rate: float = 1e-3,
    device: str = "cpu",
) -> AgentClassifier:
    """Train the classifier model and return the best checkpoint."""
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    train_dataset = TensorDataset(
        torch.tensor(X_train_scaled, dtype=torch.float32),
        torch.tensor(y_train, dtype=torch.long),
    )
    val_dataset = TensorDataset(
        torch.tensor(X_val_scaled, dtype=torch.float32),
        torch.tensor(y_val, dtype=torch.long),
    )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    model = AgentClassifier().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_acc = 0.0
    best_state = None

    for epoch in tqdm(range(epochs), desc="Training"):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for features, labels in train_loader:
            features, labels = features.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(features)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * features.size(0)
            _, predicted = outputs.max(1)
            train_correct += predicted.eq(labels).sum().item()
            train_total += labels.size(0)

        scheduler.step()

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for features, labels in val_loader:
                features, labels = features.to(device), labels.to(device)
                outputs = model(features)
                _, predicted = outputs.max(1)
                val_correct += predicted.eq(labels).sum().item()
                val_total += labels.size(0)

        val_acc = val_correct / val_total
        train_acc = train_correct / train_total

        if (epoch + 1) % 10 == 0:
            print(
                f"Epoch {epoch + 1}/{epochs} - "
                f"Train Loss: {train_loss / train_total:.4f}, "
                f"Train Acc: {train_acc:.4f}, "
                f"Val Acc: {val_acc:.4f}"
            )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state = model.state_dict().copy()

    if best_state is not None:
        model.load_state_dict(best_state)

    print(f"Best validation accuracy: {best_val_acc:.4f}")
    return model


def export_onnx(model: AgentClassifier, output_path: str) -> None:
    """Export the trained model to ONNX format."""
    model.eval()
    dummy_input = torch.randn(1, NUM_FEATURES)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["features"],
        output_names=["probabilities"],
        dynamic_axes={
            "features": {0: "batch_size"},
            "probabilities": {0: "batch_size"},
        },
    )
    print(f"Model exported to {output_path}")


def evaluate(model: AgentClassifier, X_test: np.ndarray, y_test: np.ndarray) -> None:
    """Print classification metrics on the test set."""
    model.eval()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_test)

    with torch.no_grad():
        inputs = torch.tensor(X_scaled, dtype=torch.float32)
        outputs = model(inputs)
        _, predicted = outputs.max(1)
        y_pred = predicted.numpy()

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES))

    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:")
    print(cm)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Warp Protocol agent classifier")
    parser.add_argument(
        "--data", type=str, default="dataset/agents_labeled.parquet",
        help="Path to the labeled dataset file",
    )
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument(
        "--output", type=str, default="exports/classifier_v4.onnx",
        help="Output path for the ONNX model",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    df, X, y = load_dataset(args.data)

    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.3, random_state=args.seed, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.5, random_state=args.seed, stratify=y_temp
    )

    print(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

    model = train_model(
        X_train, y_train, X_val, y_val,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
    )

    evaluate(model, X_test, y_test)
    export_onnx(model, args.output)


if __name__ == "__main__":
    main()
