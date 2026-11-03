# 🔔 Raitumitra Localized Alert & Notification Service
# Handles regional translation (Telugu, Hindi, Kannada, Tamil) and Twilio SMS/WhatsApp dispatch.

import os
import json
import uuid
from datetime import datetime
try:
    from twilio.rest import Client
except ImportError:
    Client = None
from dotenv import load_dotenv

load_dotenv()

# Dictionary mapping standard crop terms, stages, and water advisories to regional Indian languages
TRANSLATIONS = {
    "english": {
        "crop": "Crop",
        "stage": "Growth Stage",
        "urgency_red": "🔴 URGENT: Irrigate {deficit:.1f}mm within 2 days to prevent crop loss.",
        "urgency_yellow": "🟡 SCHEDULED: Schedule irrigation of {deficit:.1f}mm within 4 days.",
        "urgency_green": "🟢 MONITOR: Minor water deficit. Irrigate if no rain is expected.",
        "optimal": "✅ NO IRRIGATION: Adequate soil moisture available.",
        "status_alert": "Raitumitra Alert for your field: crop={crop}, stage={stage}."
    },
    "telugu": {
        "crop": "పంట",
        "stage": "ఎదుగుదల దశ",
        "urgency_red": "🔴 అత్యవసరం: పంట నష్టాన్ని నివారించడానికి 2 రోజుల్లో {deficit:.1f} మిమీ నీటిపారుదల చేయండి.",
        "urgency_yellow": "🟡 షెడ్యూల్డ్: 4 రోజుల్లో {deficit:.1f} మిమీ నీటిపారుదలని షెడ్యూల్ చేయండి.",
        "urgency_green": "🟢 మానిటర్: స్వల్ప నీటి కొరత ఉంది. వర్షం పడకపోతే నీటిపారుదల చేయండి.",
        "optimal": "✅ నీటిపారుదల అవసరం లేదు: నేలలో తగినంత తేమ అందుబాటులో ఉంది.",
        "status_alert": "రైతుమిత్ర అలర్ట్ - మీ పొలం వివరాలు: పంట={crop}, దశ={stage}."
    },
    "hindi": {
        "crop": "फसल",
        "stage": "विकास चरण",
        "urgency_red": "🔴 तत्काल आवश्यकता: फसल नुकसान से बचने के लिए 2 दिनों के भीतर {deficit:.1f} मिमी सिंचाई करें।",
        "urgency_yellow": "🟡 निर्धारित: 4 दिनों के भीतर {deficit:.1f} मिमी सिंचाई निर्धारित करें।",
        "urgency_green": "🟢 निगरानी: मामूली पानी की कमी। यदि बारिश की उम्मीद नहीं है तो सिंचाई करें।",
        "optimal": "✅ सिंचाई की आवश्यकता नहीं: मिट्टी में पर्याप्त नमी उपलब्ध है।",
        "status_alert": "रैतुमित्र अलर्ट - आपके खेत की जानकारी: फसल={crop}, चरण={stage}."
    },
    "kannada": {
        "crop": "ಬೆಳೆ",
        "stage": "ಬೆಳವಣಿಗೆಯ ಹಂತ",
        "urgency_red": "🔴 ತುರ್ತು: ಬೆಳೆ ನಷ್ಟ ತಡೆಯಲು 2 ದಿನಗಳಲ್ಲಿ {deficit:.1f} ಮಿಮೀ ನೀರಾವರಿ ಮಾಡಿ.",
        "urgency_yellow": "🟡 ನಿಗದಿತ: 4 ದಿನಗಳಲ್ಲಿ {deficit:.1f} ಮಿಮೀ ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿಯನ್ನು ನಿಗದಿಪಡಿಸಿ.",
        "urgency_green": "🟢 ಮೇಲ್ವಿಚಾರಣೆ: ಸಣ್ಣ ಪ್ರಮಾಣದ ನೀರಿನ ಕೊರತೆ. ಮಳೆ ಬಾರದಿದ್ದರೆ ನೀರಾವರಿ ಮಾಡಿ.",
        "optimal": "✅ ನೀರಾವರಿ ಅಗತ್ಯವಿಲ್ಲ: ಮಣ್ಣಿನಲ್ಲಿ ಸಾಕಷ್ಟು ತೇವಾಂಶ ಲಭ್ಯವಿದೆ.",
        "status_alert": "ರೈತುಮಿತ್ರ ಅಲರ್ಟ್ - ನಿಮ್ಮ ಹೊಲದ ಮಾಹಿತಿ: ಬೆಳೆ={crop}, ಹಂತ={stage}."
    },
    "tamil": {
        "crop": "பயிர்",
        "stage": "வளர்ச்சி நிலை",
        "urgency_red": "🔴 அவசரம்: பயிர் இழப்பைத் தடுக்க 2 நாட்களுக்குள் {deficit:.1f} மிமீ நீர்ப்பாசனம் செய்யவும்.",
        "urgency_yellow": "🟡 திட்டமிடப்பட்டது: 4 நாட்களுக்குள் {deficit:.1f} மிமீ நீர்ப்பாசனத்தை திட்டமிடுங்கள்.",
        "urgency_green": "🟢 கண்காணிப்பு: சிறிய நீர் பற்றாக்குறை. மழை பெய்யாவிட்டால் நீர்ப்பாசனம் செய்யவும்.",
        "optimal": "✅ பாசனம் தேவையில்லை: மண்ணில் போதுமான ஈரம் உள்ளது.",
        "status_alert": "ரைதுமித்ரா அலர்ட் - உங்கள் வயல் விவரங்கள்: பயிர்={crop}, நிலை={stage}."
    }
}

