"""Database setup and models for the SAEM AI Consensus Platform."""

from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, JSON, Enum as SQLEnum, UniqueConstraint,
    Index, event
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import enum
import os
import threading

from .config import DATABASE_URL

# --- Engine setup ---

_engine_kwargs: dict = {}

if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    _engine_kwargs["echo"] = False
else:
    # PostgreSQL (or other async-capable DB)
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["echo"] = False

engine = create_engine(DATABASE_URL, **_engine_kwargs)

# Enable WAL mode for SQLite after connect
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_wal(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
_migrations_ensured = False
_migrations_lock = threading.Lock()


# --- Enums ---

class QuestionStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CONFIRMED = "confirmed"
    NEAR_CONSENSUS = "near_consensus"
    REVISED = "revised"
    REMOVED = "removed"


class DelphiRound(enum.Enum):
    ROUND_1 = "round_1"
    ROUND_2 = "round_2"


class DispositionVote(enum.Enum):
    INCLUDE = "include"
    INCLUDE_WITH_MODIFICATIONS = "include_with_modifications"
    EXCLUDE = "exclude"


class AISynthesisType(enum.Enum):
    THEME_CLUSTERING = "theme_clustering"
    QUESTION_REVISION = "question_revision"
    NEW_QUESTION_SYNTHESIS = "new_question_synthesis"
    CROSS_WG_OVERLAP = "cross_wg_overlap"
    ROUND_SUMMARY = "round_summary"
    AGENDA_ANALYSIS = "agenda_analysis"


class HumanDecision(enum.Enum):
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    MODIFIED = "modified"
    PENDING = "pending"


# --- Core Models ---

class WorkingGroup(Base):
    __tablename__ = "working_groups"

    id = Column(Integer, primary_key=True)
    number = Column(Integer, unique=True, nullable=False)  # 1-5
    name = Column(String(200), nullable=False)
    short_name = Column(String(50), nullable=False)
    pillar = Column(String(50))  # Technology, Training, Self, Society
    scope = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    questions = relationship("Question", back_populates="working_group")
    co_leads = relationship("CoLead", back_populates="working_group")
    participants = relationship("Participant", back_populates="working_group")


class CoLead(Base):
    __tablename__ = "co_leads"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200))
    institution = Column(String(200))
    wg_id = Column(Integer, ForeignKey("working_groups.id"))

    working_group = relationship("WorkingGroup", back_populates="co_leads")


class Participant(Base):
    """Participant. `token` is the invite token / session credential.

    A participant may be anonymous (name/email null, self-created on first
    visit) or invited (name/email set by an admin, token shared as an
    invite link). `claimed_at` is set the first time an invited participant
    clicks their link.
    """
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True)
    token = Column(String(64), unique=True, nullable=False)  # invite or anonymous token
    wg_id = Column(Integer, ForeignKey("working_groups.id"))
    name = Column(String(200), nullable=True)
    email = Column(String(200), nullable=True)
    role = Column(String(100))  # EM physician, researcher, etc.
    career_stage = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    claimed_at = Column(DateTime, nullable=True)  # first click of invite link
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    delphi_responses = relationship("DelphiResponse", back_populates="participant")
    pairwise_votes = relationship("PairwiseVote", back_populates="participant")
    conference_votes = relationship("ConferenceVote", back_populates="participant")
    working_group = relationship("WorkingGroup", back_populates="participants")


# --- Questions ---

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    wg_id = Column(Integer, ForeignKey("working_groups.id"), nullable=False)
    text = Column(Text, nullable=False)
    short_text = Column(String(200))  # abbreviated for pairwise display
    version = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey("questions.id"), nullable=True)  # if revised from another
    status = Column(SQLEnum(QuestionStatus), default=QuestionStatus.DRAFT)
    source = Column(String(50))  # "kickoff", "async", "delphi_r1_suggestion", "ai_suggested"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Round results (populated after each round)
    r1_include_pct = Column(Float, nullable=True)
    r1_modify_pct = Column(Float, nullable=True)
    r1_exclude_pct = Column(Float, nullable=True)
    r1_importance_mean = Column(Float, nullable=True)
    r1_importance_median = Column(Float, nullable=True)
    r2_include_pct = Column(Float, nullable=True)
    r2_exclude_pct = Column(Float, nullable=True)
    r2_importance_mean = Column(Float, nullable=True)
    r2_importance_median = Column(Float, nullable=True)

    # Pairwise comparison results
    pairwise_wins = Column(Integer, default=0)
    pairwise_losses = Column(Integer, default=0)
    pairwise_score = Column(Float, nullable=True)  # Bayesian score 0-100

    working_group = relationship("WorkingGroup", back_populates="questions")
    parent = relationship("Question", remote_side=[id])
    delphi_responses = relationship("DelphiResponse", back_populates="question")


# --- Delphi Responses ---

