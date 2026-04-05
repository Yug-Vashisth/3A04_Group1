from fastapi import APIRouter, HTTPException, Query
import requests

disaster_router = APIRouter(prefix="/api/disaster", tags=["Env Rating"])


@disaster_router.get("/rating")
async def get_environmental_rating(aqi: float, soil_moisture: float, ndvi: float, temperature: float):
    OLLAMA_URL = "http://localhost:11434/api/generate"
    input = """
    You are an environmental risk assessment model.

    Your task is to estimate the probability of a natural disaster (e.g., wildfire, drought, or ecosystem collapse) based on environmental inputs.

    INPUT:

    * AQI: {aqi}
    * Soil Moisture: {soil_moisture}
    * NDVI (Vegetation Health): {ndvi}
    * Temperature (°C): {temperature}

    INSTRUCTIONS:

    1. Analyze how each factor contributes to environmental risk.
    2. Combine the factors logically to estimate a probability between 0 and 1.
    3. Be consistent across similar inputs (do not guess randomly).
    4. Do NOT output extreme probabilities (0 or 1) unless strongly justified.

    DOMAIN RULES:

    * Higher temperature → increases risk
    * Lower NDVI → increases risk (indicates defoliation / poor forest health)
    * Lower soil moisture → increases risk (dry conditions)
    * Higher AQI → slightly increases risk (pollution stress)
    * Multiple high-risk factors together → significantly increase probability

    OUTPUT FORMAT (STRICT — MUST FOLLOW EXACTLY):
    {
    "probability": number (0 to 1, rounded to 2 decimal places),
    "risk_level": "Low" | "Moderate" | "High",
    "explanation": "Clear, concise explanation referencing the input factors and why they increase or decrease risk"
    }

    CONSTRAINTS:

    * Return ONLY valid JSON
    * No extra text before or after JSON
    * Explanation must be 2–4 sentences max
    * Be deterministic and consistent

    EXAMPLE BEHAVIOR:

    * High temp + low NDVI + low soil moisture → High risk (0.7–0.9)
    * Moderate values across all → Moderate risk (0.4–0.6)
    * Low temp + healthy NDVI + high soil moisture → Low risk (0.1–0.3)

    """
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "phi3",
            "prompt": input,
            "stream": False
        }
    )
    print(response.json()["response"])
    return {"answer": response.json()["response"]}

def test():
    OLLAMA_URL = "http://localhost:11434/api/generate"
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "phi3",
            "prompt": "What is 3+3",
            "stream": False
        }
    )
    print(response.json()["response"])
    return {"answer": response.json()["response"]}
    
if __name__ == "__main__":
    test()