
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UserDiagnostics, Recipe, MacroNutrients } from "../types";

// Always initialize from the frontend using the environment variable provided by the platform
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

// Export ChatSession type for components - we use any for flexibility or specific SDK types if needed
export type ChatSession = any; 

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
REGOLE DI COMUNICAZIONE MANDATORIE (ZERO MEDICAL CLAIMS):
1. LINGUA DI OUTPUT: Devi rispondere ESCLUSIVAMENTE in: ${langName.toUpperCase()}.
2. TRADUZIONE INTEGRALE: Ogni termine deve essere in ${targetLang}.
3. GASTRONOMIC PERSPECTIVE (MANDATORY): Answer ALL questions about food, ingredients, cooking, and nutrition from a gastronomic perspective.
   - NEVER refuse food-related questions.
   - NEVER return errors for food queries.
   - If a question mentions a medical condition (e.g., diabetes):
     * Answer from a culinary/nutritional perspective (flavors, textures, dietary fit).
     * MANDATORY: Add one brief line: "For medical advice, consult your doctor." (translated in ${targetLang}).
     * Then continue with culinary suggestions and pairings.
4. NO MEDICAL LANGUAGE: È rigorosamente vietato usare termini clinici o terapeutici. Usa solo linguaggio gastronomico.
5. PROFILO GASTRONOMICO: Ogni consiglio deve essere basato su compatibilità di stile culinario, mai come prescrizione medica.
6. ZERO ASSUMPTIONS: Non ipotizzare mai condizioni di salute se non esplicitamente dichiarate.
7. SINTESI: Massimo 3 frasi + riga disclaimer.
8. DISCLAIMER: Agisci come uno Chef di alta cucina, mai come un medico.
9. CONSISTENCY: Maintain absolute consistency for any numerical data provided (macros, calories, times).
10. NO FALSE CERTIFICATION: DO NOT use the word "certified". Use: "Appears compatible with [guidelines]. Verify with source."
11. MACRO & CALORIC VALUES: 
    - ALWAYS provide values per 100g only.
    - NEVER provide total values for the dish.`;
};

export const generateRecipe = async (diagnostics: UserDiagnostics): Promise<Recipe> => {
  const ai = getGenAI();
  const prompt = `Genera ricetta per: ${diagnostics.targetDish || "un piatto sorpresa"}. 
  LINGUA: ${diagnostics.language}. 
  Profilo Gastronomico: ${diagnostics.healthProfile}.
  
  MANDATORY - INGREDIENT USAGE:
  1. You MUST check the following list of available ingredients: "${diagnostics.ingredients || 'None provided'}".
  2. If ingredients are provided, you MUST use them as the primary components of the recipe. DO NOT suggest ingredients that the user does not have, unless they are basic pantry staples (salt, oil, water).
  3. If NO ingredients are provided, suggest a dish based on the target theme or seasonal availability.
  
  MANDATORY - NUTRITIONAL DATA:
  1. ALL macro values (calories, protein, carbs, fats, fiber) MUST be calculated PER 100G of the final dish.
  2. DO NOT provide total values for the entire recipe output.
  
  MANDATORY - CONTENT RESTRICTIONS:
  1. DO NOT use medical or therapeutic language (e.g., replace "low glycemic" with "selected for its specific texture and profile alignment", replace "stabilizes blood sugar" with "aligns with your gastronomic preferences").
  2. AVOID terms like: "insulin", "diabetes", "anti-inflammatory", "healing", "preventative".
  3. The 'dietaryFit' field MUST be focused on the "CHEF'S PROFILE" concept and avoid nutritional claims like "designed for satiety", "high volume", or specific ingredient concentration levels (e.g. "low sugar", "lower sugar"). Focus on culinary style, flavor harmony, and why it matches the user's gastronomic profile.
  4. The 'scienceCheck' field MUST focus ONLY on gastronomic pairings, why flavors work together, and texture analysis from a biochemical cooking perspective (e.g., Maillard reaction, emulsification), NOT medical benefits.
  5. Be factual and chef-oriented. Avoid health claims.
  
  MANDATORY - ALLERGEN DETECTION:
  1. Carefully compare "Profilo Gastronomico" (e.g., "allergic to nuts") with the "available ingredients" list (e.g., "nuts, chicken").
  2. DAIRY ALERT: If the user mentions "dairy free", "lactose intolerant", or similar, you MUST recognize ALL milk-derived products as allergens, including: milk, cream, ANY butter, and ALL cheeses (Parmesan, Parmigiano, Grana Padano, Mozzarella, Ricotta, Pecorino, Mascarpone, Provola, Asiago, Gorgonzola, Burrata, Stracchino, Feta, etc.), yogurt, and whey.
  3. If you detect ANY ingredient provided by the user that violates their declared profile:
     - EXCLUDE those ingredients from the recipe.
     - POPULATE the 'allergenWarning' field with a message like: "Notice: Certain ingredients (nuts, almond) were excluded from the recipe based on your dietary profile."
     - POPULATE 'allergenSeverity' with:
        - 'high' for regulated allergens (nuts, gluten, egg, fish, shellfish, etc.)
        - 'low' for intolerances or irritants (lactose, dairy, spicy, etc.)
     - If no contradiction is found, leave 'allergenWarning' empty or null and 'allergenSeverity' as null.
     - Adapt the language of the warning to: ${diagnostics.language}.`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      dietaryFit: { type: Type.STRING },
      cookingTime: { type: Type.STRING },
      allergenWarning: { type: Type.STRING, nullable: true },
      allergenSeverity: { type: Type.STRING, enum: ['high', 'low'], nullable: true },
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
  };

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(diagnostics.language),
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      },
    });
    
    const text = result.text || "";
    const cleaned = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[RECIPE_PARSE_ERROR]", e);
    throw e;
  }
};

export const createRecipeChat = (recipe: Recipe, diagnostics: UserDiagnostics) => {
  const ai = getGenAI();
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    history: [],
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language) + `\nStai parlando con l'utente riguardo alla ricetta "${recipe.title}" che hai appena generato. Rispondi alle sue domande sempre restando in personaggio.
      
      PROTOCOLO AZIONE:
      Se l'utente vuole iniziare a cucinare o chiede di tornare alla sintesi, concludi il tuo messaggio con la stringa esatta: [ACTION:PREPARE_SYNTHESIS]`,
      temperature: 0.7,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  });
};

