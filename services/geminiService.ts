
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UserDiagnostics, Recipe, MacroNutrients, DetectedItem } from "../types";

// Primary GenAI client (Google Gemini)
const getGenAI = (customKey?: string) => {
  let apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    try {
      apiKey = localStorage.getItem("GEMINI_API_KEY") || "";
    } catch {
      apiKey = "";
    }
  }
  if (!apiKey) {
    throw new Error("API Key non configurata. Tocca l'icona '?' (Guida) in alto per inserire la tua chiave.");
  }
  return new GoogleGenAI({ apiKey });
};

// Backup provider configuration
const getBackupConfig = () => {
  try {
    const provider = (localStorage.getItem("BACKUP_API_PROVIDER") as "grok" | "gemini" | "openrouter") || "grok";
    const apiKey = localStorage.getItem("BACKUP_API_KEY") || "";
    return { provider, apiKey };
  } catch {
    return { provider: "grok" as const, apiKey: "" };
  }
};

// Generic OpenAI-compatible chat completion for Grok (xAI) or OpenRouter
const callOpenAICompatible = async (messages: Array<{ role: string; content: string }>, jsonMode = false): Promise<string> => {
  const { provider, apiKey } = getBackupConfig();
  if (!apiKey) {
    throw new Error("Nessuna chiave di backup configurata.");
  }

  const endpoint = provider === "openrouter" 
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.x.ai/v1/chat/completions";

  const model = provider === "openrouter" 
    ? "google/gemini-2.0-flash-001" 
    : "grok-2-latest";

  const body: any = {
    model,
    messages,
    temperature: jsonMode ? 0.1 : 0.7
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...(provider === "openrouter" ? { "HTTP-Referer": "https://chef-omoikane.app", "X-Title": "Chef Omoikane" } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backup API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

const callWithRetry = async <T>(fn: () => Promise<T>, retries = 2, delay = 800): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    if (retries <= 0) {
      throw err;
    }
    console.warn(`[GEMINI_API_RETRY] Request failed. Retrying in ${delay}ms... (${retries} attempts left). Error:`, err);
    await new Promise(resolve => setTimeout(resolve, delay));
    return callWithRetry(fn, retries - 1, delay * 2);
  }
};

// Export ChatSession type for components
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

// Client-side cache for generated recipes (Key: JSON hash of diagnostics)
const recipeCache = new Map<string, Recipe>();

export const generateRecipe = async (diagnostics: UserDiagnostics): Promise<Recipe> => {
  const cacheKey = JSON.stringify({
    dish: (diagnostics.targetDish || "").trim().toLowerCase(),
    lang: diagnostics.language,
    profile: (diagnostics.healthProfile || "").trim().toLowerCase(),
    ingredients: (diagnostics.ingredients || "").trim().toLowerCase(),
    prefs: (diagnostics.preferences || "").trim().toLowerCase()
  });

  if (recipeCache.has(cacheKey)) {
    console.log("[RECIPE_CACHE_HIT] Instant return from client cache (0 tokens)");
    return JSON.parse(JSON.stringify(recipeCache.get(cacheKey)));
  }

  const ai = getGenAI();
  const prompt = `Genera ricetta per: ${diagnostics.targetDish || "un piatto sorpresa"}. 
  LINGUA: ${diagnostics.language}. 
  Profilo Gastronomico: ${diagnostics.healthProfile}.
  
  MANDATORY - INGREDIENT USAGE:
  1. You MUST check the following list of available ingredients: "${diagnostics.ingredients || 'None provided'}".
  2. If ingredients are provided, you MUST use them as the primary components of the recipe. DO NOT suggest ingredients that the user does not have, unless they are basic pantry staples (salt, oil, water).
  3. If NO ingredients are provided, suggest a dish based on the target theme or seasonal availability.
  
  MANDATORY - USER PREFERENCES:
  1. The user has specified the following preferences (texture, spice level, sweetness, ingredient substitutions, or other free-form requests): "${diagnostics.preferences || 'None specified'}".
  2. If preferences are provided, you MUST actively incorporate them into the recipe (e.g. adjust texture, spice level, sweetness, or substitute ingredients as requested), as long as they do not conflict with the "Profilo Gastronomico" or available ingredients constraints above.
  3. If a preference conflicts with the dietary profile or available ingredients, prioritize safety/availability and briefly note the trade-off in the 'dietaryFit' field.
  
  MANDATORY - NUTRITIONAL DATA:
  1. ALL macro values (calories, protein, carbs, fats, fiber) MUST be calculated PER 100G of the final dish.
  2. DO NOT provide total values for the entire recipe output.
  
  MANDATORY - CONTENT RESTRICTIONS:
  1. DO NOT use medical or therapeutic language (e.g., replace "low glycemic" with "selected for its specific texture and profile alignment", replace "stabilizes blood sugar" with "aligns with your gastronomic preferences").
  2. AVOID terms like: "insulin", "diabetes", "anti-inflammatory", "healing", "preventative".
  3. The 'dietaryFit' field MUST be focused on the "ABOUT THIS DISH" concept and avoid nutritional claims like "designed for satiety", "high volume", or specific ingredient concentration levels (e.g. "low sugar", "lower sugar"). Focus on culinary style, flavor harmony, and why it matches the user's gastronomic profile.
  4. The 'scienceCheck' field MUST focus ONLY on gastronomic pairings, why flavors work together, and texture analysis from a biochemical cooking perspective (e.g., Maillard reaction, emulsification), NOT medical benefits.
  5. Be factual and chef-oriented. Avoid health claims.
  6. TONE: Write in a warm, friendly, down-to-earth tone - like a knowledgeable friend explaining why a dish works, not a pretentious fine-dining menu description. AVOID showy, self-congratulatory adjectives like "sophisticated", "premium", "exquisite", "refined palate", or phrases that sound like marketing copy. Keep it simple, direct, and genuine.
  
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
    const result = await callWithRetry(() => ai.models.generateContent({
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
    }));
    
    const text = result.text || "";
    const cleaned = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    const parsedRecipe = JSON.parse(cleaned);
    recipeCache.set(cacheKey, parsedRecipe);
    return parsedRecipe;
  } catch (primaryErr) {
    console.warn("[PRIMARY_RECIPE_GEN_FAILED] Attempting fallback to backup provider...", primaryErr);
    const { provider, apiKey: backupKey } = getBackupConfig();

    if (backupKey) {
      if (provider === "gemini") {
        try {
          const backupAi = getGenAI(backupKey);
          const backupResult = await callWithRetry(() => backupAi.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
              systemInstruction: getSystemInstruction(diagnostics.language),
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.1
            }
          }));
          const text = backupResult.text || "";
          const cleaned = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
          return JSON.parse(cleaned);
        } catch (backupErr) {
          console.error("[BACKUP_GEMINI_FAILED]", backupErr);
        }
      } else {
        // Grok or OpenRouter fallback
        try {
          const sys = getSystemInstruction(diagnostics.language) + "\nRestituisci ESCLUSIVAMENTE un JSON valido conforme alla struttura della ricetta con i campi: title, dietaryFit, cookingTime, allergenWarning, allergenSeverity, ingredients, procedure, scienceCheck, macros.";
          const jsonStr = await callOpenAICompatible([
            { role: "system", content: sys },
            { role: "user", content: prompt }
          ], true);
          const cleaned = jsonStr.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
          return JSON.parse(cleaned);
        } catch (backupErr) {
          console.error("[BACKUP_OPENAI_COMPATIBLE_FAILED]", backupErr);
        }
      }
    }

    console.error("[RECIPE_PARSE_ERROR]", primaryErr);
    throw primaryErr;
  }
};

export const createRecipeChat = (recipe: Recipe, diagnostics: UserDiagnostics) => {
  const ai = getGenAI();
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: [],
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language) + `\nStai parlando con l'utente riguardo alla ricetta che hai appena generato. Rispondi alle sue domande sempre restando in personaggio.

      RICETTA ATTUALE (dati completi - usa SEMPRE questi per rispondere a qualsiasi domanda sulla ricetta, non inventare nulla):
      ${JSON.stringify(recipe)}

      PROTOCOLLO AZIONE:
      Se l'utente vuole iniziare a cucinare o chiede di tornare alla sintesi, concludi il tuo messaggio con la stringa esatta: [ACTION:PREPARE_SYNTHESIS]

      PROTOCOLLO MODIFICA RICETTA:
      Se l'utente chiede esplicitamente di modificare la ricetta (es. "rendila senza glutine", "raddoppia le dosi", "sostituisci le noci con semi", "rendila piu piccante", "aggiungi un contorno"), DEVI:
      1. Rispondere normalmente in linguaggio naturale confermando la modifica richiesta.
      2. Alla fine del messaggio, accodare su UNA SOLA RIGA un blocco JSON con la ricetta COMPLETA aggiornata (copia identici tutti i campi che NON sono cambiati), in questo formato esatto:
      [RECIPE_UPDATE:{"title":"...","dietaryFit":"...","ingredients":[{"name":"...","amount":"...","function":"..."}],"procedure":["...","..."],"scienceCheck":"...","macros":{"calories":"...","protein":"...","carbs":"...","fats":"...","fiber":"..."},"cookingTime":"...","allergenWarning":"...","allergenSeverity":"high|low|null"}]
      3. Ricalcola le macro per 100g del piatto risultante in modo coerente con la modifica richiesta.
      4. NON aggiungere il blocco [RECIPE_UPDATE:...] se l'utente fa solo una domanda informativa, senza chiedere una modifica reale.
      5. Rispetta sempre il profilo dietetico dell'utente ("${diagnostics.healthProfile}") anche nelle modifiche - se la modifica richiesta confligge col profilo, segnalalo nel testo invece di applicarla ciecamente.

      REGOLA SEPARAZIONE CONTENUTI (MANDATORY):
      Quando rispondi in linguaggio naturale, NON intrecciare nella stessa frase il racconto gastronomico/profilo del piatto (perche funziona, abbinamenti di sapori, stile culinario) con i valori numerici nutrizionali (calorie, proteine, carboidrati, grassi, fibre). Se devi citare numeri nutrizionali, scrivili in una frase o riga separata e chiara (es. "Per 100g: 180 kcal, 12g proteine, 14g carboidrati, 8g grassi, 2g fibre."), mai mescolati nella stessa frase della descrizione gastronomica. Le due cose vanno sempre tenute visivamente e concettualmente distinte, anche in una risposta breve.`,
      temperature: 0.7,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  });
  const originalSendMessage = chat.sendMessage.bind(chat);
  chat.sendMessage = async (args: any) => {
    try {
      return await callWithRetry(() => originalSendMessage(args));
    } catch (primaryErr) {
      console.warn("[PRIMARY_RECIPE_CHAT_FAILED] Attempting fallback to backup provider...", primaryErr);
      const { provider, apiKey: backupKey } = getBackupConfig();
      if (backupKey) {
        if (provider === "gemini") {
          try {
            const backupAi = getGenAI(backupKey);
            const backupChat = backupAi.chats.create({
              model: "gemini-3-flash-preview",
              history: [],
              config: {
                systemInstruction: getSystemInstruction(diagnostics.language) + `\nStai parlando con l'utente riguardo alla ricetta "${recipe.title}".`
              }
            });
            return await backupChat.sendMessage(args);
          } catch (e) {
            console.error("[BACKUP_GEMINI_CHAT_FAILED]", e);
          }
        } else {
          try {
            const userText = typeof args === "string" ? args : args?.message || JSON.stringify(args);
            const reply = await callOpenAICompatible([
              { role: "system", content: getSystemInstruction(diagnostics.language) + `\nRicetta: ${recipe.title}` },
              { role: "user", content: userText }
            ]);
            return { text: reply };
          } catch (e) {
            console.error("[BACKUP_OPENAI_CHAT_FAILED]", e);
          }
        }
      }
      throw primaryErr;
    }
  };
  return chat;
};

