"""
services/ml_service.py
──────────────────────
Two ML models:

1. DIFFICULTY CLASSIFIER (Logistic Regression + TF-IDF)
   ─────────────────────────────────────────────────────
   Input : question text (string)
   Output: "easy" | "medium" | "hard"

   Why TF-IDF?
     Converts text to a sparse numerical matrix based on term frequency
     weighted by how rare each word is across the corpus.
     Works well for short texts like quiz questions.

   Why Logistic Regression?
     Fast, interpretable, regularised (C parameter prevents overfitting).
     For a 3-class text classification problem with <10k samples,
     Logistic Regression often outperforms complex models because
     it doesn't overfit sparse TF-IDF features.

   Training data strategy:
     We seed the model with a small labelled dataset (easy/medium/hard
     questions) and allow online retraining as teachers label more quizzes.
     The model is retrained in a background thread when new labeled data
     is saved.

2. SCORE PREDICTOR (Random Forest Regressor)
   ──────────────────────────────────────────
   Input features:
     - study_hours_per_week  (float)
     - avg_quiz_score        (float 0–100)
     - quizzes_completed     (int)
     - chat_sessions         (int)
   Output: predicted final score (float 0–100)

   Why Random Forest?
     Student performance is a non-linear function of multiple factors.
     RF handles:
       • Non-linear interactions (e.g., many hours + low scores = struggling)
       • Feature importance ranking (interpretable)
       • Robust to outliers
       • Works well on small datasets (hundreds of samples)
     XGBoost would be marginally better with thousands of samples;
     RF is preferred here for simplicity and lower memory footprint.

   Training:
     Model is pre-trained on synthetic data and retrained periodically
     as real quiz_attempts accumulate in MongoDB.
"""

import logging
import pickle
from pathlib import Path
from typing import Literal

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

logger = logging.getLogger(__name__)

MODEL_DIR = Path("models/saved")
DIFFICULTY_MODEL_PATH = MODEL_DIR / "difficulty_classifier.pkl"
SCORE_MODEL_PATH = MODEL_DIR / "score_predictor.pkl"


# ════════════════════════════════════════════════════════════════════════════
# SEED TRAINING DATA
# ════════════════════════════════════════════════════════════════════════════

# Small labelled corpus to bootstrap the classifier.
# Replace with real teacher-labelled data over time.
_SEED_QUESTIONS = [
    # easy
    ("What is photosynthesis?", "easy"),
    ("Define a variable in programming.", "easy"),
    ("What is the capital of France?", "easy"),
    ("What is 2 + 2?", "easy"),
    ("What does DNA stand for?", "easy"),
    ("Who wrote Romeo and Juliet?", "easy"),
    ("What is water made of?", "easy"),
    ("What is the speed of light?", "easy"),
    ("Name one type of renewable energy.", "easy"),
    ("What is an algorithm?", "easy"),
    # medium
    ("Explain the difference between mitosis and meiosis.", "medium"),
    ("How does a recursive function work? Give an example.", "medium"),
    ("Describe the water cycle and its stages.", "medium"),
    ("What are the main differences between TCP and UDP?", "medium"),
    ("Explain Newton's three laws of motion.", "medium"),
    ("What is the difference between supervised and unsupervised learning?", "medium"),
    ("How does inheritance work in object-oriented programming?", "medium"),
    ("Explain the concept of Big-O notation.", "medium"),
    ("What are primary and foreign keys in a database?", "medium"),
    ("Describe how a REST API works.", "medium"),
    # hard
    ("Derive the time complexity of quicksort in the average case.", "hard"),
    ("Explain the CAP theorem and its implications for distributed systems.", "hard"),
    ("Describe the backpropagation algorithm in neural networks.", "hard"),
    ("Compare dynamic programming and greedy algorithms with examples.", "hard"),
    ("Explain the role of the Krebs cycle in cellular respiration.", "hard"),
    ("What are the implications of Gödel's incompleteness theorems?", "hard"),
    ("How does the RAFT consensus algorithm handle leader election?", "hard"),
    ("Derive the gradient of cross-entropy loss with respect to softmax inputs.", "hard"),
    ("Explain the differences between B-trees and LSM trees.", "hard"),
    ("What is the significance of the P vs NP problem?", "hard"),
]

