import re
from .recommendation import train_and_recommend
from .price_predictor import predict_price, BASE_RATES

# Response templates in Tamil, English, and Hindi
RESPONSES = {
    "en": {
        "greeting": "Hello! I am AgriRent AI Assistant. How can I help you today?",
        "recommendation": "For {crop} ({size} acres) during {task}, I recommend a **{equipment}** (Confidence: {conf}%). Estimated rental cost is **₹{cost}**.",
        "price_info": "The estimated rate for a **{equipment}** is:\n- Min: ₹{min_p}/hr\n- Recommended: ₹{rec_p}/hr\n- Max: ₹{max_p}/hr\nBased on high demand seasons.",
        "search_result": "I found these available equipment listings near {location}: {listings}. You can book them directly from your dashboard!",
        "not_found_listings": "I couldn't find any active listings in {location} right now, but you can request a booking and we'll notify nearby owners.",
        "fallback": "I'm here to help you find equipment, get price estimates, or get crop recommendations. Try asking: 'Which machine is best for paddy harvesting?' or 'What is the rent for a tractor in Coimbatore?'"
    },
    "ta": {
        "greeting": "வணக்கம்! நான் அக்ரிரென்ட் AI உதவியாளர். உங்களுக்கு இன்று நான் எவ்வாறு உதவ வேண்டும்?",
        "recommendation": "{crop} பயிருக்கு ({size} ஏக்கர்) {task} செய்ய, நான் **{equipment}** பரிந்துரைக்கிறேன் (நம்பிக்கை: {conf}%). மதிப்பிடப்பட்ட வாடகை செலவு **₹{cost}** ஆகும்.",
        "price_info": "**{equipment}**-க்கான வாடகை விகிதம்:\n- குறைந்தபட்சம்: ₹{min_p}/மணிக்கு\n- பரிந்துரைக்கப்படுவது: ₹{rec_p}/மணிக்கு\n- அதிகபட்சம்: ₹{max_p}/மணிக்கு\nஅதிக தேவை உள்ள காலங்களின் அடிப்படையில்.",
        "search_result": "{location} அருகே வாடகைக்கு கிடைக்கும் கருவிகள்: {listings}. இவற்றை உங்கள் டேஷ்போர்டில் இருந்து நேரடியாக பதிவு செய்யலாம்!",
        "not_found_listings": "தற்போது {location} பகுதியில் கருவிகள் எதுவும் கிடைக்கவில்லை, ஆனால் நீங்கள் கோரிக்கையை சமர்ப்பிக்கலாம்.",
        "fallback": "உங்களுக்கு தேவையான கருவிகள், வாடகை விவரங்கள் அல்லது பயிர் பரிந்துரைகளை வழங்க நான் தயாராக உள்ளேன். 'நெல் அறுவடைக்கு எந்த இயந்திரம் சிறந்தது?' அல்லது 'கோயம்புத்தூரில் டிராக்டர் வாடகை எவ்வளவு?' என்று கேட்கவும்."
    },
    "hi": {
        "greeting": "नमस्ते! मैं एग्रीरेंट एआई सहायक हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
        "recommendation": "{crop} फसल ({size} एकड़) के लिए {task} के दौरान, मैं **{equipment}** की सलाह देता हूँ (विश्वास: {conf}%। अनुमानित किराया **₹{cost}** है।",
        "price_info": "**{equipment}** के लिए अनुमानित किराया दर:\n- न्यूनतम: ₹{min_p}/घंटा\n- अनुशंसित: ₹{rec_p}/घंटा\n- अधिकतम: ₹{max_p}/घंटा\n(उच्च मांग मौसम के आधार पर)",
        "search_result": "{location} के पास उपलब्ध कृषि उपकरण: {listings}। आप इन्हें सीधे बुक कर सकते हैं!",
        "not_found_listings": "अभी {location} में कोई सक्रिय उपकरण नहीं मिला, लेकिन आप बुकिंग अनुरोध भेज सकते हैं।",
        "fallback": "मैं कृषि उपकरण ढूंढने, किराए के अनुमान और फसल सिफारिशों में मदद कर सकता हूँ। पूछें: 'धान कटाई के लिए कौन सा उपकरण उपयुक्त है?' या 'कोयंबटूर में ट्रैक्टर का किराया क्या है?'"
    }
}


def detect_language(text):
    """Detects whether text is in Tamil, Hindi, or English (default)."""
    # Tamil Unicode block: \u0b80-\u0bff
    if re.search(r'[\u0b80-\u0bff]', text):
        return "ta"
    # Hindi/Devanagari Unicode block: \u0900-\u097f
    elif re.search(r'[\u0900-\u097f]', text):
        return "hi"
    
    # Check for Tanglish or Hinglish words
    text_lower = text.lower()
    tanglish_words = ["naalaiku", "inniku", "vaadagai", "vaadakai", "vandi", "venum", "irukka", "engae"]
    hinglish_words = ["chahiye", "kiraya", "milega", "kahan", "tractor chahiye", "kitna"]
    
    if any(w in text_lower for w in tanglish_words):
        return "ta"
    if any(w in text_lower for w in hinglish_words):
        return "hi"
        
    return "en"


