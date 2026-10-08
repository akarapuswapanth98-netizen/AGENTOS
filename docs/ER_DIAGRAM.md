# AGENTOS ER diagram

All foreign keys carry `ON DELETE CASCADE`, so deleting a goal removes its
tasks, submissions, traces, skill scores, snapshots, and interviews. The
routers also delete explicitly, so SQLite behaves the same without relying on
`PRAGMA foreign_keys`.

```mermaid
erDiagram
    users ||--o{ goals : owns
    users ||--o{ interview_sessions : owns
    users ||--o{ resume_analyses : analyzes
    users ||--o{ review_items : reviews
    users ||--o{ quiz_attempts : quizzes
    users ||--o{ activity_days : streaks
    users ||--o{ user_badges : earns
    goals ||--o{ tasks : has
    goals ||--o{ agent_traces : logs
    goals ||--o{ skill_scores : tracks
    goals ||--o{ readiness_snapshots : trends
    goals ||--o{ interview_sessions : interviews
    goals ||--o{ resume_analyses : compared
    goals ||--o{ review_items : practices
    goals ||--o{ quiz_attempts : tested
    tasks ||--o{ submissions : answers
    interview_sessions ||--o{ interview_questions : asks

    users {
        int id PK
        string name
        string email UK
        string password_hash
        datetime created_at
    }
    goals {
        int id PK
        int user_id FK
        string title
        string target_role
        int timeline_days
        json current_skills
        string status
        json analysis
        datetime created_at
    }
    tasks {
        int id PK
        int goal_id FK
        string title
        text description
        int week
        int order
        string task_type
        string skill
        string status
        int score
        int attempts
        datetime due_date
        datetime completed_at
        datetime created_at
    }
    submissions {
        int id PK
        int task_id FK
        text answer_text
        int score
        json feedback
        datetime created_at
    }
    agent_traces {
        int id PK
        int goal_id FK
        string agent_name
        string message
        string status
        datetime created_at
    }
    skill_scores {
        int id PK
        int goal_id FK
        string skill
        float score
        datetime updated_at
    }
    interview_sessions {
        int id PK
        int user_id FK
        int goal_id FK
        string role
        string status
        int overall_score
        datetime created_at
        datetime completed_at
    }
    interview_questions {
        int id PK
        int session_id FK
        string round_name
        string question_text
        int order
        string skill
        text answer_text
        int score
        json feedback
    }
    readiness_snapshots {
        int id PK
        int goal_id FK
        date date
        int score
    }
    resume_analyses {
        int id PK
        int user_id FK
        int goal_id FK_NULL
        json detected_skills
        json skill_gaps
        int score
        json feedback
        datetime created_at
    }
    review_items {
        int id PK
        int user_id FK
        int goal_id FK_NULL
        string skill
        int stage
        date due_date
        int last_score
        datetime last_reviewed_at
        datetime created_at
    }
    quiz_attempts {
        int id PK
        int user_id FK
        int goal_id FK_NULL
        string skill
        json questions
        json answers
        int score
        string status
        datetime started_at
        datetime submitted_at
        int elapsed_seconds
        bool timed_out
        datetime created_at
    }
    activity_days {
        int id PK
        int user_id FK
        date day
        datetime created_at
    }
    user_badges {
        int id PK
        int user_id FK
        string badge
        datetime awarded_at
    }
```

Hot paths are indexed: every `user_id` / `goal_id` / `session_id` / `task_id`
foreign key, every `status` column, plus composites
`tasks(goal_id, status)`, `tasks(goal_id, due_date)` and
`readiness_snapshots(goal_id, date)`.
Ids use `AUTOINCREMENT` on SQLite so deleted row ids are never reused.
Schema changes ship as Alembic migrations in `backend/alembic/versions/`.
