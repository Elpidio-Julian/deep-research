from providers.perplexity import PerplexityProvider
from models.query import ResearchQuery
import asyncio
import sys

async def main():
    provider = None
    try:
        # Initialize provider
        provider = PerplexityProvider()
        await provider.setup()
        
        # Authenticate
        credentials = {
            'email': 'zenagent177@gmail.com'
        }
        if not await provider.authenticate(credentials):
            print("Authentication failed")
            return
            
        # Get query from command line args
        if len(sys.argv) < 2:
            print("Please provide a query as an argument")
            return
            
        query = ResearchQuery(
            prompt=sys.argv[1]
        )
        if not await provider.search(query):
            print("Failed to send query")
            return
            
        # Get response
        response_data = await provider.get_response()
        if response_data:
            print("\nResponse received successfully!")
            print("\nResponse content:")
            print("-" * 80)
            print(response_data['markdown'])
            print("-" * 80)
            print(f"\nMarkdown file saved to: {response_data['file_path']}")
        else:
            print("\nFailed to get response")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}", file=sys.stderr)
        raise
    finally:
        if provider:
            await provider.cleanup()

if __name__ == '__main__':
    asyncio.run(main()) 