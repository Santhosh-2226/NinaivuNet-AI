# API Gateway Catalog � NinaivuNet AI

NinaivuNet AI exposes unified, standardized endpoints mapped to Port 3000 and Port 4000.

## ?? Standard API Response Envelope
Every response adheres to the following JSON structure:
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... },
  "error": null,
  "timestamp": "2026-07-14T23:45:00.000Z",
  "requestId": "x3a82f9"
}
```

---

## ??? Root Meeting Server (Port 3000)

### ?? Recording & Ingestion
- `POST /api/meetings/:meetingId/participants/:userId/start`
  - Body: `{ userName, startedAtMs }`
  - Starts recording session for user.
- `POST /api/upload-audio`
  - Body: Audio blob chunks
  - Uploads raw user mic segment recording.

### ?? Collaborative AI & Whiteboard
- `POST /api/db/meetings/:meetingId/analyze-whiteboard`
  - Body: `{ drawingPoints }`
  - Generates structural analysis of sketch canvas.
- `POST /api/db/meetings/:projectId/prep-brief`
  - Body: `{ userName }`
  - Returns historic decision context and project risk review.

### ?? Translation & RAG
- `POST /api/db/translate`
  - Body: `{ text, targetLanguage }`
  - Localizes text parameters on-the-fly.
- `POST /api/rag/query`
  - Body: `{ question, projectId, preferredLanguage }`
  - Grounded vector knowledge query.

---

## ?? Backend API Server (Port 4000)

### ?? Authentication
- `POST /api/auth/register`: `{ name, email, password }`
- `POST /api/auth/login`: `{ email, password }`
- `POST /api/auth/refresh`: `{ refreshToken }`
- `POST /api/auth/logout` (JWT token expiration)
- `PATCH /api/auth/profile`: Language settings preferences update
