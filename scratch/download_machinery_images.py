import urllib.request
import ssl
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Order of fallbacks for tractor images
tractor_urls = [
    "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1533514114760-4389f572ae26?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1530268578403-bf68f7fd1ad4?auto=format&fit=crop&q=80&w=600"
]

dest_dir = "frontend/public/images"
dest_path = os.path.join(dest_dir, "tractor.jpg")
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

success = False
for url in tractor_urls:
    print(f"Trying to download tractor image from {url}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            with open(dest_path, "wb") as f:
                f.write(response.read())
        print(f"Successfully saved tractor.jpg from {url} ({os.path.getsize(dest_path)} bytes).")
        success = True
        break
    except Exception as e:
        print(f"Failed to download from {url}: {e}")

if not success:
    print("Could not download any tractor image.")
else:
    print("Tractor image download complete.")