def query_assistant(user_message, active_listings_func=None):
    """
    Main entry point for assistant chat logic.
    Parses user queries and returns answers in Tamil, Hindi, or English.
    """
    lang = detect_language(user_message)
    msg_lower = user_message.lower()
    
    # Intent 1: Check Suitability / Recommendations
    # Matches: paddy, wheat, sugarcane, maize, harvest, sow, till, seed
    crop_match = None
    for crop in ["paddy", "wheat", "sugarcane", "maize", "vegetable", "நெல்", "கோதுமை", "கரும்பு", "धान", "गेहूं"]:
        if crop in msg_lower:
            crop_match = crop
            break
            
    task_match = "Harvesting"
    if any(k in msg_lower for k in ["till", "plough", "rotavat", "உழவு", "ஜோதனா"]):
        task_match = "Tilling"
    elif any(k in msg_lower for k in ["sow", "seed", "plant", "விதை", "बोना"]):
        task_match = "Sowing"
    elif any(k in msg_lower for k in ["spray", "pesticide", "மருந்து", "छिड़क"]):
        task_match = "Spraying"

    # Translate input keywords to english standard for recommendation model
    english_crop_map = {
        "நெல்": "Paddy", "धान": "Paddy", "paddy": "Paddy",
        "கோதுமை": "Wheat", "गेहूं": "Wheat", "wheat": "Wheat",
        "கரும்பு": "Sugarcane", "sugarcane": "Sugarcane",
        "maize": "Maize", "vegetable": "Vegetables"
    }
    
    if crop_match:
        std_crop = english_crop_map.get(crop_match, "Paddy")
        # Estimate land size, default to 5 acres if not mentioned
        land_size = 5.0
        size_digits = re.search(r'(\d+)\s*(acre|ஏக்கர்|एकड़)', msg_lower)
        if size_digits:
            land_size = float(size_digits.group(1))
            
        rec = train_and_recommend(std_crop, land_size, task_match)
        
        # Translate categories to user language if needed (optional, using standard terms is fine)
        return RESPONSES[lang]["recommendation"].format(
            crop=std_crop,
            size=land_size,
            task=task_match,
            equipment=rec["recommended_category"],
            conf=int(rec["confidence_score"] * 100),
            cost=rec["estimated_rental_cost"]
        )

    # Intent 2: Price Check
    # Matches: cost, price, rent, vaadagai, vaadakai, kiraya, rates
    price_keywords = ["cost", "price", "rent", "vaadagai", "vaadakai", "kiraya", "rates", "வாடகை", "விலை", "किराया", "रेट"]
    if any(k in msg_lower for k in price_keywords):
        # Match equipment category
        matched_equip = "Tractor"
        for equip, keywords in {
            "Tractor": ["tractor", "டிராக்டர்", "ट्रैक्टर"],
            "Harvester": ["harvester", "அறுவடை", "हार्वेस्टर"],
            "Rotavator": ["rotavator", "ரோட்டவேட்டர்", "रोटावेटर"],
            "Seeder": ["seeder", "விதைப்பான்", "सीडर"],
            "Sprayer": ["sprayer", "தெளிப்பான்", "स्प्रेयर"],
            "Crop Protection Equipment": ["protection", "பயிர் பாதுகாப்பு", "फसल सुरक्षा"]
        }.items():
            if any(k in msg_lower for k in keywords):
                matched_equip = equip
                break
                
        # Predict price bounds
        prices = predict_price(matched_equip, "Medium", "Harvesting")
        return RESPONSES[lang]["price_info"].format(
            equipment=matched_equip,
            min_p=prices["min_price"],
            rec_p=prices["recommended_price"],
            max_p=prices["max_price"]
        )

    # Intent 3: Find Listings / Near location
    # Matches: near, location names
    locations = ["coimbatore", "salem", "pollachi", "madurai", "chennai", "trichy", "thanjavur", "erode", "tiruppur"]
    matched_loc = None
    for loc in locations:
        if loc in msg_lower:
            matched_loc = loc.capitalize()
            break
            
    if matched_loc:
        if active_listings_func:
            listings_str = active_listings_func(matched_loc)
            if listings_str:
                return RESPONSES[lang]["search_result"].format(location=matched_loc, listings=listings_str)
        
        # Simulated fallback list if function is unavailable or no DB query
        simulated_equip = f"John Deere Tractor (₹750/hr), Sonalika Rotavator (₹900/hr) near {matched_loc}"
        return RESPONSES[lang]["search_result"].format(location=matched_loc, listings=simulated_equip)

    # Check for general greetings
    greetings = ["hi", "hello", "hey", "வணக்கம்", "नमस्ते", "namaste", "vanakkam"]
    if any(g in msg_lower for g in greetings):
        return RESPONSES[lang]["greeting"]
        
    return RESPONSES[lang]["fallback"]
