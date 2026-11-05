# -*- coding: utf-8 -*-
import json
import re
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class FormAutoFillRequest(BaseModel):
    query: str
    language: str = "te"
    current_profile: Optional[Dict[str, Any]] = None

class FormAutoFillResponse(BaseModel):
    target_route: str
    target_name: str
    extracted_fields: Dict[str, Any]
    missing_fields: List[str]
    spoken_confirmation: str
    spoken_question: Optional[str]
    confidence: float

def parse_farmer_intent_and_fields(query_text: str, lang: str = "te", profile: Dict[str, Any] = None) -> FormAutoFillResponse:
    q = query_text.strip().lower()
    profile = profile or {}

    extracted = {}
    missing = []

    # Priority 1: Multi-field Crop Advisory Form Auto-Filling
    # If the user speaks about land acres, soil, or growing a crop with conditions
    is_crop_advisory = any(k in q for k in ["acres", "acre", "ఎకరా", "ఎకరాలు", "एकड़", "soil", "నేల", "మట్టి", "मिट्टी", "which crop", "ఏ పంట", "कौन सी फसल", "grow", "సాగు", "ఉత్పత్తి", "crop advisory"])
    
    if is_crop_advisory or any(k in q for k in ["heavy rain", "ఎక్కువ వర్షం", "చాలా వర్షం", "వరద", "भारी बारिश"]):
        route = "/crop"
        route_name = "Crop Advisory & Sowing Plan"

        # Crop
        if any(c in q for c in ["టమాట", "टमाटर", "tomato"]): extracted["crop"] = "Tomato"
        elif any(c in q for c in ["వరి", "धान", "rice", "paddy"]): extracted["crop"] = "Rice"
        elif any(c in q for c in ["మొక్కజొన్న", "मक्का", "corn", "maize"]): extracted["crop"] = "Corn"
        elif any(c in q for c in ["పత్తి", "कपास", "cotton"]): extracted["crop"] = "Cotton"
        elif any(c in q for c in ["మిరప", "मिर्च", "chilli"]): extracted["crop"] = "Chilli"
        elif any(c in q for c in ["బంగాళాదుంప", "आलू", "potato"]): extracted["crop"] = "Potato"

        # Land Area / Acres
        acre_match = re.search(r'(\d+|two|three|four|five|rendu|moodu)\s*(ఎకరాలు|ఎకరాల|acres?|एकड़)', q)
        if acre_match:
            num = acre_match.group(1)
            num_map = {"two": "2", "three": "3", "four": "4", "five": "5", "rendu": "2", "moodu": "3"}
            extracted["land_area"] = f"{num_map.get(num, num)} Acres"
        else:
            extracted["land_area"] = profile.get("farmSize", "2 Acres")

        # Location / District
        if any(d in q for d in ["హైదరాబాద్", "hyderabad"]): extracted["district"] = "Hyderabad"
        elif any(d in q for d in ["వరంగల్", "warangal"]): extracted["district"] = "Warangal"
        elif any(d in q for d in ["కరీంనగర్", "karimnagar"]): extracted["district"] = "Karimnagar"
        elif any(d in q for d in ["సంగారెడ్డి", "sangareddy"]): extracted["district"] = "Sangareddy"
        else: extracted["district"] = profile.get("district", "Hyderabad")
        extracted["state"] = profile.get("state", "Telangana")

        # Soil type
        if any(s in q for s in ["నల్లరేగడి", "నల్ల నేల", "black soil", "काली मिट्टी"]):
            extracted["soilType"] = "Clayey" # Maps to black clayey
        elif any(s in q for s in ["ఎర్ర నేల", "red soil", "लाल मिट्टी"]):
            extracted["soilType"] = "Red Soil"
        elif any(s in q for s in ["ఇసుక నేల", "sandy", "बलुई मिट्टी"]):
            extracted["soilType"] = "Sandy"
        elif any(s in q for s in ["ఒండ్రు నేల", "alluvial", "जलोढ़ मिट्टी"]):
            extracted["soilType"] = "Alluvial"
        else:
            extracted["soilType"] = "Loamy"

        # Water / Rainfall concern
        if any(w in q for w in ["heavy rain", "ఎక్కువ వర్షం", "చాలా వర్షం", "వరద", "भारी बारिश"]):
            extracted["waterSources"] = ["Rainwater", "Canal Irrigation"]
            extracted["rainfall_risk"] = "Heavy Rainfall Anticipated"
        elif any(w in q for w in ["బోరు", "borewell", "नलकूप"]):
            extracted["waterSources"] = ["Borewell/Tubewell"]
        else:
            extracted["waterSources"] = ["Rainwater", "Borewell/Tubewell"]

        # Missing check
        if not extracted.get("crop"):
            missing.append("crop")

        if lang == "te":
            spoken_conf = f"మీ వివరాలు ఆటోమేటిక్‌గా నమోదు చేయబడ్డాయి: పంట {extracted.get('crop', 'పంట')}, విస్తీర్ణం {extracted['land_area']}, ప్రాంతం {extracted['district']}, నేల {extracted['soilType']}. పంట సలహా ఫారం సిద్ధంగా ఉంది."
            spoken_q = "మీ వద్ద ఉన్న నీటి వనరు ఏమిటి?" if missing else "వివరాలు సరిచూసి నిర్ధారించండి."
        elif lang == "hi":
            spoken_conf = f"विवरण स्वतः भर दिए गए: फसल {extracted.get('crop', 'फसल')}, क्षेत्रफल {extracted['land_area']}, जिला {extracted['district']}, मिट्टी {extracted['soilType']}। फसल परामर्श फॉर्म तैयार है।"
            spoken_q = "सिंचाई का साधन क्या है?" if missing else "कृपया विवरण की पुष्टि करें।"
        else:
            spoken_conf = f"Form auto-filled: {extracted.get('crop', 'Crop')}, {extracted['land_area']}, {extracted['district']}, {extracted['soilType']}. Navigating to Crop Advisory."
            spoken_q = "Which water source is available?" if missing else "Please review and confirm the filled fields."

        return FormAutoFillResponse(
            target_route=route,
            target_name=route_name,
            extracted_fields=extracted,
            missing_fields=missing,
            spoken_confirmation=spoken_conf,
            spoken_question=spoken_q,
            confidence=0.96
        )

    # Priority 2: Disease Detection intent
    if any(k in q for k in ["మచ్చ", "తెగులు", "వ్యాధి", "ఆకు", "धब्बे", "रोग", "बीमारी", "पत्ती", "disease", "spot", "leaf"]):
        route = "/detect"
        route_name = "Crop Disease Detection"
        extracted["plant_part"] = "Leaf"
        
        if any(c in q for c in ["టమాట", "टमाटर", "tomato"]): extracted["crop"] = "Tomato"
        elif any(c in q for c in ["వరి", "धान", "rice", "paddy"]): extracted["crop"] = "Rice"
        elif any(c in q for c in ["మొక్కజొన్న", "मक्का", "corn"]): extracted["crop"] = "Corn"
        elif any(c in q for c in ["బంగాళాదుంప", "आलू", "potato"]): extracted["crop"] = "Potato"

        if lang == "te":
            spoken_conf = "మీ పంట తెగులు నిర్ధారణ కోసం డిసీజ్ డిటెక్షన్ తెరుస్తున్నాను. దయచేసి ఆకు ఫోటోను తీయండి."
            spoken_q = "వ్యాధి సోకిన ఆకు భాగాన్ని స్పష్టంగా కెమెరాలో చూపించండి."
        elif lang == "hi":
            spoken_conf = "फसल रोग पहचान पृष्ठ खोला जा रहा है। कृपया पत्ती की फोटो लें।"
            spoken_q = "पत्ती की स्पष्ट फोटो अपलोड करें।"
        else:
            spoken_conf = "Opening Crop Disease Detection. Please upload or capture the affected leaf photograph."
            spoken_q = "Please hold camera steady and capture the diseased leaf spot."

        return FormAutoFillResponse(
            target_route=route,
            target_name=route_name,
            extracted_fields=extracted,
            missing_fields=["leaf_photo"],
            spoken_confirmation=spoken_conf,
            spoken_question=spoken_q,
            confidence=0.95
        )

    # Priority 3: Weather and Rain only (when not asking for crop selection)
    if any(k in q for k in ["వర్షం", "వాతావరణం", "ఎండ", "बारिश", "मौसम", "weather", "rain", "forecast"]):
        route = "/weather"
        route_name = "Weather & Rainfall Advisory"
        extracted["district"] = profile.get("district", "Hyderabad")
        extracted["state"] = profile.get("state", "Telangana")

        if any(d in q for d in ["హైదరాబాద్", "hyderabad"]): extracted["district"] = "Hyderabad"
        elif any(d in q for d in ["వరంగల్", "warangal"]): extracted["district"] = "Warangal"
        elif any(d in q for d in ["కరీంనగర్", "karimnagar"]): extracted["district"] = "Karimnagar"
        elif any(d in q for d in ["సంగారెడ్డి", "sangareddy"]): extracted["district"] = "Sangareddy"

        if lang == "te":
            spoken_conf = f"{extracted['district']} వాతావరణం మరియు రాబోయే 7 రోజుల వర్ష సూచనను తెరుస్తున్నాను."
        elif lang == "hi":
            spoken_conf = f"{extracted['district']} का 7 दिवसीय मौसम और वर्षा पूर्वानुमान दिखाया जा रहा है।"
        else:
            spoken_conf = f"Opening 7-day verified weather and rainfall forecast for {extracted['district']}."

        return FormAutoFillResponse(
            target_route=route,
            target_name=route_name,
            extracted_fields=extracted,
            missing_fields=[],
            spoken_confirmation=spoken_conf,
            spoken_question=None,
            confidence=0.92
        )

    # Priority 4: Market and Mandi
    if any(k in q for k in ["ధర", "మార్కెట్", "మండి", "అమ్మాలి", "भाव", "मंडी", "दाम", "price", "market", "mandi", "sell"]):
        route = "/market"
        route_name = "Market Prices & Mandi Information"
        
        if any(c in q for c in ["టమాట", "टमाटर", "tomato"]): extracted["crop"] = "Tomato"
        elif any(c in q for c in ["వరి", "धान", "rice"]): extracted["crop"] = "Rice"
        elif any(c in q for c in ["పత్తి", "कपास", "cotton"]): extracted["crop"] = "Cotton"
        elif any(c in q for c in ["మిరప", "मिर्च", "chilli"]): extracted["crop"] = "Chilli"
        else: extracted["crop"] = profile.get("crop", "Tomato")

        extracted["district"] = profile.get("district", "Hyderabad")

        if lang == "te":
            spoken_conf = f"{extracted['crop']} పంట మార్కెట్ యార్డుల తాజా ధరల సమాచారాన్ని తెరుస్తున్నాను."
        elif lang == "hi":
            spoken_conf = f"{extracted['crop']} फसल के लिए मंडी भाव पृष्ठ खोला जा रहा है।"
        else:
            spoken_conf = f"Opening Mandi market prices for {extracted['crop']}."

        return FormAutoFillResponse(
            target_route=route,
            target_name=route_name,
            extracted_fields=extracted,
            missing_fields=[],
            spoken_confirmation=spoken_conf,
            spoken_question=None,
            confidence=0.90
        )

    # Default fallback
    route = "/crop"
    route_name = "Crop Advisory"
    extracted["district"] = profile.get("district", "Hyderabad")
    extracted["soilType"] = "Loamy"
    return FormAutoFillResponse(
        target_route=route,
        target_name=route_name,
        extracted_fields=extracted,
        missing_fields=[],
        spoken_confirmation="వ్యవసాయ సలహా మరియు పంటల విభాగం తెరుస్తున్నాను." if lang == "te" else "Opening Agricultural Advisory.",
        spoken_question=None,
        confidence=0.80
    )