# Synthetic student performance data for score predictor bootstrap
# [study_hours, avg_quiz_score, quizzes_completed, chat_sessions, final_score]
_SEED_PERFORMANCE = np.array([
    [1,  30, 2,  1,  35],
    [2,  40, 3,  2,  42],
    [3,  50, 5,  3,  52],
    [4,  55, 6,  4,  58],
    [5,  60, 8,  5,  63],
    [6,  65, 10, 6,  68],
    [7,  70, 12, 7,  72],
    [8,  72, 14, 8,  75],
    [9,  78, 16, 9,  79],
    [10, 80, 18, 10, 82],
    [12, 82, 20, 12, 84],
    [14, 85, 22, 14, 87],
    [16, 88, 25, 16, 90],
    [18, 90, 28, 18, 92],
    [20, 92, 30, 20, 94],
    [2,  20, 1,  0,  28],
    [3,  35, 4,  1,  38],
    [5,  45, 6,  2,  48],
    [7,  55, 9,  4,  57],
    [10, 60, 12, 6,  63],
], dtype=float)


# ════════════════════════════════════════════════════════════════════════════
# DIFFICULTY CLASSIFIER
# ════════════════════════════════════════════════════════════════════════════

class DifficultyClassifier:
    """Wraps sklearn Pipeline: TF-IDF → LogisticRegression."""

    def __init__(self):
        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                ngram_range=(1, 2),   # unigrams + bigrams catch phrases like "time complexity"
                max_features=5000,
                sublinear_tf=True,    # apply log(1 + tf) — reduces impact of very common terms
                strip_accents="unicode",
                analyzer="word",
                min_df=1,
            )),
            ("clf", LogisticRegression(
                C=1.0,                # regularisation strength
                max_iter=1000,
                class_weight="balanced",  # handle class imbalance
                random_state=42,
            )),
        ])
        self._trained = False

    def train(self, questions: list[str], labels: list[str]) -> float:
        """Train and return accuracy on a hold-out split."""
        X_train, X_test, y_train, y_test = train_test_split(
            questions, labels, test_size=0.2, random_state=42, stratify=labels
        )
        self.pipeline.fit(X_train, y_train)
        self._trained = True
        acc = accuracy_score(y_test, self.pipeline.predict(X_test))
        logger.info("Difficulty classifier trained. Hold-out accuracy: %.2f%%", acc * 100)
        return acc

    def predict(self, question: str) -> Literal["easy", "medium", "hard"]:
        if not self._trained:
            raise RuntimeError("Classifier not trained yet.")
        return self.pipeline.predict([question])[0]

    def predict_proba(self, question: str) -> dict:
        if not self._trained:
            raise RuntimeError("Classifier not trained yet.")
        probs = self.pipeline.predict_proba([question])[0]
        classes = self.pipeline.classes_
        return {cls: round(float(p), 3) for cls, p in zip(classes, probs)}

    def save(self) -> None:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        with open(DIFFICULTY_MODEL_PATH, "wb") as f:
            pickle.dump(self, f)

    @classmethod
    def load(cls) -> "DifficultyClassifier":
        with open(DIFFICULTY_MODEL_PATH, "rb") as f:
            return pickle.load(f)


# ════════════════════════════════════════════════════════════════════════════
# SCORE PREDICTOR
# ════════════════════════════════════════════════════════════════════════════

