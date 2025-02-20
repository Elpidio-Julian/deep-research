import asyncio
import sys
import json
import os
from providers.perplexity import PerplexityProvider
from models.query import ResearchQuery

async def main(query_str: str):
    provider = None
    try:
        # Print progress to stderr so it shows up
        print("\nInitializing Perplexity provider...", file=sys.stderr)
        
        # Initialize provider
        provider = PerplexityProvider()
        await provider.setup()
        
        # Use hardcoded credentials
        credentials = {
            'email': 'zenagent177@gmail.com'  # Hardcoded email
        }
        
        print("\nAuthenticating with email:", credentials['email'], file=sys.stderr)
        
        # Wait 2 seconds before prompting for auth code
        
        # Authenticate (will prompt for code if needed)
        print("\nPlease enter your authentication code:", file=sys.stderr)
        if not await provider.authenticate(credentials):
            print("\nAuthentication failed!", file=sys.stderr)
            sys.exit(1)
            
        print("\nAuthentication successful!", file=sys.stderr)
        print("\nSending query to Perplexity...", file=sys.stderr)
            
        # Process the research query
        query = ResearchQuery(prompt=query_str)
        if not await provider.search(query):
            print("\nSearch failed!", file=sys.stderr)
            sys.exit(1)
            
        # Get response which includes markdown content
        print("\nGetting response from Perplexity...", file=sys.stderr)
        response_data = await provider.get_response()
        
        if response_data and response_data.get('markdown'):
            # Save to perplexity-output.md in the project root
            output_path = os.path.join(os.getcwd(), 'perplexity-output.md')
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(response_data['markdown'])
            print(f"\nSaved Perplexity output to: {output_path}", file=sys.stderr)
            
            # Just print the path to stdout for the TypeScript process
            print(output_path)
        else:
            print("\nNo response data received!", file=sys.stderr)
            sys.exit(1)
        
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        if provider:
            await provider.cleanup()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scripts/run_query.py 'your query here'", file=sys.stderr)
        sys.exit(1)
    query_str = sys.argv[1]
    asyncio.run(main(query_str)) 