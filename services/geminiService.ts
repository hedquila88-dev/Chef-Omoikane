import { GoogleGenAI, Type } from "@google/genai";
import { UserDiagnostics, Recipe, DetectedItem } from "../types";

// Always initialize from the frontend using the environment variable provided by the platform
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getSystemInstruction = (lang: string) => {
  const targetLang = lang || 'English';
  const langMap: Record<string, string> = {
    'Italiano': 'Italian (Italiano)',
    'English': 'English',
    'Español': 'Spanish (Español)',
    'Français': 'French (Français)',
    'Chinese': 'Chinese (中文)',
    'Japanese': 'Japanese (日本語)'
  };
  const langName = langMap[targetLang] || targetLang;

  return `Sei Chef Omoikane. Esperto mondiale in alta cucina stellata e nutrizione personalizzata.
REGOLE DI COMUNICAZIONE MANDATORIE:
1. LINGUA DI OUTPUT: Devi rispondere ESCLUSIVAMENTE in: ${langName.toUpperCase()}.
2. TRADUZIONE INTEGRALE: Ogni termine deve essere in ${targetLang}.
3. SINTESI: Massimo 2 frasi.
4. SICUREZZA: Non fare diagnosi mediche. Fornisci solo consigli sulle preferenze alimentari e fit alimentare basato sui dati forniti.`;
};

export const generateRecipe = async (diagnostics: UserDiagnostics): Promise<Recipe> => {
  const prompt = `Genera ricetta per: ${diagnostics.targetDish || "un piatto sorpresa"}. 
  LINGUA: ${diagnostics.language}. Profilo Alimentare: ${diagnostics.healthProfile}.`;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          dietaryFit: { type: Type.STRING },
          cookingTime: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.STRING },
                function: { type: Type.STRING }
              },
              required: ["name", "amount", "function"]
            }
          },
          procedure: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          scienceCheck: { type: Type.STRING },
          macros: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.STRING },
              protein: { type: Type.STRING },
              carbs: { type: Type.STRING },
              fats: { type: Type.STRING },
              fiber: { type: Type.STRING }
            },
            required: ["calories", "protein", "carbs", "fats", "fiber"]
          }
        },
        required: ["title", "dietaryFit", "ingredients", "procedure", "scienceCheck", "macros", "cookingTime"]
      }
    }
  });

  try {
    const text = response.text || "{}";
    const cleaned = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[RECIPE_PARSE_ERROR]", e);
    throw new Error("Invalid output format from AI model");
  }
};

export interface ChatSession {
  sendMessage: (msg: string) => Promise<{ response: { text: string } }>;
}

export const createRecipeChat = (recipe: Recipe, diagnostics: UserDiagnostics): ChatSession => {
  const chat = ai.chats.create({
    model: "gemini-flash-latest",
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
    }
  });

  return {
    sendMessage: async (message: string) => {
      const response = await chat.sendMessage({ message });
      return {
        response: {
          text: response.text || ""
        }
      };
    }
  };
};

export const createAssistantChat = (diagnostics: UserDiagnostics): ChatSession => {
  const chat = ai.chats.create({
    model: "gemini-flash-latest",
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language) + "\nSei l'assistente virtuale integrato di Chef Omoikane. Aiuta l'utente a configurare il terminale, capire i nutrienti o rispondere a curiosità culinarie.",
    }
  });

  return {
    sendMessage: async (message: string) => {
      const response = await chat.sendMessage({ message });
      return {
        response: {
          text: response.text || ""
        }
      };
    }
  };
};

export const analyzeHealthOrMenu = async (
  query: string, 
  diagnostics: UserDiagnostics, 
  imageBase64?: string
): Promise<{ text: string, status?: 'SAFE' | 'WARNING' | 'FORBIDDEN', detections?: DetectedItem[], sources?: { title: string, uri: string }[] }> => {
  const prompt = `QUERY: ${query}\nLINGUA: ${diagnostics.language}\nPROFILO: ${diagnostics.healthProfile}`;
  const parts: any[] = [{ text: prompt }];
  
  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: "image/jpeg"
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['SAFE', 'WARNING', 'FORBIDDEN'] },
          detections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['SAFE', 'WARNING', 'FORBIDDEN'] },
                box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                reason: { type: Type.STRING }
              },
              required: ["name", "status", "box_2d", "reason"]
            }
          }
        },
        required: ["text", "status"]
      }
    }
  });

  try {
    const text = response.text || "{}";
    const cleaned = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    const parsed = JSON.parse(cleaned);
    return { text: parsed.text, status: parsed.status, detections: parsed.detections };
  } catch (e) {
    console.error("[ANALYZE_PARSE_ERROR]", e);
    return { text: response.text || "Error parsing AI response" };
  }
};

export const extractIngredientsFromImage = async (imageBase64: string, language: string): Promise<string[]> => {
  const prompt = `Identifica gli ingredienti alimentari. Output JSON: {"ingredients": ["lista"]}. Lingua: ${language}.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        {
          inlineData: {
            data: imageBase64.split(',')[1],
            mimeType: "image/jpeg"
          }
        }
      ]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["ingredients"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  return parsed.ingredients || [];
};

export const analyzeNearbyPlaces = async (
  target: string,
  diagnostics: UserDiagnostics,
  lat: number,
  lng: number
): Promise<{ text: string }> => {
  const prompt = `SEARCH FOR REAL PLACES NEARBY: ${target} at coordinates [Lat: ${lat}, Lng: ${lng}].
  LANGUAGE: ${diagnostics.language}. DIETARY PROFILE: ${diagnostics.healthProfile}.
  
  MANDATORY FORMAT FOR EACH PLACE:
  [PLACE: Restaurant Name]
  [TYPE: Cuisine Type]
  [COLOR: GREEN|YELLOW|RED]
  [TIME: Estimation from coordinates]
  [REASON: Simple factual description (e.g., "Contains gluten", "High sugar content", "Organic Mediterranean options"). DO NOT use medical terms like "dangerous for celiacs" or "diabetic safe". Use ingredient-based facts.]
  [NAV: https://www.google.com/maps/search/?api=1&query=LAT,LNG]
  
  Only include 5 high-quality results. Be factual and objective.`;

  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language) + "\nSei un localizzatore bio-gastronomico. Usa i dati di ricerca per trovare posti reali. Sii fattuale, evita claim medici o nutrizionali sulle attività commerciali.",
      tools: [{ googleSearch: {} }]
    }
  });

  return { text: response.text || "ERROR: Search returned no results." };
};
