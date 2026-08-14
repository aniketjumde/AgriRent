import urllib.request
import re
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
}

def get_long_ids_for_query(query, count=5):
    print(f"\n=====================================")
    print(f"Finding long IDs for query: {query}")
    print(f"=====================================")
    
    # Step 1: Search DuckDuckGo for Unsplash photo pages
    search_url = f"https://html.duckduckgo.com/html/?q=site%3Aunsplash.com%2Fphotos%20{urllib.parse.quote(query)}"
    photo_urls = []
    try:
        req = urllib.request.Request(search_url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode('utf-8')
            matches = re.findall(r'unsplash\.com/photos/([a-zA-Z0-9_-]+)', html)
            for m in matches:
                if len(m) >= 5 and m != 'download' and m not in photo_urls:
                    photo_urls.append(m)
    except Exception as e:
        print(f"Search failed: {e}")
        return []
    
    print(f"Found {len(photo_urls)} photo pages. Retrieving long IDs...")
    
    long_ids = []
    for pid in photo_urls[:12]:
        if len(long_ids) >= count:
            break
        page_url = f"https://unsplash.com/photos/{pid}"
        try:
            req = urllib.request.Request(page_url, headers=headers)
            with urllib.request.urlopen(req, context=ctx) as response:
                page_html = response.read().decode('utf-8')
                # Look for images.unsplash.com/photo-xxxxxxxxxxxxx
                image_matches = re.findall(r'images\.unsplash\.com/photo-([a-zA-Z0-9_-]+)', page_html)
                for im in image_matches:
                    # An image ID has a dash, e.g. 1595273670150-bd0c3c392e46. Let's validate structure.
                    if '-' in im and len(im) > 15:
                        full_id = f"photo-{im}"
                        # Test if this long ID actually works
                        test_url = f"https://images.unsplash.com/{full_id}?auto=format&fit=crop&q=80&w=600"
                        try:
                            treq = urllib.request.Request(test_url, headers=headers)
                            with urllib.request.urlopen(treq, context=ctx) as tresp:
                                if tresp.getcode() == 200:
                                    if full_id not in long_ids:
                                        long_ids.append(full_id)
                                        print(f"  -> Found valid ID: {full_id} (from {pid})")
                                        break
                        except:
                            pass
            time.sleep(0.5) # Be nice
        except Exception as e:
            print(f"Failed to fetch {page_url}: {e}")
            
    return long_ids

categories = {
    "Tractor": "farm tractor",
    "Harvester": "combine harvester",
    "Rotavator": "tiller cultivator",
    "Seeder": "seed drill seeder",
    "Sprayer": "agricultural sprayer",
    "CropProtection": "tractor sprayer crop protection"
}

results = {}
for cat, query in categories.items():
    results[cat] = get_long_ids_for_query(query, count=8)

print("\n\nRESULTS:")
for cat, ids in results.items():
    print(f"Category: {cat}")
    for idx, i in enumerate(ids):
        print(f"  {idx+1}: {i}")
