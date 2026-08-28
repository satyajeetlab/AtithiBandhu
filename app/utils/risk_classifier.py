def classify_risk(score: float) -> dict:
    """
    Classifies the safety score into a deterministic risk level, color category, and warning label.
    
    Ranges:
      80-100  -> VERY_SAFE (GREEN)
      65-79   -> SAFE (GREEN)
      50-64   -> MODERATE (YELLOW)
      30-49   -> RISKY (ORANGE)
       0-29   -> HIGH_RISK (RED)
    """
    # Clamp score to [0.0, 100.0] to be safe
    score = max(0.0, min(100.0, score))
    
    if 80.0 <= score <= 100.0:
        return {
            "risk_level": "VERY_SAFE",
            "color_category": "GREEN",
            "color": "GREEN",
            "recommendation": "Highly suitable for tourists. Standard security awareness is sufficient."
        }
    elif 65.0 <= score < 80.0:
        return {
            "risk_level": "SAFE",
            "color_category": "GREEN",
            "color": "GREEN",
            "recommendation": "Generally suitable for tourists. Good safety standards, moderate precaution recommended at night."
        }
    elif 50.0 <= score < 65.0:
        return {
            "risk_level": "MODERATE",
            "color_category": "YELLOW",
            "color": "YELLOW",
            "recommendation": "Moderate safety. Keep belongings secure, stay in well-lit areas, and use verified transport."
        }
    elif 30.0 <= score < 50.0:
        return {
            "risk_level": "RISKY",
            "color_category": "ORANGE",
            "color": "ORANGE",
            "recommendation": "High caution advised. Avoid traveling alone, especially at night. Verify security guidelines."
        }
    else:  # score < 30.0
        return {
            "risk_level": "HIGH_RISK",
            "color_category": "RED",
            "color": "RED",
            "recommendation": "Not recommended for tourists. High security risk. Seek local authority assistance if traveling is necessary."
        }
