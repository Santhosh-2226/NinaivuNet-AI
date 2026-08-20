# Database Schema Blueprint � NinaivuNet AI

NinaivuNet AI uses a dual-engine architecture consisting of a persistent relational SQLite DB for workspace data and a MongoDB database for tenant structures.

---

## ??? SQLite Engine (ninaivunet.db)

### 1. Schema Tables Matrix
- **`projects`**: Maps unique workspace configurations.
- **`project_members`**: Assigns localized project RBAC tags (lead/member).
- **`meetings`**: Relates summaries, analysis payloads, and timelines.
- **`transcripts`**: Encrypted participant timelines (original vs translated).
- **`tasks`**: Tracking board storing owner assignments, deadlines, and priorities.
- **`decisions`**: Secure logs containing extracted rationales and discussions.
- **`embeddings`**: High-dimensional vector space mapping transcript nodes.
- **`audit_logs`**: Chronological system activity records.

### ? 2. Index Performance Enhancements
To maximize search execution speed under heavy workloads:
- `idx_transcripts_meeting` on `transcripts(meeting_id)`
- `idx_tasks_meeting` on `tasks(meeting_id)`
- `idx_tasks_owner` on `tasks(owner)`
- `idx_decisions_meeting` on `decisions(meeting_id)`
- `idx_embeddings_project` on `embeddings(project_id)`

---

## ?? MongoDB Engine (Cloud Tenant Persistent Storage)
- **User**: Managed using bcrypt hashing on passwords. Contains localization flags (`preferredLanguage`, `autoTranslate`).
- **Organization**: Workspace multi-tenant divisions.
- **Department**: Groupings under organizations.
- **Invitation**: Access invitation statuses (pending, accepted).
