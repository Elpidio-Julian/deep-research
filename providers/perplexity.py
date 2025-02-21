from .base_provider import BaseProvider
from models.query import ResearchQuery
from pathlib import Path
import os
import time
import threading
from queue import Queue

def get_input_with_timeout(prompt, timeout):
    """Get user input with a timeout"""
    print(f"\n{prompt} (timeout in {timeout} seconds)")
    
    input_queue = Queue()
    def input_thread():
        try:
            text = input()
            input_queue.put(text)
        except:
            input_queue.put(None)
    
    thread = threading.Thread(target=input_thread)
    thread.daemon = True
    thread.start()
    
    try:
        return input_queue.get(timeout=timeout)
    except:
        print("\nTimeout reached! No authentication code provided.")
        return None

class PerplexityProvider(BaseProvider):
    def __init__(self):
        super().__init__()
        self.base_url = "https://perplexity.ai"
    
    async def setup(self):
        """One-time setup for the provider"""
        await super().initialize()
        if not await self.navigate(self.base_url):
            raise Exception("Failed to navigate to Perplexity")
    
    async def authenticate(self, credentials: dict):
        """Implement Perplexity-specific authentication"""
        if not self.browser or not self.page:
            raise Exception("Browser not initialized. Call setup() first")
            
        try:
            # Find and click login button
            login_button = await self.page.find("Log in", best_match=True)
            if not login_button:
                raise Exception("Could not find login button")
            
            print("Found login button, clicking...")
            await login_button.click()
            await self.page.sleep(2)
            
            # Find and fill email input
            email_input = await self.page.find("email", best_match=True)
            if not email_input:
                raise Exception("Could not find email input field")
            
            print("Found email input field, entering email...")
            await email_input.send_keys(credentials.get('email'))
            
            # Find and click continue button
            submit_button = await self.page.find("Continue with email", best_match=True)
            if not submit_button:
                submit_button = await self.page.find("Continue with Email", best_match=True)
            
            if not submit_button:
                raise Exception("Could not find continue button")
            
            print("Found continue button, clicking...")
            await submit_button.click()
            print("Magic link should be sent to your email")
            
            # Wait for user to input the authentication code
            auth_code = get_input_with_timeout("Please enter the authentication code from your email:", 300)
            if not auth_code:
                raise Exception("No authentication code provided within timeout period")
            
            # Find and click enter code manually button
            enter_code_button = await self.page.find("Enter code manually", best_match=True)
            if not enter_code_button:
                raise Exception("Could not find 'Enter code manually' button")
            
            print("Found enter code button, clicking...")
            await enter_code_button.click()
            await self.page.sleep(1)
            
            # Find and fill code input
            code_input = await self.page.find(text="Enter Code", best_match=True)
            if not code_input:
                raise Exception("Could not find code input field")
            
            print(f"Found code input field, entering code: {auth_code}")
            await code_input.mouse_click()
            await self.page.sleep(0.5)
            await code_input.send_keys(auth_code)
            print("Code entered, waiting for authentication...")
            
            # Wait for authentication to complete
            await self.page.sleep(2)
            return True
            
        except Exception as e:
            print(f"Perplexity authentication failed: {str(e)}")
            return False
    
    async def search(self, query: ResearchQuery):
        """Implement Perplexity-specific search"""
        if not self.browser or not self.page:
            raise Exception("Browser not initialized. Call setup() first")
            
        try:
            # Set to Deep Research mode
            mode_selector = await self.page.find("Auto", best_match=True)
            if mode_selector:
                await mode_selector.click()
                await self.page.sleep(1)
                
                deep_research = await self.page.find("Deep Research", best_match=True)
                if deep_research:
                    await deep_research.click()
                    await self.page.sleep(1)
            
            # Enter and submit query
            prompt_input = await self.page.find("Ask anything...", best_match=True)
            if prompt_input:
                await prompt_input.send_keys(query.prompt)
                submit_button = await self.page.find("Submit", best_match=True)
                if submit_button:
                    await submit_button.click()
                    return True
            return False
        except Exception as e:
            print(f"Perplexity search failed: {str(e)}")
            return False

    async def wait_for_export_button(self, timeout_seconds=240, check_interval=1):
        """Wait for Export button to appear, indicating response is complete"""
        start_time = time.time()
        last_log_time = start_time
        log_interval = 30  # Log status every 30 seconds
        
        while time.time() - start_time < timeout_seconds:
            export_button = await self.page.find("Export", best_match=True)
            if export_button:
                elapsed = int(time.time() - start_time)
                print(f"Response completed after {elapsed} seconds")
                return export_button
                
            # Log progress periodically
            current_time = time.time()
            if current_time - last_log_time >= log_interval:
                elapsed = int(current_time - start_time)
                print(f"Waiting for response... ({elapsed} seconds elapsed)")
                last_log_time = current_time
            
            await self.page.sleep(check_interval)
        
        total_time = int(time.time() - start_time)
        raise TimeoutError(f"Response did not complete within timeout period ({total_time} seconds)")
    
    async def get_response(self):
        """Get response and sources in markdown format"""
        if not self.browser or not self.page:
            raise Exception("Browser not initialized. Call setup() first")
            
        try:
            # 1. Set up downloads directory
            downloads_dir = Path(os.getcwd()) / "downloads"
            downloads_dir.mkdir(exist_ok=True)
            await self.page.set_download_path(downloads_dir)
            
            # 2. Wait for response to complete by checking URL changes
            start_time = time.time()
            timeout_seconds = 420  # 7 minutes
            check_interval = 8  # Check every 8 seconds
            
            print("Waiting for response to complete...")
            
            while time.time() - start_time < timeout_seconds:
                current_url = await self.page.evaluate("window.location.href")
                elapsed = int(time.time() - start_time)
                
                # If URL no longer contains new?q=pending, response is complete
                if "new?q=pending" not in current_url:
                    print(f"\nResponse completed after {elapsed}s, attempting to export...")
                    await self.page.sleep(2)  # Small delay to ensure UI is ready
                    
                    # Try the export flow
                    export_button = await self.page.find("Export", best_match=True)
                    if export_button:
                        print("Found export button, clicking...")
                        await export_button.click()
                        await self.page.sleep(2)
                        
                        markdown_option = await self.page.find("Markdown", best_match=True)
                        if markdown_option:
                            print("Found Markdown option, clicking...")
                            await markdown_option.click()
                            await self.page.sleep(3)
                            
                            # Check for markdown files
                            markdown_files = list(downloads_dir.glob("*.md"))
                            if markdown_files:
                                latest_file = max(markdown_files, key=lambda x: x.stat().st_ctime)
                                file_time = latest_file.stat().st_ctime
                                
                                if file_time > start_time:
                                    print("Successfully downloaded and read markdown file")
                                    content = latest_file.read_text(encoding='utf-8')
                                    return {
                                        'markdown': content,
                                        'file_path': str(latest_file)
                                    }
                
                # Log progress every 30 seconds
                if elapsed % 30 == 0:
                    print(f"Waiting for response... ({elapsed}s)")
                
                await self.page.sleep(check_interval)
            
            raise TimeoutError(f"Response did not complete within timeout period ({timeout_seconds} seconds)")
                
        except Exception as e:
            print(f"Failed to get response: {str(e)}")
            return None 