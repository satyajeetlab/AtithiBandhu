from app.utils.risk_classifier import classify_risk

def test_classify_risk_very_safe():
    result = classify_risk(95.0)
    assert result["risk_level"] == "VERY_SAFE"
    assert result["color_category"] == "GREEN"

def test_classify_risk_safe():
    result = classify_risk(72.5)
    assert result["risk_level"] == "SAFE"
    assert result["color_category"] == "GREEN"

def test_classify_risk_moderate():
    result = classify_risk(60.0)
    assert result["risk_level"] == "MODERATE"
    assert result["color_category"] == "YELLOW"

def test_classify_risk_risky():
    result = classify_risk(45.0)
    assert result["risk_level"] == "RISKY"
    assert result["color_category"] == "ORANGE"

def test_classify_risk_high_risk():
    result = classify_risk(15.0)
    assert result["risk_level"] == "HIGH_RISK"
    assert result["color_category"] == "RED"

def test_classify_risk_out_of_bounds():
    # Test clipping
    result_high = classify_risk(110.0)
    assert result_high["risk_level"] == "VERY_SAFE"
    
    result_low = classify_risk(-10.0)
    assert result_low["risk_level"] == "HIGH_RISK"
