from abc import ABC, abstractmethod
from nodriver import start, Config

class BaseProvider(ABC):
    def __init__(self):
        self.browser = None
        self.page = None
    
    async def initialize(self, browser_config: dict = None):
        """Initialize the browser with optional provider-specific config"""
        default_config = {
            'headless': False,
            'no_sandbox': True,
            'browser_args': ['--no-sandbox', '--disable-dev-shm-usage']
        }
        
        # Merge default config with provider-specific config
        config = {**default_config, **(browser_config or {})}
        
        print(f"Starting browser for {self.__class__.__name__}...")
        self.browser = await start(config=Config(**config))
        
    async def cleanup(self):
        """Cleanup browser resources"""
        if self.browser:
            self.browser.stop()
            self.browser = None
            self.page = None
    
    @abstractmethod
    async def authenticate(self, credentials: dict):
        """Each provider must implement its own authentication"""
        pass
    
    @abstractmethod
    async def search(self, query: str):
        """Each provider must implement its own search method"""
        pass
    
    @abstractmethod
    async def get_response(self):
        """Each provider must implement its own response gathering"""
        pass
    
    async def take_screenshot(self, filename: str):
        """Shared screenshot functionality"""
        if self.page:
            await self.page.save_screenshot(f"downloads/{filename}")
    
    async def navigate(self, url: str):
        """Shared navigation with provider-specific error handling"""
        try:
            self.page = await self.browser.get(url)
            await self.page.sleep(2)  # Basic wait for load
            return True
        except Exception as e:
            print(f"Navigation failed for {self.__class__.__name__}: {str(e)}")
            return False 