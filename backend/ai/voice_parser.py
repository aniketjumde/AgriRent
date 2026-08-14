import re
from datetime import datetime, timedelta

# Keyword dictionaries for Tamil, Tanglish, and English
EQUIPMENT_KEYWORDS = {
    "Tractor": ["tractor", "டிராக்டர்", "டிரக்டர்", "vandi", "வண்டி", "உழுவது", "ट्रैक्टर", "ట్రాక్టర్", "ట్రాక్టరు", "ട്രാക്ടർ", "ಟ್ರಾಕ್ಟರ್", "ಉಳುಮೆ"],
    "Harvester": ["harvester", "அறுவடை", "ஹார்வெஸ்டர்", "aruvadai", "cutting", "हार्वेस्टर", "कटाई", "హార్వెస్టర్", "కోత", "ഹാർവെസ്റ്റർ", "കൊയ്ത്ത്", "ಹಾರ್ವೆಸ್ಟರ್", "ಕೋಯ್ಲು"],
    "Rotavator": ["rotavator", "ரோட்டவேட்டர்", "ரோட்டாவேட்டர்", "rotavater", "रोटावेटर", "రోటవేటర్", "റോട്ടവേറ്റർ", "ರೋಟಾವೇಟರ್"],
    "Seeder": ["seeder", "விதைப்பான்", "seeding", "seed", "விதைக்க", "सीडर", "बुवाई", "సీడర్", "విత్తనాలు", "സീഡർ", "വിത്ത്", "ಸೀಡರ್", "ಬಿತ್ತನೆ"],
    "Sprayer": ["sprayer", "தெளிப்பான்", "மருந்து தெளிக்க", "spray", "स्प्रेयर", "छिड़काव", "స్ప్రேயర్", "పిచికారీ", "സ്പ്രേയർ", "തളിക്കാൻ", "ಸ್ಪ್ರೇಯರ್", "ಸಿಂಪಡಣೆ"],
    "Crop Protection Equipment": ["protection", "பயிர் பாதுகாப்பு", "pesticide", "பூச்சிக்கொல்லி", "कीटनाशक", "పురుగుల మందు", "കീടനാശിനി", "ಕೀಟನಾಶಕ"],
    "Other Agricultural Machinery": ["machinery", "இயந்திரம்", "machine", "कृषि उपकरण", "పరికరాలు", "ഉപകരണം", "ಉಪಕರಣ"]
}

DATES_KEYWORDS = {
    "today": ["today", "inniku", "iniku", "இன்று", "இன்னைக்கு", "inraiku", "आज", "aaj", "నేడు", "ఈరోజు", "nedu", "eroju", "ഇന്ന്", "innu", "இன்று", "இன்று", "ಇಂದು", "indu"],
    "tomorrow": ["tomorrow", "naalaiku", "nalaiku", "நாளை", "நாளைக்கு", "कल", "kal", "రేపు", "repu", "നാളെ", "nale", "ನಾಳೆ", "nale"],
    "day_after": ["day after tomorrow", "naalnalaiki", "naalai marunaal", "நாளை மறுநாள்", "மறுநாள்", "परसों", "parso", "ఎల్లుండి", "ellundi", "മറ്റന്നാൾ", "mattannal", "ನಾಡಿದ್ದು", "nadiddu"],
    "next_week": ["next week", "adutha vaaram", "அடுத்த வாரம்", "adutha varam", "अगले हफ्ते", "agla hafta", "వచ్చే వారం", "vacche varam", "അടുത്ത ആഴ്ച", "adutha azhcha", "ಮುಂದಿನ ವಾರ", "mundina vara"]
}

TAMIL_MONTHS = {
    "சித்திரை": 4, "வைகாசி": 5, "ஆனி": 6, "ஆடி": 7, "ஆவணி": 8, "புரட்டாசி": 9,
    "ஐப்பசி": 10, "கார்த்திகை": 11, "மார்கழி": 12, "தை": 1, "மாசி": 2, "பங்குனி": 3
}


def parse_voice_text(text):
    """
    Parses a speech-to-text transcript (English or Tamil) to extract
    equipment type, start date, and location.
    
    Example: "Naalaiku tractor venum Coimbatore-la"
    Returns: {
        "equipment_type": "Tractor",
        "booking_date": "2026-06-19",
        "location": "Coimbatore",
        "status": "success",
        "message": "Successfully parsed request"
    }
    """
    text_lower = text.lower()
    
    # 1. Extract Equipment Type
    extracted_equipment = None
    for category, keywords in EQUIPMENT_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                extracted_equipment = category
                break
        if extracted_equipment:
            break
            
    # Default to Tractor if none matched but we got voice input
    if not extracted_equipment:
        extracted_equipment = "Tractor"
        
    # 2. Extract Booking Date
    booking_date = datetime.today()
    date_matched = False
    
    for date_key, keywords in DATES_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                if date_key == "today":
                    booking_date = datetime.today()
                elif date_key == "tomorrow":
                    booking_date = datetime.today() + timedelta(days=1)
                elif date_key == "day_after":
                    booking_date = datetime.today() + timedelta(days=2)
                elif date_key == "next_week":
                    booking_date = datetime.today() + timedelta(days=7)
                date_matched = True
                break
        if date_matched:
            break
            
    # If no keywords matched, try matching specific days or patterns (e.g., "in 3 days")
    if not date_matched:
        days_match = re.search(r'(\d+)\s*(days|naal|naatkal|நாள்|நாட்கள்)', text_lower)
        if days_match:
            days = int(days_match.group(1))
            booking_date = datetime.today() + timedelta(days=days)
            date_matched = True
            
    if not date_matched:
        # Default to tomorrow
        booking_date = datetime.today() + timedelta(days=1)
        
    # 3. Extract Location
    # Common locations in South India/Tamil Nadu and standard cities
    locations = [
        "coimbatore", "salem", "pollachi", "madurai", "chennai", "trichy", "thanjavur",
        "erode", "tiruppur", "karur", "dindigul", "ooty", "namakkal", "dharmapuri", 
        "salem", "theni", "vellore", "kanyakumari", "delhi", "mumbai", "bengaluru"
    ]
    extracted_location = None
    for loc in locations:
        if loc in text_lower:
            extracted_location = loc.capitalize()
            break
            
    # Fallback default location if not specified
    if not extracted_location:
        extracted_location = "Coimbatore"
        
    return {
        "equipment_type": extracted_equipment,
        "booking_date": booking_date.strftime("%Y-%m-%d"),
        "location": extracted_location,
        "status": "success",
        "raw_text": text
    }
