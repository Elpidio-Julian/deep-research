from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class ResearchQuery:
    """Standardized query model for all research providers"""
    prompt: str
    mode: str = "deep_research"  # default to deep research mode
    max_tokens: Optional[int] = None
    additional_params: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.additional_params is None:
            self.additional_params = {} 