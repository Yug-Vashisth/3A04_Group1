from fastapi import APIRouter, HTTPException, Query
import requests
import json
from core.config import settings

disaster_router = APIRouter(prefix="/api/disaster", tags=["Env Rating"])


@disaster_router.get("/rating")
async def get_environmental_rating(aqi: float, soil_moisture: float, ndvi: float, temperature: float):
    OLLAMA_URL = settings.OLLAMA_URL
    input = f"""
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

    Write a plain English paragraph describing the environmental risk.

    DO NOT:
    - Do not use JSON
    - Do not use curly braces 
    - Do not use key-value pairs
    - Do not use bullet points
    - Do not use markdown
    - Do not wrap the answer in code blocks
    - Do not include labels like "Probability:", "Risk:", etc.

    ONLY:
    - Write 2–4 complete sentences in natural language
    - Everything must be in one continuous paragraph

    If you output anything other than plain text, the response is invalid.

    


    CONSTRAINTS:

    * Return ONLY valid JSON
    * No extra text, new line characters before or after JSON
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
    
    # Grab the text response
    text_answer = response.json().get("response", "")
    return {"answer": text_answer}

