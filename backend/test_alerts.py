# 🧪 Raitumitra Alerts & Translation Verification Script
from alerts import generate_sms, send_sms_notification, load_alert_history

def run_verification():
    print("🌾 Starting verification tests for Multilingual Translation Engine...")
    
    test_cases = [
        # Crop, growth stage, water deficit (mm), target language
        ("Rice", "Vegetative Growth", 42.5, "telugu"),
        ("Wheat", "Reproductive / Flowering", 18.0, "hindi"),
        ("Cotton", "Seedling / Sowing", 5.0, "kannada"),
        ("Maize", "Maturity / Harvest", 0.0, "tamil"),
        ("Sugarcane", "Grand Growth", 52.0, "english")
    ]
    
    for crop, stage, deficit, lang in test_cases:
        print(f"\n🌍 Translating to {lang.upper()} (Deficit: {deficit}mm):")
        sms_text = generate_sms(crop, stage, deficit, lang)
        print(f"----------------------------------------\n{sms_text}\n----------------------------------------")
        
        # Verify language specific characters or terms exist
        if lang == "telugu":
            assert "రైతుమిత్ర" in sms_text or "వరి" in sms_text or "అత్యవసరం" in sms_text
            print("  ✅ Telugu translation keywords verified.")
        elif lang == "hindi":
            assert "रैतुमित्र" in sms_text or "गेहूं" in sms_text or "निर्धारित" in sms_text
            print("  ✅ Hindi translation keywords verified.")
        elif lang == "kannada":
            assert "ರೈತುಮಿತ್ರ" in sms_text or "ಹತ್ತಿ" in sms_text
            print("  ✅ Kannada translation keywords verified.")
        elif lang == "tamil":
            assert "நெல்" in sms_text or "பாசனம் தேவையில்லை" in sms_text or "சோளம்" in sms_text
            print("  ✅ Tamil translation keywords verified.")
            
    print("\n📣 Dispatching simulated test SMS & WhatsApp alerts...")
    phone_number = "+919876543210"
    telugu_alert = generate_sms("Rice", "Vegetative Growth", 38.5, "telugu")
    
    # 1. Trigger SMS dispatch
    sms_record = send_sms_notification(phone_number, telugu_alert, media_type="sms")
    print(f"✅ SMS result record: {sms_record}")
    
    # 2. Trigger WhatsApp dispatch
    whatsapp_record = send_sms_notification(phone_number, telugu_alert, media_type="whatsapp")
    print(f"✅ WhatsApp result record: {whatsapp_record}")
    
    # Assert log history was recorded
    history = load_alert_history()
    sms_match = [r for r in history if r["id"] == sms_record["id"]]
    whatsapp_match = [r for r in history if r["id"] == whatsapp_record["id"]]
    assert len(sms_match) == 1, "SMS alert record must exist in history."
    assert len(whatsapp_match) == 1, "WhatsApp alert record must exist in history."
    print("✅ Alert history persistence for SMS & WhatsApp verified.")
    
    print("\n🎉 All alerts & translations verification tests PASSED!")
    return True

if __name__ == "__main__":
    run_verification()