class ScorePredictor:
    """Random Forest Regressor for predicted final exam score."""

    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=6,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        )
        self._trained = False

    def train(self, X: np.ndarray, y: np.ndarray) -> None:
        """
        X shape: (n_samples, 4)
        Columns: study_hours, avg_quiz_score, quizzes_completed, chat_sessions
        y: final scores
        """
        self.model.fit(X, y)
        self._trained = True
        logger.info("Score predictor trained on %d samples", len(y))

    def predict(self, features: list[float]) -> dict:
        if not self._trained:
            raise RuntimeError("Score predictor not trained yet.")
        arr = np.array(features, dtype=float).reshape(1, -1)
        
        # Individual tree predictions for confidence interval
        tree_preds = np.array([tree.predict(arr)[0] for tree in self.model.estimators_])
        predicted = float(np.clip(self.model.predict(arr)[0], 0, 100))
        std = float(np.std(tree_preds))
        
        low = max(0, round(predicted - std, 1))
        high = min(100, round(predicted + std, 1))

        # Generate recommendation based on prediction
        recommendation = _generate_recommendation(
            predicted_score=predicted,
            avg_quiz_score=features[1],
            study_hours=features[0],
        )

        return {
            "predicted_score": round(predicted, 1),
            "confidence_band": f"{low} – {high}",
            "recommendation": recommendation,
        }

    def save(self) -> None:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        with open(SCORE_MODEL_PATH, "wb") as f:
            pickle.dump(self, f)

    @classmethod
    def load(cls) -> "ScorePredictor":
        with open(SCORE_MODEL_PATH, "rb") as f:
            return pickle.load(f)


# ════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCES
# ════════════════════════════════════════════════════════════════════════════

_difficulty_classifier: DifficultyClassifier | None = None
_score_predictor: ScorePredictor | None = None


def get_difficulty_classifier() -> DifficultyClassifier:
    global _difficulty_classifier
    if _difficulty_classifier is None:
        _difficulty_classifier = _load_or_train_difficulty()
    return _difficulty_classifier


def get_score_predictor() -> ScorePredictor:
    global _score_predictor
    if _score_predictor is None:
        _score_predictor = _load_or_train_score()
    return _score_predictor


def _load_or_train_difficulty() -> DifficultyClassifier:
    if DIFFICULTY_MODEL_PATH.exists():
        logger.info("Loading difficulty classifier from disk")
        return DifficultyClassifier.load()

    logger.info("Training difficulty classifier on seed data")
    clf = DifficultyClassifier()
    questions = [q for q, _ in _SEED_QUESTIONS]
    labels = [l for _, l in _SEED_QUESTIONS]
    clf.train(questions, labels)
    clf.save()
    return clf


def _load_or_train_score() -> ScorePredictor:
    if SCORE_MODEL_PATH.exists():
        logger.info("Loading score predictor from disk")
        return ScorePredictor.load()

    logger.info("Training score predictor on seed data")
    predictor = ScorePredictor()
    X = _SEED_PERFORMANCE[:, :4]
    y = _SEED_PERFORMANCE[:, 4]
    predictor.train(X, y)
    predictor.save()
    return predictor


def classify_difficulty(question: str) -> str:
    """Public helper: classify a single question."""
    clf = get_difficulty_classifier()
    return clf.predict(question)


def predict_score(
    study_hours: float,
    avg_quiz_score: float,
    quizzes_completed: int,
    chat_sessions: int,
) -> dict:
    """Public helper: predict a student's final score."""
    predictor = get_score_predictor()
    return predictor.predict([study_hours, avg_quiz_score, quizzes_completed, chat_sessions])


# ════════════════════════════════════════════════════════════════════════════
# RECOMMENDATION ENGINE (rule-based)
# ════════════════════════════════════════════════════════════════════════════

def _generate_recommendation(
    predicted_score: float,
    avg_quiz_score: float,
    study_hours: float,
) -> str:
    if predicted_score >= 85:
        return "Excellent trajectory! Keep up your current study habits and focus on challenging topics."
    elif predicted_score >= 70:
        if study_hours < 5:
            return "Good progress. Increasing study hours by 2-3 per week could push you into the top tier."
        return "Solid performance. Review weak subject areas and maintain quiz practice."
    elif predicted_score >= 55:
        if avg_quiz_score < 50:
            return "Focus heavily on quiz practice — your quiz scores are dragging down predictions."
        return "Moderate performance. Consider increasing study hours and using the AI tutor for difficult topics."
    else:
        return (
            "Significant improvement needed. "
            "Aim for at least 10 study hours/week, complete more quizzes, "
            "and actively use the AI tutor to clarify concepts."
        )