class DelphiResponse(Base):
    __tablename__ = "delphi_responses"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    round = Column(SQLEnum(DelphiRound), nullable=False)
    disposition = Column(SQLEnum(DispositionVote), nullable=False)
    importance_rating = Column(Integer)  # 1-9
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("question_id", "participant_id", "round", name="uq_response"),
    )

    question = relationship("Question", back_populates="delphi_responses")
    participant = relationship("Participant", back_populates="delphi_responses")


class DelphiSuggestion(Base):
    """New questions suggested by participants in the open-ended section."""
    __tablename__ = "delphi_suggestions"

    id = Column(Integer, primary_key=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    wg_id = Column(Integer, ForeignKey("working_groups.id"), nullable=False)
    round = Column(SQLEnum(DelphiRound), nullable=False)
    suggestion_text = Column(Text, nullable=False)
    general_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # AI categorization
    ai_category = Column(String(50))  # duplicate, refinement, genuinely_new, out_of_scope
    ai_maps_to_question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    ai_suggested_wording = Column(Text, nullable=True)

    # Human review
    human_decision = Column(SQLEnum(HumanDecision), default=HumanDecision.PENDING)
    human_notes = Column(Text, nullable=True)


# --- Pairwise Comparison ---

class PairwiseVote(Base):
    __tablename__ = "pairwise_votes"

    id = Column(Integer, primary_key=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    question_a_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    question_b_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    winner_id = Column(Integer, ForeignKey("questions.id"), nullable=True)  # null = "can't decide"
    wg_id = Column(Integer, ForeignKey("working_groups.id"), nullable=False)
    response_time_ms = Column(Integer)  # how long they took to decide
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "participant_id", "question_a_id", "question_b_id", "wg_id",
            name="uq_pairwise_vote",
        ),
    )

    participant = relationship("Participant", back_populates="pairwise_votes")
    question_a = relationship("Question", foreign_keys=[question_a_id])
    question_b = relationship("Question", foreign_keys=[question_b_id])
    winner = relationship("Question", foreign_keys=[winner_id])


class PairwiseSuggestion(Base):
    """New questions suggested via the pairwise interface."""
    __tablename__ = "pairwise_suggestions"

    id = Column(Integer, primary_key=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    wg_id = Column(Integer, ForeignKey("working_groups.id"), nullable=False)
    suggestion_text = Column(Text, nullable=False)
    approved = Column(Boolean, default=False)
    reviewed_by = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- AI Synthesis ---

class AISynthesisRun(Base):
    __tablename__ = "ai_synthesis_runs"

    id = Column(Integer, primary_key=True)
    synthesis_type = Column(SQLEnum(AISynthesisType), nullable=False)
    wg_id = Column(Integer, ForeignKey("working_groups.id"), nullable=True)  # null for cross-WG
    round = Column(SQLEnum(DelphiRound), nullable=True)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(100))
    prompt_text = Column(Text, nullable=False)
    input_data = Column(Text)  # JSON of what was fed to the model
    raw_output = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("AISynthesisItem", back_populates="run")


class AISynthesisItem(Base):
    """Individual items from an AI synthesis run (e.g., each suggested revision)."""
    __tablename__ = "ai_synthesis_items"

    id = Column(Integer, primary_key=True)
    run_id = Column(Integer, ForeignKey("ai_synthesis_runs.id"), nullable=False)
    item_type = Column(String(50))  # "theme", "revision", "overlap", "gap", etc.
    content = Column(Text, nullable=False)
    related_question_ids = Column(JSON)  # list of question IDs this relates to
    human_decision = Column(SQLEnum(HumanDecision), default=HumanDecision.PENDING)
    human_reviewer = Column(String(200))
    human_notes = Column(Text)
    reviewed_at = Column(DateTime)

    run = relationship("AISynthesisRun", back_populates="items")


# --- Conference Day ---

class ConferenceSession(Base):
    __tablename__ = "conference_sessions"

    id = Column(Integer, primary_key=True)
    wg_id = Column(Integer, ForeignKey("working_groups.id"), nullable=True)  # null for cross-WG
    session_type = Column(String(50))  # "wg_presentation", "cross_wg_prioritization"
    phase = Column(String(50))  # "pre_discussion", "post_discussion"
    is_active = Column(Boolean, default=False)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConferenceVote(Base):
    __tablename__ = "conference_votes"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("conference_sessions.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    vote_type = Column(String(50))  # "ranking", "importance", "point_allocation"
    value = Column(Float, nullable=False)  # rank position, 1-9 rating, or points allocated
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "session_id", "participant_id", "vote_type",
            name="uq_conference_vote",
        ),
    )

    participant = relationship("Participant", back_populates="conference_votes")