export const createAssistantChat = (diagnostics: UserDiagnostics, appContext?: string) => {
  const ai = getGenAI();
  const contextBlock = appContext
    ? `\n\nCONTESTO ATTUALE DELL'APP:\n${appContext}`
    : "";
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    history: [],
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language) + `\nSei l'assistente di Chef Omoikane.${contextBlock}
      
      ASSISTANT PROTOCOL:
      1. Answer ALL culinary and food-related questions. NEVER refuse.
      2. If a medical condition is mentioned, provide a gastronomic/nutritional answer first.
      3. MANDATORY: Include the line "For medical dietary advice, always consult your doctor or dietitian." (translated in ${diagnostics.language}) within the response.
      4. Suggest a recipe or a pairing if applicable.
      5. ACTION USE: 
         - Se l'utente vuole cucinare qualcosa, iniziare una nuova ricetta, includi alla fine: [SYNTHESIS_DATA:{"targetDish":"...","dietaryProfile":"...","ingredients":"...","additionalSpecs":"..."}]
         - Se l'utente chiede come scansionare un prodotto, includi: [SCANNER_DATA:{"dietaryProfile":"...","additionalSpecs":"..."}]
         - Se l'utente vuole trovare un posto dove mangiare, includi: [ACTION:OPEN_LOCATOR]`,
      temperature: 0.7,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  });
  const originalSendMessage = chat.sendMessage.bind(chat);
  chat.sendMessage = async (args: any) => {
    try {
      return await callWithRetry(() => originalSendMessage(args));
    } catch (primaryErr) {
      console.warn("[PRIMARY_ASSISTANT_CHAT_FAILED] Attempting fallback to backup provider...", primaryErr);
      const { provider, apiKey: backupKey } = getBackupConfig();
      if (backupKey) {
        if (provider === "gemini") {
          try {
            const backupAi = getGenAI(backupKey);
            const backupChat = backupAi.chats.create({
              model: "gemini-3-flash-preview",
              history: [],
              config: {
                systemInstruction: getSystemInstruction(diagnostics.language) + `\nSei l'assistente di Chef Omoikane.`
              }
            });
            return await backupChat.sendMessage(args);
          } catch (e) {
            console.error("[BACKUP_GEMINI_ASSISTANT_FAILED]", e);
          }
        } else {
          try {
            const userText = typeof args === "string" ? args : args?.message || JSON.stringify(args);
            const reply = await callOpenAICompatible([
              { role: "system", content: getSystemInstruction(diagnostics.language) + "\nSei l'assistente di Chef Omoikane." },
              { role: "user", content: userText }
            ]);
            return { text: reply };
          } catch (e) {
            console.error("[BACKUP_OPENAI_ASSISTANT_FAILED]", e);
          }
        }
      }
      throw primaryErr;
    }
  };
  return chat;
};

