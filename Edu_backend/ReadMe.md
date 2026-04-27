# EduAI – AI Teaching Assistant Backend

Production-grade FastAPI backend for an AI-powered education platform.

---

## Architecture Overview

```
eduai/
├── main.py                  ← FastAPI app, lifespan, routers, error handlers
├── requirements.txt
├── env.example              ← copy to .env and fill in your values
│
├── core/
│   ├── config.py            ← pydantic-settings (all env vars)
│   ├── database.py          ← Motor async MongoDB client + index creation
│   └── security.py         ← bcrypt hashing, JWT creation/decoding, route guards
│
├── models/
│   ├── schemas.py           ← all Pydantic v2 request/response models
│   └── saved/               ← pickle files for trained ML models
│
├── routers/
│   ├── auth.py              ← POST /auth/register, POST /auth/login
│   ├── teacher.py           ← POST /teacher/upload-material, POST /teacher/create-quiz
│   ├── tutor.py             ← POST /tutor/ask, GET /tutor/history/{subject}
│   ├── quiz.py              ← POST /quiz/generate, POST /quiz/submit, GET /quiz/history
│   └── analytics.py        ← GET /analytics/*, POST /ml/predict-score
│
└── services/
    ├── file_service.py      ← validate → save → extract → clean → chunk → embed
    ├── rag_service.py       ← full RAG pipeline → Ollama → store chat
    └── ml_service.py        ← difficulty classifier + score predictor
```

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set up environment

```bash
cp env.example .env
# Edit .env with your MongoDB Atlas URI and JWT secret
```

### 3. Start Ollama (in a separate terminal)

```bash
# Install: https://ollama.ai
ollama serve
ollama pull mistral    # or: ollama pull llama3
```

### 4. Run the server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Open API docs

```
http://localhost:8000/docs
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection string | **required** |
| `MONGO_DB_NAME` | Database name | `eduai` |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens | **required** |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `JWT_EXPIRE_MINUTES` | Token expiry | `1440` (24h) |
| `UPLOAD_DIR` | Local file storage path | `uploads` |
| `MAX_FILE_SIZE_MB` | Max upload size | `50` |
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Model name | `mistral` |
| `EMBEDDING_MODEL` | Sentence transformer model | `sentence-transformers/all-MiniLM-L6-v2` |

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login, receive JWT |

**Register body:**
```json
{
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "SecurePass1",
  "role": "student"
}
```

**Login body:**
```json
{
  "email": "alice@example.com",
  "password": "SecurePass1"
}
```

**Login response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "role": "student",
  "user_id": "664abc..."
}
```

---

### Teacher Endpoints (role=teacher required)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/teacher/upload-material` | Upload PDF, auto-chunk and embed |
| POST | `/teacher/create-quiz` | Create quiz question (ML auto-classifies difficulty) |
| GET | `/teacher/materials` | List own uploaded materials |

**Upload material** — multipart/form-data:
```
subject: "Python Programming"
file: <PDF file>
```

**Create quiz:**
```json
{
  "subject": "Python Programming",
  "question": "What is the time complexity of binary search?",
  "options": ["O(n)", "O(log n)", "O(n²)", "O(1)"],
  "correct_answer": "O(log n)"
}
```

---

### AI Tutor (role=student required)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/tutor/ask` | Ask RAG-powered AI tutor |
| GET | `/tutor/history/{subject}` | Chat history for a subject |

**Ask question:**
```json
{
  "subject": "Python Programming",
  "question": "Explain how recursion works with an example."
}
```

**Response:**
```json
{
  "question": "Explain how recursion...",
  "answer": "Recursion is when a function calls itself...",
  "confidence": 0.823,
  "source": "notes",
  "retrieved_chunks": 3
}
```

Confidence and source logic:
- `confidence > 0.70` → `source: "notes"` (answered from uploaded materials)
- `confidence 0.40–0.70` → `source: "notes"` (notes + explanation)
- `confidence < 0.40` → `source: "ai"` (general LLM knowledge)

---

### Quiz System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/quiz/generate` | Student | Get random quiz |
| POST | `/quiz/submit` | Student | Submit answers, receive score |
| GET | `/quiz/history/{student_id}` | Both | Attempt history |
| GET | `/quiz/questions` | Teacher | View questions |

**Generate quiz:**
```json
{ "subject": "Python Programming", "num_questions": 10 }
```

**Submit quiz:**
```json
{
  "subject": "Python Programming",
  "question_ids": ["664a...", "664b..."],
  "answers": ["O(log n)", "True"]
}
```

**Submit response:**
```json
{
  "score": 8,
  "total_questions": 10,
  "percentage": 80.0,
  "grade": "B",
  "detailed_results": [...]
}
```

