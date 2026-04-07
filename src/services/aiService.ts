import { GoogleGenAI, Type } from "@google/genai";
import { PredictionInput, PredictionResult } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

export async function predictDelay(input: PredictionInput): Promise<PredictionResult> {
  if (!apiKey) {
    // Fallback heuristic if API key is missing
    const delay = input.traffic > 70 || (input.traffic > 40 && input.weather === 1) ? 1 : 0;
    return { delay: delay as 0 | 1, confidence: 0.85 };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Predict if there will be a delivery delay based on:
        Traffic: ${input.traffic}/100
        Weather: ${input.weather === 1 ? 'Rainy' : 'Clear'}
        Distance Remaining: ${input.distance}km
        
        Return JSON with "delay" (0 or 1) and "confidence" (0-1).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            delay: { type: Type.INTEGER, description: "0 for no delay, 1 for delay" },
            confidence: { type: Type.NUMBER, description: "Confidence score" }
          },
          required: ["delay", "confidence"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      delay: result.delay === 1 ? 1 : 0,
      confidence: result.confidence || 0.9
    };
  } catch (error) {
    console.error("AI Prediction Error:", error);
    // Fallback
    const delay = input.traffic > 70 || (input.traffic > 40 && input.weather === 1) ? 1 : 0;
    return { delay: delay as 0 | 1, confidence: 0.7 };
  }
}
