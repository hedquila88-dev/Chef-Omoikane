
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { UserDiagnostics, Recipe, DetectedItem } from "../types";
import { i18n } from "../translations";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, "").trim();
};

const getSystemInstruction = (lang: string) => {
  const targetLang = lang || 'English';
  // Mappatura per aiutare il modello a comprendere meglio la lingua target
  const langMap: Record<string, string> = {
    'Italiano': 'Italian (Italiano)',
    'English': 'English',
    'Español': 'Spanish (Español)',
    'Français': 'French (Français)',
    'Chinese': 'Chinese (中文)',
    'Japanese': 'Japanese (日本語)'
  };
  
  const langName = langMap[targetLang] || targetLang;

  return `Sei Chef Omoikane. Esperto mondiale in alta cucina stellata e biochimica alimentare applicata alla salute.

REGOLE DI COMUNICAZIONE MANDATORIE (ASSOLUTE - VIOLAZIONE COMPORTA FALLIMENTO):
1. LINGUA DI OUTPUT: Devi rispondere ESCLUSIVAMENTE in lingua: ${langName.toUpperCase()}.
2. DIVIETO ASSOLUTO DI INGLESE (SE LA LINGUA TARGET NON È INGLESE): È STRETTAMENTE VIETATO rispondere in una lingua diversa da ${targetLang}. Anche se ricevi dati in inglese da Google Maps o Search, DEVI tradurli in ${targetLang} prima di mostrarli all'utente.
3. TRADUZIONE INTEGRALE: Ogni nome di locale, descrizione, ingrediente o motivazione medica DEVE essere in ${targetLang}. Non lasciare "Healthy options", scrivi "Opzioni salutari" (o equivalente in ${targetLang}).
4. COERENZA CLINICA: L'utente scrive in ${targetLang}. Tu rispondi in ${targetLang}.
5. SINTESI: Massimo 2 frasi per spiegazione.

LOGICA MAPPE (BIO-LOCATOR):
Quando usi googleMaps:
- FORMATO OBBLIGATORIO (TUTTO TRADOTTO IN ${targetLang.toUpperCase()}):
  [PLACE: Nome Locale Tradotto]
  [TYPE: Categoria Tradotta]
  [COLOR: GREEN | YELLOW | RED]
  [TIME: X min]
  [REASON: Massima sintesi bio-medica tradotta in ${targetLang} (max 15 parole)]
  [NAV: URL Maps]`;
};

export const generateRecipe = async (diagnostics: UserDiagnostics): Promise<Recipe> => {
  const t = i18n[diagnostics.language];
  const healthInfo = diagnostics.healthProfile.trim() || t.healthyStatus;
  
  const prompt = `Genera ricetta per: ${diagnostics.targetDish || "un piatto sorpresa"}. 
  LINGUA OBBLIGATORIA: ${diagnostics.language}.
  Profilo Salute: ${healthInfo}. 
  Specifiche: ${diagnostics.additionalSpecs}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          medicalAnalysis: { type: Type.STRING },
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
        required: ["title", "medicalAnalysis", "ingredients", "procedure", "scienceCheck", "macros", "cookingTime"]
      }
    }
  });

  return JSON.parse(cleanJsonString(response.text || "{}"));
};

export const createRecipeChat = (recipe: Recipe, diagnostics: UserDiagnostics): Chat => {
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language) + `\nRISPONDI SEMPRE E SOLO IN ${diagnostics.language.toUpperCase()}. TRADUCI OGNI COSA.`,
    },
  });
};

export const analyzeHealthOrMenu = async (
  query: string, 
  diagnostics: UserDiagnostics, 
  imageBase64?: string
): Promise<{ text: string, status?: 'SAFE' | 'WARNING' | 'FORBIDDEN', detections?: DetectedItem[], sources?: { title: string, uri: string }[] }> => {
  const parts: any[] = [{ text: `QUERY: ${query}\nLINGUA: ${diagnostics.language}\nPROFILO: ${diagnostics.healthProfile}` }];
  
  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64.split(',')[1],
        mimeType: "image/jpeg"
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
      tools: [{ googleSearch: {} }],
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

  const parsed = JSON.parse(cleanJsonString(response.text || "{}"));
  return { text: parsed.text, status: parsed.status, detections: parsed.detections };
};

export const analyzeNearbyPlaces = async (
  query: string,
  diagnostics: UserDiagnostics,
  lat: number,
  lng: number
): Promise<{ text: string }> => {
  const targetLang = diagnostics.language || 'English';
  
  const prompt = `BIO-LOCATOR PROTOCOL:
  BIO_PROFILE: ${diagnostics.healthProfile}
  LINGUA OBBLIGATORIA DI RISPOSTA: ${targetLang.toUpperCase()}
  
  REGOLE DI FERRO:
  - TRADUCI TUTTO IN ${targetLang.toUpperCase()}.
  - Se un locale si chiama "Healthy Cafe", scrivi "Caffè Salutare" o simile in ${targetLang}.
  - Se la descrizione del locale è "Vegan friendly", traducila in ${targetLang}.
  - Ogni singola parola dell'output deve essere in ${targetLang}.
  - Segui rigorosamente lo schema [PLACE][TYPE][COLOR][TIME][REASON][NAV].`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(targetLang),
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude: lat, longitude: lng }
        }
      }
    }
  });

  return { text: response.text || "" };
};
