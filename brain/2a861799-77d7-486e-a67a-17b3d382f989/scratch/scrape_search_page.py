import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}

queries = ["tractor", "combine-harvester", "tiller", "seeder", "sprayer"]

for q in queries:
    url = f"https://unsplash.com/s/photos/{q}"
    print(f"\nFetching search page for: {q} from {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            print("Fetched successfully. Extracting IDs...")
            # Look for /photos/xxxxxx-xxxx-xxxx
            # Unsplash photo pages look like: href="/photos/green-tractor-on-field-abcd123" or similar
            matches = re.findall(r'href="/photos/([^"/?\s>]+)"', html)
            unique_matches = list(set(matches))
            print(f"Found {len(unique_matches)} candidate photo paths:")
            for m in unique_matches[:15]:
                print(f"  - {m}")
    except Exception as e:
        print(f"Failed: {e}")
