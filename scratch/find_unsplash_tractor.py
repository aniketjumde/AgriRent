import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://unsplash.com/s/photos/tractor"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

print(f"Fetching {url}...")
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as response:
        html = response.read().decode('utf-8')
    
    # Find all images.unsplash.com/photo- URLs
    matches = re.findall(r'https://images.unsplash.com/photo-[a-zA-Z0-9\-]+', html)
    unique_matches = list(set(matches))
    print(f"Found {len(unique_matches)} Unsplash photo URLs:")
    for m in unique_matches[:15]:
        print(m)
except Exception as e:
    print(f"Error: {e}")
