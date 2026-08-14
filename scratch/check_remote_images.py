import urllib.request
import urllib.error

urls = {
    "Tractor (fallback)": "https://images.unsplash.com/photo-1533514114760-4389f572ae26?auto=format&fit=crop&q=80&w=600",
    "Harvester (fallback)": "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    "Rotavator (fallback)": "https://images.unsplash.com/photo-1622354972196-1fc511755123?auto=format&fit=crop&q=80&w=600",
    "Seeder (fallback)": "https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&q=80&w=600",
    "Sprayer (fallback)": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600",
    "Crop Protection (fallback)": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
    "Other (fallback)": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
    "LandingPage listing 1": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
    "LandingPage listing 2": "https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=600",
    "LandingPage listing 3": "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600",
    "LandingPage listing 4": "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=600",
    "LandingPage listing 5": "https://images.unsplash.com/photo-1563514220747-a33533927499?auto=format&fit=crop&q=80&w=600",
}

for name, url in urls.items():
    try:
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"{name}: {resp.status} OK")
    except urllib.error.HTTPError as e:
        print(f"{name}: HTTP {e.code} FAIL")
    except Exception as e:
        print(f"{name}: ERROR {type(e).__name__} - {e}")