export const createAssistantChat = (diagnostics: UserDiagnostics) => {
  const ai = getGenAI();
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    history: [],
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language) + `\nSei l'assistente di Chef Omoikane.
      
      ASSISTANT PROTOCOL:
      1. Answer ALL culinary and food-related questions. NEVER refuse.
      2. If a medical condition is mentioned, provide a gastronomic/nutritional answer first.
      3. MANDATORY: Include the line "For medical dietary advice, always consult your doctor or dietitian." (translated in ${diagnostics.language}) within the response.
      4. Suggest a recipe or a pairing if applicable.
      5. ACTION USE: 
         - Se l'utente vuole cucinare qualcosa, iniziare una nuova ricetta, o dice 'mostrami', 'vai a', 'apri' riguardo a un piatto o ingredienti discussi, suggerisci i parametri per la sintesi includendo alla fine del tuo messaggio: [SYNTHESIS_DATA:{"targetDish":"...","dietaryProfile":"...","ingredients":"...","additionalSpecs":"..."}]
         - Se l'utente chiede come scansionare un prodotto, se può fargli una foto, o vuole analizzare visivamente il cibo davanti a lui, includi nel tuo messaggio: [SCANNER_DATA:{"dietaryProfile":"...","additionalSpecs":"..."}]
         - Se l'utente vuole trovare un posto dove mangiare, chiede di ristoranti vicini o locali, includi nel tuo messaggio: [ACTION:OPEN_LOCATOR]
         - NOTA: Recupera sempre eventuali restrizioni dietetiche o preferenze espresse dall'utente (es. "sono allergico alle noci") e inseriscile nel campo 'dietaryProfile' dei dati dell'azione.`,
      temperature: 0.7,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  });
};

export const extractIngredientsFromImage = async (imageBase64: string, lang: string): Promise<string[]> => {
  const ai = getGenAI();
  const [mimeType, b64Data] = imageBase64.split(';base64,');
  
  const prompt = "Identify all food ingredients visible in this image. Return a simple list of ingredient names, comma separated. Only the names, no other text.";
  
  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: mimeType.split(':')[1],
            data: b64Data
          }
        }
      ]
    },
    config: {
      systemInstruction: getSystemInstruction(lang),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  });

  const text = result.text || "";
  return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
};

