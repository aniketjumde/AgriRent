import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

candidates = [
    "photo-1591732646343-6905581534b8",
    "photo-1523348837708-15d4a09cfacb",
    "photo-1625246333195-78d9c38ad449",
    "photo-1574943320219-555e2157551a",
    "photo-1464967569081-adaf461b4ea5",
    "photo-1509114397022-ed747cca3f65",
    "photo-1516253593875-bd7ba052fbc5",
    "photo-1533514114760-4389f572ae26"
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

for tid in candidates:
    url = f"https://images.unsplash.com/{tid}?auto=format&fit=crop&q=80&w=600"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            code = response.getcode()
            print(f"{tid}: SUCCESS ({code})")
    except Exception as e:
        print(f"{tid}: FAILED: {e}")
