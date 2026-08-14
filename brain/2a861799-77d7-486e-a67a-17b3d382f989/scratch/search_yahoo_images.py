import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9'
}

def search_yahoo_images(query):
    print(f"\nSearching Yahoo Images for: {query}")
    url = f"https://images.search.yahoo.com/search/images?p=site%3Aimages.unsplash.com+{urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            # Look for images.unsplash.com/photo-xxxxxxxxxxxx
            matches = re.findall(r'images\.unsplash\.com/photo-([a-zA-Z0-9_-]+)', html)
            unique_ids = []
            for m in matches:
                # Yahoo search result matches might be escaped, e.g. photo-1502224562085-639556652f33
                if '-' in m and len(m) > 15:
                    clean_id = m.split('&')[0].split('%')[0].split('"')[0].split('\\')[0]
                    full_id = f"photo-{clean_id}"
                    if full_id not in unique_ids:
                        unique_ids.append(full_id)
            print(f"Found {len(unique_ids)} candidate IDs.")
            
            # Test them
            working = []
            for uid in unique_ids[:15]:
                test_url = f"https://images.unsplash.com/{uid}?auto=format&fit=crop&q=80&w=600"
                try:
                    treq = urllib.request.Request(test_url, headers=headers)
                    with urllib.request.urlopen(treq, context=ctx) as tresp:
                        if tresp.getcode() == 200:
                            working.append(test_url)
                            print(f"  -> WORKING: {test_url}")
                except:
                    pass
            return working
    except Exception as e:
        print(f"Yahoo search failed: {e}")
        return []

search_yahoo_images("farm tractor")