---

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/analytics/performance/{student_id}` | Both | Score timeline |
| GET | `/analytics/subjects/{student_id}` | Both | Per-subject averages |
| GET | `/analytics/summary/{student_id}` | Both | Overall summary |
| GET | `/analytics/leaderboard` | Teacher | Top students |
| POST | `/ml/predict-score` | Both | ML score prediction |

**Predict score:**
```json
{
  "study_hours_per_week": 8,
  "avg_quiz_score": 72.5,
  "quizzes_completed": 15,
  "chat_sessions": 10
}
```

**Response:**
```json
{
  "predicted_score": 78.4,
  "confidence_band": "74.2 – 82.6",
  "recommendation": "Solid performance. Review weak subject areas..."
}
```

---

## Database Design

### Why MongoDB?
- **Flexible schema** — embeddings are float arrays of variable count; MongoDB stores them naturally as JSON arrays. SQL would require a separate embeddings table with thousands of rows per document.
- **Easy horizontal scaling** — MongoDB Atlas auto-shards as data grows.
- **Aggregation pipeline** — native date-grouping, $avg, $max operators make analytics queries concise.
- **JSON-native** — Python dicts map directly to BSON documents; no ORM needed.

### Collections

#### `users`
```json
{
  "_id": ObjectId,
  "name": "string",
  "email": "string (unique indexed)",
  "password_hash": "string (bcrypt)",
  "role": "student | teacher",
  "created_at": "datetime"
}
```

#### `materials`
```json
{
  "_id": ObjectId,
  "teacher_id": "string",
  "subject": "string",
  "file_name": "string",
  "file_path": "string",
  "extracted_chunks": ["chunk1...", "chunk2..."],
  "embeddings": [[0.12, -0.45, ...], ...],
  "chunk_count": 42,
  "upload_date": "datetime"
}
```

> **Note:** `extracted_chunks` and `embeddings` are excluded from list queries to avoid transferring megabytes of data unnecessarily.

#### `quizzes`
```json
{
  "_id": ObjectId,
  "teacher_id": "string",
  "subject": "string",
  "question": "string",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "string",
  "difficulty": "easy | medium | hard",
  "created_at": "datetime"
}
```

#### `quiz_attempts`
```json
{
  "_id": ObjectId,
  "student_id": "string",
  "subject": "string",
  "answers": ["A", "C", "B", ...],
  "score": 8,
  "total_questions": 10,
  "percentage": 80.0,
  "date": "datetime"
}
```

#### `chat_history`
```json
{
  "_id": ObjectId,
  "student_id": "string",
  "subject": "string",
  "question": "string",
  "answer": "string",
  "confidence": 0.82,
  "source": "notes | ai",
  "timestamp": "datetime"
}
```

---

## ML Models

### Difficulty Classifier (TF-IDF + Logistic Regression)
- Trained on labelled questions at startup
- `models/saved/difficulty_classifier.pkl` persisted to disk
- Retrain by deleting the pickle — it will retrain on next boot
- Accuracy on seed data holdout: ~85%

### Score Predictor (Random Forest Regressor)
- 200 trees, max depth 6
- Features: study hours, avg quiz score, quizzes completed, chat sessions
- Confidence band = ±1 std dev across individual trees
- `models/saved/score_predictor.pkl` persisted to disk

---

## RAG Pipeline Details

```
Student question
      │
      ▼
[Embed question]  ← all-MiniLM-L6-v2 → 384-dim vector
      │
      ▼
[Load embeddings from MongoDB for subject]
      │
      ▼
[Cosine similarity] ← dot product (normalised vectors)
      │
      ▼
[Top-3 most similar chunks]
      │
      ▼
[Similarity threshold decision]
      │
   > 0.70        0.40–0.70        < 0.40
      │               │               │
  Direct answer  Notes + explain  General LLM
      │               │               │
      └───────────────┴───────────────┘
                      │
                      ▼
              [Build prompt]
                      │
                      ▼
           [POST to Ollama /api/generate]
                      │
                      ▼
              [Store to chat_history]
                      │
                      ▼
              [Return to student]
```

---

## Production Checklist

- [ ] Set strong `JWT_SECRET_KEY` (32+ random chars)
- [ ] Restrict `allow_origins` in CORS middleware to your frontend domain
- [ ] Set up MongoDB Atlas IP whitelist
- [ ] Add rate limiting (e.g., `slowapi`)
- [ ] Run behind nginx reverse proxy
- [ ] Use `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app`
- [ ] For large scale RAG (>50k chunks), migrate embeddings to Qdrant or Atlas Vector Search
- [ ] Set up logging aggregation (e.g., Datadog, Loki)

---

## License

MIT