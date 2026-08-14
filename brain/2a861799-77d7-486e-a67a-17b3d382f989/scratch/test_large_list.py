import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Let's test a very large list of typical agricultural IDs
candidates = [
    # Tractors
    "photo-1533514114760-4389f572ae26",
    "photo-1502224562085-639556652f33",
    "photo-1527847263472-aa5338d178b8",
    "photo-1535443274868-756b0f070b6e",
    "photo-1593113630400-ea4288922497",
    "photo-1472120435166-58716a84cb0d",
    "photo-1614002206663-eecb8c0e5a87",
    "photo-1511520118069-70138944cc1a",
    "photo-1589923188900-85dae523342b",
    "photo-1605335198083-d944c688ee9c",
    "photo-1592417817098-8f3d6eb19675",
    "photo-1508808787069-423e16bd8118",
    "photo-1563514223726-6d5df4e8c15a",
    "photo-1618218168350-127905f5f40b",
    "photo-1534013414509-097d4c91e5db",
    "photo-1486754896245-56d1dfef3854",
    "photo-1500937386664-56d1dfef3854", # Wheat field
    # Harvesters
    "photo-1595273670150-bd0c3c392e46",
    "photo-1601004890684-d8cbf643f5f2",
    "photo-1565345719914-f06b6ebc7fdb",
    "photo-1600697395593-e9dc66797b43",
    "photo-1594142404563-64ccc95acab0",
    "photo-1579705749718-d4cbf643f5f3",
    "photo-1574943320219-555e2157551a",
    # Rotavators / Tillers
    "photo-1578328819058-b69f3a3b0f6b",
    "photo-1622383563227-04401ab4e5ea",
    "photo-1618218168350-127905f5f40b",
    "photo-1589923188900-85dae523342b",
    # Seeders
    "photo-1586771107445-d3ca888129ff",
    "photo-1605335198083-d944c688ee9c",
    "photo-1617300305886-f8a7e0a8ad68",
    # Sprayers
    "photo-1599940824399-b87987ceb72a",
    "photo-1592417817098-8f3d6eb19675",
    "photo-1574323347407-f5e1ad6d020b",
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
}

working = []
for tid in candidates:
    url = f"https://images.unsplash.com/{tid}?auto=format&fit=crop&q=80&w=600"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            if response.getcode() == 200:
                working.append(tid)
                print(f"SUCCESS: {tid}")
    except Exception as e:
        pass

print(f"\nTotal working: {len(working)}")
print(working)
