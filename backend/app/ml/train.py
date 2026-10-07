"""Train a demo readiness-projection model on SYNTHETIC data.

Honest disclaimer: the training rows are randomly generated from the same
weighted-sum formula as the rule-based engine (plus noise), so the model only
demonstrates the plumbing (train -> joblib -> predict). It is NOT a validated
predictor of real learning outcomes.

Usage:  python -m app.ml.train   (run from the backend/ directory)
Output: backend/app/ml/readiness_model.joblib
"""
import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WEIGHTS = [0.30, 0.20, 0.20, 0.20, 0.10]  # technical, projects, problem, interview, comms
OUT_PATH = Path(__file__).resolve().parent / "readiness_model.joblib"


def make_synthetic(n: int = 2000, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    """Generate synthetic (features, target) rows from the weighted formula + noise."""
    rng = np.random.default_rng(seed)
    X = rng.uniform(0, 100, size=(n, 5))
    noise = rng.normal(0, 5, size=n)  # small noise so the model learns the formula
    y = np.clip(X @ np.array(WEIGHTS) + noise, 0, 100)
    return X, y


def train() -> Path:
    """Train and save the GradientBoostingRegressor. Returns the model path."""
    X, y = make_synthetic()
    model = GradientBoostingRegressor(random_state=42)
    model.fit(X, y)
    joblib.dump(model, OUT_PATH)
    logger.info("Saved demo model to %s", OUT_PATH)
    return OUT_PATH


if __name__ == "__main__":
    train()
