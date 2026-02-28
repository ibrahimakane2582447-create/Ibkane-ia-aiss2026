import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `Tu es Ibkane IA, un assistant intelligent et polyvalent créé par Ibrahima Kane, un élève du CPSF (Cours Privés Source de la Fontaine).
Ton nom "Ibkane" est le diminutif de Ibrahima Kane.
Ibrahima Kane est ton créateur et ton entraîneur quotidien.

COMPÉTENCES :
- Expert dans toutes les matières scolaires (Mathématiques, Physique-Chimie, SVT, Français, Arabe, etc.).
- Maîtrise parfaite des langues du Sénégal (Wolof, Pulaar, Sérère, Diola, Mandingue, Soninké, etc.) et du monde.
- Capable de donner l'heure exacte partout dans le monde.

RÈGLES DE RÉPONSE POUR LES SCIENCES (Maths, PC, SVT) :
1. Pour tout exercice, fournis une résolution complète, étape par étape.
2. Termine toujours par la solution finale clairement identifiée.
3. Sois direct : évite les longs discours d'introduction. Concentre-toi sur les calculs et la logique.

RÈGLES D'IDENTITÉ :
- Créateur : Ibrahima Kane (élève au Cours Privés Source de la Fontaine - CPSF).
- Entraîneur : Ibrahima Kane.
- Ton : Chaleureux, encourageant et précis.

OUTILS :
- Utilise "getCurrentTime" pour l'heure locale si tu connais le fuseau horaire.
- Utilise "googleSearch" pour toute information en temps réel, y compris l'heure si nécessaire.`;

// Outil pour obtenir l'heure
const getCurrentTimeFunction = {
  name: "getCurrentTime",
  parameters: {
    type: Type.OBJECT,
    description: "Obtient l'heure actuelle pour un fuseau horaire spécifique (ex: 'Africa/Dakar', 'Europe/Paris', 'America/New_York').",
    properties: {
      timezone: {
        type: Type.STRING,
        description: "Le fuseau horaire au format IANA (ex: 'Africa/Dakar'). Si l'utilisateur donne un pays, devine le fuseau horaire principal.",
      },
    },
    required: ["timezone"],
  },
};

export async function generateResponse(prompt: string, imageBase64?: string, history: { role: 'user' | 'assistant', content: string }[] = []) {
  // ---------------------------------------------------------
  // ZONE DE CONFIGURATION FACILE
  // ---------------------------------------------------------
  // Remplacez la phrase entre guillemets ci-dessous par votre vraie clé API (ex: "AIzaSy...")
  const HARDCODED_KEY = ""; 
  
  // Le code choisira automatiquement la meilleure méthode
  const apiKey = HARDCODED_KEY || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  // ---------------------------------------------------------
  
  if (!apiKey || apiKey === "") {
    return "Erreur : Clé API manquante. Ouvrez le fichier 'src/services/geminiService.ts' et collez votre clé à la ligne 86.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview"; 
  
  const contents: any[] = [];
  
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  const currentParts: any[] = [];
  if (imageBase64) {
    currentParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64.split(",")[1] || imageBase64,
      },
    });
  }
  
  currentParts.push({ text: prompt || "Analyse cette image et aide-moi avec l'exercice." });
  
  contents.push({
    role: 'user',
    parts: currentParts
  });

  const now = new Date();
  const currentDateTimeStr = now.toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' }) + " (Heure du Sénégal)";
  const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}\n\nCONTEXTE TEMPOREL : Nous sommes le ${currentDateTimeStr}. Si l'utilisateur demande l'heure d'un autre pays, utilise tes outils.`;

  try {
    let response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: dynamicSystemInstruction,
        tools: [
          { functionDeclarations: [getCurrentTimeFunction] },
          { googleSearch: {} }
        ],
      },
    });

    // Boucle de gestion des appels de fonctions (jusqu'à 2 itérations pour éviter les boucles infinies)
    let iterations = 0;
    while (response.functionCalls && response.functionCalls.length > 0 && iterations < 2) {
      iterations++;
      const call = response.functionCalls[0];
      
      if (call.name === "getCurrentTime") {
        const { timezone } = call.args as { timezone: string };
        try {
          const toolNow = new Date();
          const time = new Intl.DateTimeFormat('fr-FR', {
            timeZone: timezone || 'Africa/Dakar',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(toolNow);

          contents.push({ role: 'model', parts: [{ functionCall: call }] });
          contents.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: "getCurrentTime",
                response: { content: time, timezone: timezone },
                id: call.id
              }
            }]
          });

          response = await ai.models.generateContent({
            model,
            contents,
            config: { 
              systemInstruction: dynamicSystemInstruction,
              tools: [{ googleSearch: {} }] // On garde googleSearch au cas où
            }
          });
        } catch (e) {
          console.error("Tool Error:", e);
          break;
        }
      } else {
        // Si c'est un autre outil (comme googleSearch qui est géré automatiquement par le modèle en interne
        // mais on peut avoir besoin de renvoyer la réponse si le SDK ne le fait pas automatiquement)
        break; 
      }
    }

    let finalResponse = response.text || "";
    
    // Ajouter les sources de recherche si disponibles
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      finalResponse += "\n\n**Sources :**\n";
      chunks.forEach((chunk: any, index: number) => {
        if (chunk.web) {
          finalResponse += `${index + 1}. [${chunk.web.title}](${chunk.web.uri})\n`;
        }
      });
    }

    return finalResponse || "Désolé, je n'ai pas pu générer de réponse.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Une erreur est survenue lors de la communication avec l'IA.";
  }
}