export const extractIngredientsFromImage = async (imageBase64: string, lang: string): Promise<string[]> => {
  const ai = getGenAI();
  const [mimeType, b64Data] = imageBase64.split(';base64,');
  
  const prompt = "Identify all food ingredients visible in this image. Return a simple list of ingredient names, comma separated. Only the names, no other text.";
  
  const result = await callWithRetry(() => ai.models.generateContent({
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
  }));

  const text = result.text || "";
  return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
};

export const analyzeHealthOrMenu = async (query: string, diagnostics: UserDiagnostics, image?: string, existingMacros?: MacroNutrients, existingDetections?: DetectedItem[], originalSummary?: string) => {
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

  const detectionsContext = existingDetections && existingDetections.length > 0
    ? `\n[DETECTED ITEMS MEMORY - READ ONLY]
       The following items have ALREADY been detected and analyzed in this session, from one or more photos taken/uploaded so far:
       ${existingDetections.map(d => `- ${d.name} (status: ${d.status})`).join('\n       ')}
       
       CRITICAL GROUNDING RULE: You may ONLY reference, compare, evaluate, or recommend among THESE items. NEVER invent, assume, or mention any dish, ingredient, or menu item that is NOT in this list. If the user asks for a recommendation or comparison, choose ONLY from this list. If you do not have enough information in this list to answer precisely, say so honestly instead of guessing or making something up.`
    : "";

  const originalSummaryContext = originalSummary
    ? `\n[ORIGINAL ANALYSIS SUMMARY - FOR REVISION IF NEEDED]
       The original overall summary narrative written for this multi-item analysis was: "${originalSummary}"
       If your itemUpdate meaningfully changes the picture (e.g. an item is no longer a concern, or a new concern appears), revise this into "updatedSummary" inside itemUpdate so it stays consistent with the correction. If the original summary doesn't need to change, leave updatedSummary null.`
    : "";

  const prompt = image 
    ? `${macroContext}
      STRICT PROFILE ADHERENCE: Evaluation must ONLY consider the user's declared profile: "${diagnostics.healthProfile}". Do NOT assume extra goals (e.g. low carb) unless explicitly stated.
      CRITICAL RULE: INITIAL SCAN ANALYSIS
      0. EXHAUSTIVE DETECTION (MANDATORY, HIGHEST PRIORITY): If the image shows a menu, a list, a shelf, or any scene with multiple distinct food/dish items, you MUST detect and return EVERY SINGLE visible item in the 'detections' array — not a sample, not just the clearest or most relevant ones. Real-world menus can contain 10 to 40+ items. Scan the entire image systematically, section by section, top to bottom and left to right. Returning only a partial subset of visible items is considered a FAILURE of this task. Do not stop early, do not summarize, do not pick 'representative' examples.
      0b. BOUNDING BOX PRECISION (MANDATORY): Each box_2d must tightly hug the actual visual boundaries of that single item only - not a loose region, not multiple items, not empty margin. If an item has both a small food photo and a separate text label, the box should cover just that pairing, not the whole row or column it sits in.
      1. Detect dishes and determine status (SAFE, WARNING, FORBIDDEN) based STRICTLY on the declared profile.
      2. MACROS PLACEMENT LOGIC (MANDATORY) - First classify the image into one of these three types:
         TYPE "MENU": a printed/handwritten restaurant menu, price list, or shelf of separate packaged products, where each detected item is an independent, mutually-exclusive choice the user will pick ONE of (not eat all together).
         TYPE "SINGLE DISH": a photograph of one single prepared dish or one single product only.
         TYPE "COMPOSITE DISH": a photograph of an actual plate/bowl/plated meal containing multiple visible food components that together form ONE single dish, meant to be eaten TOGETHER as a single meal (e.g. a breakfast bowl with yogurt, fruit and granola; a salad with multiple visible ingredients; a charcuterie board).

         Then apply:
         - TYPE "MENU": DO NOT fill the top-level "macros" field (leave it null/omit it). Provide an ESTIMATED macros per 100g object INSIDE EACH item of the "detections" array, for comparing the separate choices.
         - TYPE "SINGLE DISH": provide the macros estimate per 100g in the TOP-LEVEL "macros" field. Leave per-item "macros" empty (it would just duplicate the top-level value).
         - TYPE "COMPOSITE DISH": provide BOTH of the following: (a) ONE estimated macros per 100g object in the TOP-LEVEL "macros" field representing the AGGREGATE/COMBINED nutritional profile of the ENTIRE composed dish as eaten together, AND (b) an ESTIMATED macros per 100g object INSIDE EACH individual item of the "detections" array, representing that SPECIFIC component estimated in isolation from the rest of the dish - so the user can inspect both the whole-dish total and each ingredient separately.
         - For TYPE "MENU" and TYPE "SINGLE DISH": never fill both the top-level field and per-item fields at once. For TYPE "COMPOSITE DISH": both the top-level field and the per-item fields are intentionally different numbers (whole-dish total vs single-component estimate) and BOTH must be present.
      3. Provide a brief culinary reason for the status.
      4. NEVER add the macro disclaimer to the "text" field; the system handles it via the "macros" block.`
    : `${macroContext}${detectionsContext}${originalSummaryContext}
      STRICT PROFILE ADHERENCE: Use ONLY the declared profile: "${diagnostics.healthProfile}".
      CRITICAL RULE: CONVERSATIONAL RESPONSE
      READ THE MESSAGE CAREFULLY to determine if it is INFORMATION or a QUESTION:
      
      1. If the user gives INFORMATION about a SPECIFIC previously-detected item (e.g. "the gelatin is fish-based", "that jello is sugar-free", "the soup has no nuts"):
         a. Acknowledge it briefly in 1-2 sentences in the "text" field. NO status. NO macros block in the top-level fields. NO disclaimer.
         b. If this new information changes how that item should be classified (status SAFE/WARNING/FORBIDDEN) or its macros, AND you can identify EXACTLY ONE matching item from the [DETECTED ITEMS MEMORY - READ ONLY] list above, populate the "itemUpdate" field with: the item's "name" copied EXACTLY as it appears in that list, the corrected "status", a short "reason" reflecting the new information, and updated "macros" only if the new information changes the nutritional estimate (otherwise leave macros null).
         c. If a [ORIGINAL ANALYSIS SUMMARY] is provided above and this correction meaningfully changes the overall picture of a composite dish, ALSO populate "updatedSummary" (a revised 1-3 sentence version of that summary, consistent with the correction) and "updatedAggregateMacros" (revised total macros per 100g, if estimable) inside itemUpdate. Otherwise leave both null.
         d. If you are NOT sure which exact item the user means (ambiguous, multiple similar items, or no clear match in the list), do NOT guess - leave "itemUpdate" null and ask a brief clarifying question in the "text" field instead.
         e. If the new information does not actually change the item's classification, leave "itemUpdate" null.
         Example: "Noted — sugar-free changes things, updating it to a safer pick for you."
         
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
        description: "Per-100g estimate for EITHER a single dish/product, OR the AGGREGATE/COMBINED total of a composite multi-component dish meant to be eaten together. Do NOT use this field for separate menu choices - use the per-item macros in detections instead for that case.",
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
        description: "MANDATORY: Include EVERY distinct food/dish item visible in the image. Do not omit any item, even if there are many (10-40+). Partial lists are not acceptable.",
        items: {
          type: Type.OBJECT,
          properties: {
            box_2d: { 
              type: Type.ARRAY, 
              items: { type: Type.NUMBER },
              description: "MANDATORY: Bounding box coordinates normalized to a 0-1000 scale, represented as [ymin, xmin, ymax, xmax] where 0 is top/left and 1000 is bottom/right. E.g. [150, 200, 350, 450]. Must contain exactly 4 numbers. PRECISION (MANDATORY): the box must tightly enclose ONLY this specific item (its food image and/or its name label, whichever is relevant), with minimal margin. Do NOT include neighboring items, large empty space, or unrelated text inside the box. Re-check each box against the actual pixel boundaries of the item before finalizing it."
            },
            label: { type: Type.STRING },
            name: { type: Type.STRING },
            status: { type: Type.STRING, enum: ['SAFE', 'WARNING', 'FORBIDDEN'] },
            reason: { type: Type.STRING },
            macros: {
              type: Type.OBJECT,
              nullable: true,
              description: "Estimated macro nutrients per 100g for THIS SPECIFIC item, estimated in isolation. Populate this for separate alternative menu items (for comparison) AND for individual components of a composite dish (so each ingredient can be inspected on its own). Only leave this empty when the image shows a single standalone dish/product with no other detected items.",
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
          required: ["box_2d", "name", "status", "reason"]
        }
      },
      itemUpdate: {
        type: Type.OBJECT,
        nullable: true,
        description: "Use ONLY when the user provides new information about a SPECIFIC, exactly-identified previously-detected item that changes its status or macros. The 'name' must match an existing detected item's name exactly. Leave null in all other cases, including when ambiguous which item is meant.",
        properties: {
          name: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['SAFE', 'WARNING', 'FORBIDDEN'] },
          reason: { type: Type.STRING },
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
          updatedSummary: {
            type: Type.STRING,
            nullable: true,
            description: "A revised version of the overall composite-dish summary narrative, only if the [ORIGINAL ANALYSIS SUMMARY] context was provided and this correction meaningfully changes it. Otherwise null."
          },
          updatedAggregateMacros: {
            type: Type.OBJECT,
            nullable: true,
            description: "Revised total macros per 100g for the whole composite dish, only if applicable and estimable. Otherwise null.",
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
        required: ["name", "status", "reason"]
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

  const result = await callWithRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.1,
      maxOutputTokens: 8192,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  }));

  const text = result.text || "";
  const cleaned = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
  return JSON.parse(cleaned);
};

export const analyzeNearbyPlaces = async (query: string, diagnostics: UserDiagnostics, lat: number, lng: number) => {
  const ai = getGenAI();
  const prompt = `Find and analyze 3-5 REAL places for "${query}" near coordinates [${lat}, ${lng}]. Do NOT invent or estimate place names from general knowledge - search for real places and evaluate them based on the user's profile.
  User Profile: "${diagnostics.healthProfile}".
  
  MANDATORY OUTPUT FORMAT:
  [PLACE: Name] [TYPE: Type] [COLOR: GREEN/YELLOW/RED] [REASON: Brief reason based on profile] [NAV: URL]
  
  Colors:
  - GREEN: Excellent fit for profile.
  - YELLOW: Partial fit or needs caution.
  - RED: Conflict detected.`;

  // Try 1: Google Maps Grounding Tool
  try {
    const result = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find and analyze 3-5 REAL places for "${query}" near coordinates [${lat}, ${lng}], using the Google Maps grounding tool available to you. Do NOT invent or estimate place names from general knowledge - you MUST use the real data retrieved by the Maps grounding tool for every place you mention.
      
      ${prompt}`,
      config: {
        systemInstruction: getSystemInstruction(diagnostics.language),
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      },
    }));
    if (result.text && result.text.includes("[PLACE:")) {
      return { text: result.text };
    }
  } catch (mapsErr) {
    console.warn("[MAPS_TOOL_FAILED] Falling back to Google Search grounding...", mapsErr);
  }

  // Try 2: Google Search Grounding Tool (highly supported)
  try {
    const searchPrompt = `Using Google Search, search for real ${query} near coordinates [${lat}, ${lng}] and analyze them.
    
    ${prompt}`;
    const result = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: searchPrompt,
      config: {
        systemInstruction: getSystemInstruction(diagnostics.language),
        tools: [{ googleSearch: {} }],
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      },
    }));
    if (result.text && result.text.includes("[PLACE:")) {
      return { text: result.text };
    }
  } catch (searchErr) {
    console.warn("[SEARCH_TOOL_FAILED] Falling back to standard generation...", searchErr);
  }

  // Try 3: Standard generation (no tools)
  const fallbackPrompt = `Search your knowledge base for 3-5 real, well-known ${query} near coordinates [${lat}, ${lng}] (approximate location) and analyze them.
  
  ${prompt}`;
  const result = await callWithRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: fallbackPrompt,
    config: {
      systemInstruction: getSystemInstruction(diagnostics.language),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
  }));

  return { text: result.text || "" };
};