export const analyzeHealthOrMenu = async (query: string, diagnostics: UserDiagnostics, image?: string, existingMacros?: MacroNutrients) => {
  const ai = getGenAI();
  const macroContext = existingMacros 
    ? `\n[NUTRITIONAL DATA MEMORY - READ ONLY]
       The following values have been ALREADY ESTABLISHED for the food in this session:
       - Calories: ${existingMacros.calories} per 100g
       - Protein: ${existingMacros.protein} per 100g
       - Carbs: ${existingMacros.carbs} per 100g
       - Fats: ${existingMacros.fats} per 100g
       - Fiber: ${existingMacros.fiber} per 100g
       
       CRITICAL: If the user asks for macros or calories, YOU MUST read back these exact numbers from this context. YOU ARE FORBIDDEN from generating or calculating new values for these fields.` 
    : "";

  const prompt = image 
    ? `${macroContext}
      STRICT PROFILE ADHERENCE: Evaluation must ONLY consider the user's declared profile: "${diagnostics.healthProfile}". Do NOT assume extra goals (e.g. low carb) unless explicitly stated.
      CRITICAL RULE: INITIAL SCAN ANALYSIS
      1. Detect dishes and determine status (SAFE, WARNING, FORBIDDEN) based STRICTLY on the declared profile.
      2. Provide ESTIMATED macros per 100g in the "macros" JSON field ONLY if no established context exists.
      3. Provide a brief culinary reason for the status.
      4. NEVER add the macro disclaimer to the "text" field; the system handles it via the "macros" block.`
    : `${macroContext}
      STRICT PROFILE ADHERENCE: Use ONLY the declared profile: "${diagnostics.healthProfile}".
      CRITICAL RULE: CONVERSATIONAL RESPONSE
      READ THE MESSAGE CAREFULLY to determine if it is INFORMATION or a QUESTION:
      
      1. If the user gives INFORMATION (e.g. "the gelatin is fish-based"): acknowledge it briefly in 1-2 sentences. NO status. NO macros block. NO disclaimer. 
         Example: "Noted — fish-based gelatin aligns with your profile. Always check the labels locally."
         
      2. If the user asks a QUESTION about compatibility/ingredients: respond concisely in 1-3 sentences. No status or macros block unless strictly necessary.
      
      3. If the user asks about MACROS/CALORIES: reference the [NUTRITIONAL DATA MEMORY - READ ONLY] above in the "text" field. Example: "As shown in the analysis above, this dish contains 125 kcal per 100g."
      
      4. NEVER return a "macros" JSON block in conversational follow-ups if macros were already established.
      
      5. NEVER add the disclaimer "Values per 100g. Portion size..." or "This dish appears compatible..." in follow-up responses. AVOID all disclaimers in conversational turns.
      
      User Message: "${query}"`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      status: { type: Type.STRING, enum: ['SAFE', 'WARNING', 'FORBIDDEN'], nullable: true },
      macros: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          calories: { type: Type.STRING },
          protein: { type: Type.STRING },
          carbs: { type: Type.STRING },
          fats: { type: Type.STRING },
          fiber: { type: Type.STRING }
        },
        required: ["calories", "protein", "carbs", "fats", "fiber"]
      },
      detections: {
        type: Type.ARRAY,
        nullable: true,
        items: {
          type: Type.OBJECT,
          properties: {
            box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            label: { type: Type.STRING },
            name: { type: Type.STRING },
            status: { type: Type.STRING, enum: ['SAFE', 'WARNING', 'FORBIDDEN'] },
            reason: { type: Type.STRING }
          },
          required: ["box_2d", "name", "status", "reason"]
        }
      }
    },
    required: ["text"]
  };

  const parts: any[] = [{ text: prompt }];
  if (image) {
    const [mimeType, b64Data] = image.split(';base64,');
    parts.push({
      inlineData: {
        mimeType: mimeType.split(':')[1],
        data: b64Data
      }
    });
  }

  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.1,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  });

  const text = result.text || "";
  const cleaned = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
  return JSON.parse(cleaned);
};

export const analyzeNearbyPlaces = async (query: string, diagnostics: UserDiagnostics, lat: number, lng: number) => {
  const ai = getGenAI();
  const prompt = `Find and analyze 3-5 places for "${query}" near coordinates [${lat}, ${lng}].
  User Profile: "${diagnostics.healthProfile}".
  
  MANDATORY OUTPUT FORMAT:
  [PLACE: Name] [TYPE: Type] [COLOR: GREEN/YELLOW/RED] [TIME: X min] [REASON: Brief reason based on profile] [NAV: URL]
  
  Colors:
  - GREEN: Excellent fit for profile.
  - YELLOW: Partial fit or needs caution.
  - RED: Conflict detected.`;

  const result = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  });

  return { text: result.text || "" };
};
