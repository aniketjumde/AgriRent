import re
from .recommendation import train_and_recommend
from .price_predictor import predict_price, BASE_RATES

# Response templates in Tamil, English, and Hindi

# --- KNOWLEDGE BASE INTEGRATION (docs/chatbot_knowledge/) ---
FAQ_RULES = [
    # Escrow & Payments
    {
        "keywords": ["escrow", "safe", "payment", "money", "refund", "பணம்", "பாதுகாப்ப", "ரிபண்ட்", "भुगतान", "सुरक्षित", "रिफंड", "पैसे"],
        "responses": {
            "en": "AgriRent uses automated escrow protection. Your payment stays securely held in escrow until field operations are completed and verified by you. If a booking is cancelled or declined, funds are immediately marked as Refunded.",
            "ta": "அக்ரிரென்ட் எஸ்க்ரோ (Escrow) பாதுகாப்பு முறைமையை பயன்படுத்துகிறது. உங்கள் பணம் வயல் வேலைகள் முடிந்து நீங்கள் சரிபார்க்கும் வரை பாதுகாப்பாக இருக்கும். முன்பதிவு ரத்து செய்யப்பட்டால் பணம் உடனடியாக திருப்பித் தரப்படும்.",
            "hi": "एग्रीरेंट एस्क्रो सुरक्षा प्रणाली का उपयोग करता है। खेत का काम पूरा होने और आपके सत्यापन तक आपकी राशि सुरक्षित रहती है। बुकिंग रद्द होने पर तुरंत रिफंड मिलता है।"
        }
    },
    # Driver / Operator Assistance
    {
        "keywords": ["operator", "driver", "driver chahiye", "driver venum", "ஓட்டுநர்", "டிரைவர்", "ड्राइवर", "ऑपरेटर"],
        "responses": {
            "en": "You can get a certified equipment operator! Simply check 'Requires Operator' when booking. Once the owner approves, our AI proximity dispatch automatically assigns a qualified nearby driver to collect the machine and drive to your field.",
            "ta": "சான்றளிக்கப்பட்ட ஓட்டுநரை பெறலாம்! முன்பதிவின் போது 'Requires Operator' என்பதைத் தேர்ந்தெடுக்கவும். உரிமையாளர் ஒப்புதல் அளித்ததும் அருகிலுள்ள தகுதியான ஓட்டுநருக்கு பணி ஒதுக்கப்படும்.",
            "hi": "आप प्रमाणित ऑपरेटर प्राप्त कर सकते हैं! बुकिंग के समय 'Requires Operator' चुनें। मालिक की मंजूरी के बाद निकटतम प्रमाणित ड्राइवर को काम सौंप दिया जाएगा।"
        }
    },
    # Multi-party Chat / Messaging
    {
        "keywords": ["chat", "message", "contact owner", "talk", "செய்தி", "உரிமையாள", "संदेश", "बात", "चैट"],
        "responses": {
            "en": "To communicate, go to 'My Bookings' on your Dashboard and click the 'Chat' button. This opens the multi-party messaging window allowing Farmers, Equipment Owners, and Drivers to coordinate timing and field access.",
            "ta": "தொடர்பு கொள்ள, உங்கள் டேஷ்போர்டில் 'My Bookings' சென்று 'Chat' பொத்தானை அழுத்தவும். இதன் மூலம் நீங்கள் உரிமையாளர் மற்றும் ஓட்டுநருடன் நேரடியாக பேசலாம்.",
            "hi": "बातचीत करने के लिए डैशबोर्ड में 'My Bookings' पर जाएं और 'Chat' बटन पर क्लिक करें। इससे मैसेजिंग विंडो खुलेगी जहाँ आप मालिक और ड्राइवर से सीधे संपर्क कर सकते हैं।"
        }
    },
    # Cancellation & Refund
    {
        "keywords": ["cancel", "cancellation", "ரத்து", "रद्द"],
        "responses": {
            "en": "You can cancel a booking while it is in 'Pending' or 'Approved' status by clicking 'Cancel Rent' in your Dashboard. Equipment availability is instantly unlocked and your payment is marked as Refunded.",
            "ta": "முன்பதிவு 'Pending' அல்லது 'Approved' நிலையில் இருக்கும்போது 'Cancel Rent' கிளிக் செய்து ரத்து செய்யலாம். உங்கள் பணம் உடனடியாக திருப்பித் தரப்படும்.",
            "hi": "बुकिंग 'Pending' या 'Approved' स्थिति में होने पर 'Cancel Rent' पर क्लिक करके रद्द कर सकते हैं। आपका पूरा भुगतान तुरंत रिफंड कर दिया जाएगा।"
        }
    },
    # How to Book
    {
        "keywords": ["how to book", "book equipment", "reserve", "முன்பதிவு செய்வது எப்படி", "बुक कैसे करें", "बुकिंग"],
        "responses": {
            "en": "To book equipment: 1. Go to Machinery Discovery, 2. Choose your machine and radius, 3. Click 'View Details & Reserve' or use the AI Match Advisor, 4. Confirm your dates and click 'Review & Book' to place your reservation.",
            "ta": "இயந்திரத்தை பதிவு செய்ய: 1. Machinery Discovery செல்லவும், 2. தேவையான இயந்திரத்தைத் தேர்வு செய்யவும், 3. 'View Details & Reserve' கிளிக் செய்து, 4. தேதிகளை உறுதிசெய்து 'Review & Book' அழுத்தவும்.",
            "hi": "उपकरण बुक करने के लिए: 1. Machinery Discovery पर जाएं, 2. उपकरण और दायरा चुनें, 3. 'View Details & Reserve' पर क्लिक करें, 4. दिनांक पुष्टि करके 'Review & Book' दबाएं।"
        }
    }
]

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

    # Check Knowledge Base FAQs
    for rule in FAQ_RULES:
        if any(k in msg_lower for k in rule["keywords"]):
            return rule["responses"][lang]

    # Check for general greetings
    greetings = ["hi", "hello", "hey", "வணக்கம்", "नमस्ते", "namaste", "vanakkam"]
    if any(g in msg_lower for g in greetings):
        return RESPONSES[lang]["greeting"]
        
    return RESPONSES[lang]["fallback"]
