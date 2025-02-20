from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict

class ResearchStatus(Enum):
    """Status of a research query"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class ResearchResponse:
    """Tracks the state and output of a research query"""
    query: str
    provider: str
    status: ResearchStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    markdown_path: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
    
    def mark_completed(self, markdown_path: str):
        """Mark the research as completed with the path to the markdown file"""
        self.status = ResearchStatus.COMPLETED
        self.completed_at = datetime.now()
        self.markdown_path = markdown_path
    
    def mark_failed(self, error: str):
        """Mark the research as failed with an error message"""
        self.status = ResearchStatus.FAILED
        self.completed_at = datetime.now()
        self.error = error
    
    def to_dict(self) -> dict:
        """Convert response to dictionary for serialization"""
        return {
            "query": self.query,
            "provider": self.provider,
            "status": self.status.value,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "markdown_path": self.markdown_path,
            "error": self.error,
            "metadata": self.metadata
        } 