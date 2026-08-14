import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

tractor_ids = [
    "photo-1530268578403-bf68f7fd1ad4",
    "photo-1592417817098-8f3d6eb19675",
    "photo-1502224562085-639556652f33",
    "photo-1534013414509-097d4c91e5db",
    "photo-1563514223726-6d5df4e8c15a",
    "photo-1527847263472-aa5338d178b8",
    "photo-1535443274868-756b0f070b6e"
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

for tid in tractor_ids:
    url = f"https://images.unsplash.com/{tid}?auto=format&fit=crop&q=80&w=600"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            code = response.getcode()
            print(f"{tid}: SUCCESS ({code})")
    except Exception as e:
        print(f"{tid}: FAILED: {e}")