# Crop name translations
CROP_TRANSLATIONS = {
    "english": {"Rice": "Rice", "Wheat": "Wheat", "Cotton": "Cotton", "Maize": "Maize", "Sugarcane": "Sugarcane"},
    "telugu": {"Rice": "వరి", "Wheat": "గోధుమ", "Cotton": "పత్తి", "Maize": "మొక్కజొన్న", "Sugarcane": "చెరకు"},
    "hindi": {"Rice": "धान", "Wheat": "गेहूं", "Cotton": "कपास", "Maize": "मक्का", "Sugarcane": "गन्ना"},
    "kannada": {"Rice": "ಭತ್ತ", "Wheat": "ಗೋದೂಮ", "Cotton": "ಹತ್ತಿ", "Maize": "ಮೆಕ್ಕೆಜೋಳ", "Sugarcane": "ಕಬ್ಬು"},
    "tamil": {"Rice": "நெல்", "Wheat": "கோதுமை", "Cotton": "பருத்தி", "Maize": "சோளம்", "Sugarcane": "கரும்பு"}
}

# Growth stage translations
STAGE_TRANSLATIONS = {
    "english": {
        "Seedling / Sowing": "Seedling / Sowing",
        "Vegetative Growth": "Vegetative Growth",
        "Reproductive / Flowering": "Reproductive / Flowering",
        "Maturity / Harvest": "Maturity / Harvest"
    },
    "telugu": {
        "Seedling / Sowing": "మొలక / విత్తడం దశ",
        "Vegetative Growth": "ఆకు పచ్చ ఎదుగుదల దశ",
        "Reproductive / Flowering": "పూత / గింజ దశ",
        "Maturity / Harvest": "కోత / పరిపక్వ దశ"
    },
    "hindi": {
        "Seedling / Sowing": "अंकुरण / बुआई चरण",
        "Vegetative Growth": "वानस्पतिक वृद्धि चरण",
        "Reproductive / Flowering": "प्रजनन / फूल आने का चरण",
        "Maturity / Harvest": "परिपक्वता / कटाई चरण"
    },
    "kannada": {
        "Seedling / Sowing": "ಸಸಿ / ಬಿತ್ತನೆ ಹಂತ",
        "Vegetative Growth": "ಸಸ್ಯ ಬೆಳವಣಿಗೆಯ ಹಂತ",
        "Reproductive / Flowering": "ಹೂಬಿಡುವ ಹಂತ",
        "Maturity / Harvest": "ಕೊಯ್ಲು ಹಂತ"
    },
    "tamil": {
        "Seedling / Sowing": "நாற்று / விதைப்பு நிலை",
        "Vegetative Growth": "வளர்ச்சி நிலை",
        "Reproductive / Flowering": "பூக்கும் நிலை",
        "Maturity / Harvest": "அறுவடை நிலை"
    }
}

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "alert_history.json")

