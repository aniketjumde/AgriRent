import urllib.request
import urllib.error

candidates = {
    "c1": "https://images.unsplash.com/photo-1605117882932-f9e32b03fea9?auto=format&fit=crop&q=80&w=600",
    "c2": "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600",
    "c3": "https://images.unsplash.com/photo-1593113630400-ea4288922497?auto=format&fit=crop&q=80&w=600",
    "c4": "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600",
    "c5": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    "c6": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
}

for name, url in candidates.items():
    try:
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"{name}: {resp.status} OK")
    except urllib.error.HTTPError as e:
        print(f"{name}: HTTP {e.code} FAIL")
    except Exception as e:
        print(f"{name}: ERROR {type(e).__name__} - {e}")