class ConferenceComment(Base):
    __tablename__ = "conference_comments"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("conference_sessions.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=True)
    comment_text = Column(Text, nullable=False)
    comment_type = Column(String(50))  # "new_question", "modification", "general"
    created_at = Column(DateTime, default=datetime.utcnow)


class BreakoutNote(Base):
    __tablename__ = "breakout_notes"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("conference_sessions.id"), nullable=False)
    table_number = Column(Integer)
    facilitator_name = Column(String(200))
    themes = Column(Text)
    agreements = Column(Text)
    disagreements = Column(Text)
    suggestions = Column(Text)
    surprises = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- Admin ---

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True)
    email = Column(String(200), unique=True, nullable=False)
    name = Column(String(200))
    password_hash = Column(String(200), nullable=False)
    role = Column(String(50), default="co_lead")  # "admin", "co_lead", "planning_committee"
    wg_id = Column(Integer, ForeignKey("working_groups.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True)
    user_email = Column(String(200))
    action = Column(String(100))
    detail = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- Indexes for frequently queried columns ---

Index("ix_delphi_resp_q_round", DelphiResponse.question_id, DelphiResponse.round)
Index("ix_delphi_resp_participant", DelphiResponse.participant_id)
Index("ix_pairwise_vote_wg", PairwiseVote.wg_id)
Index("ix_conference_vote_session", ConferenceVote.session_id)
Index("ix_question_wg_status", Question.wg_id, Question.status)


# --- Initialize ---

def init_db():
    """Create all tables and apply lightweight additive migrations."""
    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
    Base.metadata.create_all(engine)
    _apply_additive_migrations()


def _apply_additive_migrations():
    """Add any columns defined on the ORM but missing from the live table.

    Safe, idempotent, additive-only. Runs on every startup. For larger
    schema changes use a real migration tool (e.g. Alembic).
    """
    import logging
    from sqlalchemy import inspect, text as sa_text
    log = logging.getLogger(__name__)

    inspector = inspect(engine)
    is_sqlite = DATABASE_URL.startswith("sqlite")

    # Columns to ensure exist on participants table
    desired_participant_cols = {
        "name": "VARCHAR(200)",
        "email": "VARCHAR(200)",
        "role": "VARCHAR(100)",
        "career_stage": "VARCHAR(100)",
        "claimed_at": "TIMESTAMP" if not is_sqlite else "DATETIME",
        "expires_at": "TIMESTAMP" if not is_sqlite else "DATETIME",
        "is_active": "BOOLEAN",
    }

    if "participants" in inspector.get_table_names():
        existing = {c["name"] for c in inspector.get_columns("participants")}
        added = []
        with engine.begin() as conn:
            for col, col_type in desired_participant_cols.items():
                if col not in existing:
                    try:
                        conn.execute(sa_text(f"ALTER TABLE participants ADD COLUMN {col} {col_type}"))
                        added.append(col)
                    except Exception:
                        log.exception("Failed to add column %s to participants", col)
                        raise
        if added:
            log.info("Added missing participants columns: %s", added)
        else:
            log.info("Participants schema up to date (has: %s)", sorted(existing))
    else:
        log.info("participants table not yet present; create_all will handle it")


def get_db():
    """FastAPI dependency that yields a database session."""
    global _migrations_ensured
    # Some execution paths (e.g., direct TestClient use) may skip FastAPI
    # startup hooks. Ensure additive migrations still run at least once.
    if not _migrations_ensured:
        with _migrations_lock:
            if not _migrations_ensured:
                _apply_additive_migrations()
                _migrations_ensured = True
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_working_groups(db):
    """Seed the 5 working groups if they don't exist."""
    if db.query(WorkingGroup).count() > 0:
        return

    groups = [
        WorkingGroup(
            number=1,
            name="AI in Clinical Practice and Operations",
            short_name="Clinical Practice",
            pillar="Technology",
            scope="AI-driven clinical decision support, predictive analytics, triage optimization, patient flow, resource allocation, autonomous systems in clinical workflows"
        ),
        WorkingGroup(
            number=2,
            name="AI Technology: Infrastructure and Data Ecosystems",
            short_name="Infrastructure & Data",
            pillar="Technology",
            scope="Data architectures, interoperability, governance, security, model lifecycle management, bias detection in data, translational pipeline"
        ),
        WorkingGroup(
            number=3,
            name="AI Education, Training, and Competency Development",
            short_name="Education & Training",
            pillar="Training",
            scope="AI competencies for EM professionals, curriculum development, simulation training, faculty development, assessment of AI skills"
        ),
        WorkingGroup(
            number=4,
            name="Human-AI Interaction and the Perception of Self",
            short_name="Human-AI Interaction",
            pillar="Self",
            scope="Clinician-AI interaction, cognitive effects, professional identity, burnout, patient experience of AI-involved care, trust and reliance"
        ),
        WorkingGroup(
            number=5,
            name="Ethical, Legal, and Societal Implications",
            short_name="Ethics & Legal",
            pillar="Society",
            scope="Algorithmic bias, governance models, legal liability, regulatory pathways, data privacy, health disparities, equity"
        ),
    ]
    db.add_all(groups)
    db.commit()


def write_audit_log(db, user_email: str, action: str, detail: str | None = None):
    """Write an entry to the audit log."""
    entry = AuditLog(user_email=user_email, action=action, detail=detail)
    db.add(entry)
    db.commit()
