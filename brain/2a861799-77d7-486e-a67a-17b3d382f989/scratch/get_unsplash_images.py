import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

queries = {
    "Tractor": "tractor",
    "Harvester": "combine harvester",
    "Rotavator": "tiller cultivator rotavator",
    "Seeder": "seed drill seeder sowing",
    "Sprayer": "agricultural sprayer crop spraying",
    "CropProtection": "tractor sprayer crop protection"
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
}

results = {}

for category, query in queries.items():
    print(f"\nSearching for '{query}' for category '{category}'...")
    url = f"https://unsplash.com/napi/search/photos?query={urllib.parse.quote(query)}&per_page=15"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # Print the IDs of the first 10 photos
            photos = data.get('results', [])
            print(f"Found {len(photos)} photos.")
            valid_photos = []
            for p in photos:
                pid = p.get('id')
                urls = p.get('urls', {})
                raw_url = urls.get('raw')
                description = p.get('description') or p.get('alt_description') or ''
                
                # Test URL
                test_url = f"https://images.unsplash.com/photo-{pid}?auto=format&fit=crop&q=80&w=600"
                try:
                    treq = urllib.request.Request(test_url, headers=headers)
                    with urllib.request.urlopen(treq, context=ctx) as tresp:
                        if tresp.getcode() == 200:
                            valid_photos.append({
                                'id': pid,
                                'url': test_url,
                                'desc': description[:60]
                            })
                except Exception as e:
                    pass
            print(f"Category '{category}' valid photos:")
            for idx, vp in enumerate(valid_photos[:8]):
                print(f"  {idx+1}. ID: {vp['id']} | Desc: {vp['desc']}")
            results[category] = valid_photos
    except Exception as e:
        print(f"Failed to search for '{query}': {e}")
