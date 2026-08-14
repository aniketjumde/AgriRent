import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
}

def get_ids_for_query(query):
    print(f"Scraping IDs for query: {query}")
    url = f"https://html.duckduckgo.com/html/?q=site%3Aunsplash.com%2Fphotos%20{urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            # Look for unsplash.com/photos/xxxxx
            matches = re.findall(r'unsplash\.com/photos/([a-zA-Z0-9_-]+)', html)
            # Filter matches that look like ids (alphanumeric and some chars, length 8-15 usually)
            valid_ids = []
            for m in set(matches):
                if len(m) >= 5 and m != 'download':
                    valid_ids.append(m)
            print(f"Found candidate IDs: {valid_ids}")
            
            # Test which ones work as images
            working_ids = []
            for uid in valid_ids:
                # Try photo-uid or just uid
                # The images.unsplash.com endpoint usually needs the full photo-xxxxx prefix. Wait, if it's a photo-xxxxx,
                # the xxxxx is not the short alphanumeric ID, it's a timestamp + hex hash.
                # Actually, can we use the short ID in source.unsplash.com or images.unsplash.com?
                # No, source.unsplash.com is deprecated. But you can use:
                # https://images.unsplash.com/photo-1595273670150-bd0c3c392e46
                # Wait, how does images.unsplash.com handle the short alphanumeric IDs?
                # Ah! Actually, on Unsplash, if you have a short ID like "eB5Y-V1Z6A", the image source URL used is often:
                # https://images.unsplash.com/photo-1565345719914-f06b6ebc7fdb?auto=format...
                # where 1565345719914-f06b6ebc7fdb is the long ID.
                # Wait, does Unsplash allow fetching by short ID?
                # Let's check! Can we fetch by short ID like:
                # https://images.unsplash.com/photo-eB5Y-V1Z6A?auto=format... or similar?
                # Let's write a python test to check if short IDs can be used, e.g., if there's an endpoint that maps them or if we can download them.
                pass
    except Exception as e:
        print(f"Error: {e}")

get_ids_for_query("tractor")
