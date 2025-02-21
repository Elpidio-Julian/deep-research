import asyncio
import sys
import os
import shutil
from pathlib import Path
from providers.perplexity import PerplexityProvider
from models.query import ResearchQuery

async def main(query_str: str):
    provider = None
    try:
        print("\nInitializing Perplexity provider...")
        
        # Initialize provider
        provider = PerplexityProvider()
        await provider.setup()
        
        # Set up fixed output path
        output_path = Path('perplexity-output.md')
        
        # Remove existing output file if it exists
        if output_path.exists():
            output_path.unlink()
        
        # Authenticate
        credentials = {
            'email': 'zenagent177@gmail.com'
        }
        print("\nAuthenticating with email:", credentials['email'])
        print("\nPlease provide the auth code, timeout in 300 seconds")
        if not await provider.authenticate(credentials):
            print("\nAuthentication failed")
            return
            
        print("\nAuthentication successful!")
        print("\nSending query to Perplexity...")
            
        # Create and send query
        query = ResearchQuery(prompt=query_str)
        if not await provider.search(query):
            print("\nFailed to send query")
            return
            
        # Get response
        print("\nGetting response from Perplexity...")
        response_data = await provider.get_response()
        
        if response_data:
            print("\nResponse received successfully!")
            print("\nResponse content:")
            print("-" * 80)
            print(response_data['markdown'])
            print("-" * 80)
            
            # Copy the downloaded file to our fixed location
            shutil.copy2(response_data['file_path'], output_path)
            
            print(f"\nMarkdown file saved to: {output_path}")
            # Print just the file path for the TypeScript process
            print(output_path)
        else:
            print("\nFailed to get response")
        
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
        raise
    finally:
        if provider:
            await provider.cleanup()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scripts/run_query.py 'your query here'")
        sys.exit(1)
    query_str = sys.argv[1]
    asyncio.run(main(query_str)) 