def load_alert_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_alert_to_history(phone, message, status):
    history = load_alert_history()
    alert_record = {
        "id": str(uuid.uuid4()),
        "phone": phone,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "status": status
    }
    history.append(alert_record)
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f)
    except Exception:
        pass
    return alert_record

def generate_sms(crop_type, growth_stage, deficit, language="english"):
    """
    Translates parameters and compiles a beautiful localized SMS notification text.
    """
    lang = language.lower()
    if lang not in TRANSLATIONS:
        lang = "english"
        
    trans = TRANSLATIONS[lang]
    
    # Translate crop and growth stage names
    crop_local = CROP_TRANSLATIONS[lang].get(crop_type, crop_type)
    stage_local = STAGE_TRANSLATIONS[lang].get(growth_stage, growth_stage)
    
    # Compile base status alert prefix
    header = trans["status_alert"].format(crop=crop_local, stage=stage_local)
    
    # Select advisory detail based on water deficit severity
    if deficit > 35.0:
        detail = trans["urgency_red"].format(deficit=deficit)
    elif deficit > 15.0:
        detail = trans["urgency_yellow"].format(deficit=deficit)
    elif deficit > 0.0:
        detail = trans["urgency_green"].format(deficit=deficit)
    else:
        detail = trans["optimal"]
        
    full_message = f"{header}\n{detail}"
    return full_message

def send_sms_notification(to_phone, message_text, media_type="sms"):
    """
    Dispatches localized SMS or WhatsApp alerts via Twilio API if credentials are present,
    otherwise gracefully defaults to simulated logs.
    """
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    
    is_whatsapp = media_type.lower() == "whatsapp"
    
    if is_whatsapp:
        # Twilio's standard public Sandbox WhatsApp sender number is +14155238886
        from_number = "whatsapp:" + os.getenv("TWILIO_WHATSAPP_NUMBER", "+14155238886")
        to_number = "whatsapp:" + to_phone
        log_prefix = "WHATSAPP"
    else:
        from_number = os.getenv("TWILIO_PHONE_NUMBER")
        to_number = to_phone
        log_prefix = "SMS"
        
    # Check if credentials exist and are not placeholder/empty
    if account_sid and auth_token and from_number and "YOUR_" not in account_sid:
        try:
            client = Client(account_sid, auth_token)
            message = client.messages.create(
                body=message_text,
                from_=from_number,
                to=to_number
            )
            print(f"✅ Twilio {log_prefix} sent to {to_phone} (SID: {message.sid})")
            return save_alert_to_history(to_phone, message_text, f"Sent ({log_prefix})")
        except Exception as e:
            print(f"⚠️ Twilio API error, falling back to simulated mode: {e}")
            
    # Simulated/Fallback Send Mode
    print(f"📣 [SIMULATED {log_prefix} to {to_phone}]:")
    print(f"----------------------------------------\n{message_text}\n----------------------------------------")
    return save_alert_to_history(to_phone, message_text, f"Simulated ({log_prefix})")

if __name__ == "__main__":
    # Test alert trigger locally
    msg = generate_sms("Rice", "Vegetative Growth", 42.5, "telugu")
    send_sms_notification("+919876543210", msg, media_type="whatsapp")

