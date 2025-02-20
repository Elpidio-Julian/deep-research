from dataclasses import dataclass
from typing import Dict, Optional, List, Set
import json
import os
from pathlib import Path

class ProviderRequirements:
    """Defines authentication requirements for different providers"""
    
    # Define provider types
    PASSWORD_BASED = "password"
    MAGIC_LINK = "magic_link"
    
    # Map of provider IDs to their requirements
    PROVIDERS = {
        "grok": {
            "type": PASSWORD_BASED,
            "required_fields": {"email", "password"}
        },
        "perplexity": {
            "type": MAGIC_LINK,
            "required_fields": {"email"}
        }
    }
    
    @classmethod
    def get_requirements(cls, provider_id: str) -> Optional[Dict]:
        """Get requirements for a specific provider"""
        return cls.PROVIDERS.get(provider_id)
    
    @classmethod
    def register_provider(cls, provider_id: str, auth_type: str, required_fields: Set[str]):
        """Register a new provider's requirements"""
        cls.PROVIDERS[provider_id] = {
            "type": auth_type,
            "required_fields": required_fields
        }

@dataclass
class Credentials:
    """Stores provider credentials"""
    email: str
    provider: str
    password: Optional[str] = None
    additional_auth: Dict[str, str] = None
    
    def __post_init__(self):
        if self.additional_auth is None:
            self.additional_auth = {}
    
    def to_dict(self) -> dict:
        """Convert credentials to a dictionary format for providers"""
        creds = {
            'email': self.email,
            'provider': self.provider
        }
        if self.password:
            creds['password'] = self.password
        if self.additional_auth:
            creds.update(self.additional_auth)
        return creds
    
    def validate_for_provider(self, provider_id: str) -> Optional[str]:
        """Validate credentials for a specific provider"""
        if self.provider != provider_id:
            return f"Invalid provider. Expected {provider_id}, got {self.provider}"
            
        requirements = ProviderRequirements.get_requirements(provider_id)
        if not requirements:
            return f"No requirements defined for provider {provider_id}"
            
        # Check required fields
        for field in requirements["required_fields"]:
            if field == "email" and not self.email:
                return "Email is required"
            elif field == "password" and not self.password:
                return f"Password is required for {provider_id}"
            elif field not in ["email", "password"] and field not in self.additional_auth:
                return f"{field} is required for {provider_id}"
                
        return None

class CredentialManager:
    """Manages credentials for different providers"""
    
    def __init__(self, credentials_path: str = None):
        self.credentials_path = credentials_path or os.path.expanduser("~/.config/research_providers/credentials.json")
        self.credentials: Dict[str, Credentials] = {}
        self._load_credentials()
    
    def _load_credentials(self):
        """Load credentials from file"""
        path = Path(self.credentials_path)
        if path.exists():
            try:
                with open(path) as f:
                    data = json.load(f)
                    for provider, creds in data.items():
                        self.credentials[provider] = Credentials(**creds)
            except Exception as e:
                print(f"Error loading credentials: {str(e)}")
    
    def _save_credentials(self):
        """Save credentials to file"""
        path = Path(self.credentials_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert to a format safe for JSON serialization
        data = {k: v.to_dict() for k, v in self.credentials.items()}
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def get_credentials(self, provider: str) -> Optional[Credentials]:
        """Get credentials for a specific provider"""
        return self.credentials.get(provider)
    
    def get_all_credentials(self) -> List[Credentials]:
        """Get all stored credentials"""
        return list(self.credentials.values())
    
    def set_credentials(self, provider: str, credentials: Credentials):
        """Set credentials for a provider"""
        if credentials.provider != provider:
            raise ValueError(f"Provider mismatch. Got {credentials.provider}, expected {provider}")
        self.credentials[provider] = credentials
        self._save_credentials()
    
    def remove_credentials(self, provider: str):
        """Remove credentials for a provider"""
        if provider in self.credentials:
            del self.credentials[provider]
            self._save_credentials()
    
    def has_credentials(self, provider: str) -> bool:
        """Check if credentials exist for a provider"""
        return provider in self.credentials 