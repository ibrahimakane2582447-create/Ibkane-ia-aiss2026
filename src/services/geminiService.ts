import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `Tu es Ibkane IA, un assistant intelligent et polyvalent créé par Ibrahima Kane, un élève du CPSF (Cours Privés Source de la Fontaine).
Ton nom "Ibkane" est le diminutif de Ibrahima Kane.
Ibrahima Kane est ton créateur et ton entraîneur quotidien.

COMPÉTENCES :
- Expert dans toutes les matières scolaires (Mathématiques, Physique-Chimie, SVT, Français, Arabe, etc.).
- Maîtrise parfaite des langues du Sénégal (Wolof, Pulaar, Sérère, Diola, Mandingue, Soninké, etc.) et du monde.
- Capable de donner l'heure exacte partout dans le monde.
- Capable de générer des images créatives sur demande.

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

export interface GeminiResponse {
  text: string;
  generatedImages?: string[];
}

export async function generateResponse(prompt: string, imageBase64?: string, history: { role: 'user' | 'assistant', content: string }[] = []): Promise<GeminiResponse> {
  // ---------------------------------------------------------
  // ZONE DE CONFIGURATION FACILE
  // ---------------------------------------------------------
  // Remplacez la phrase entre guillemets ci-dessous par votre vraie clé API (ex: "AIzaSy...")
  const HARDCODED_KEY = ""; 
  
  // Le code choisira automatiquement la meilleure méthode
  const apiKey = HARDCODED_KEY || import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  // ---------------------------------------------------------
  
  if (!apiKey || apiKey === "") {
    return { text: "Erreur : Clé API manquante. Ouvrez le fichier 'src/services/geminiService.ts' et collez votre clé à la ligne 86." };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Détecter si l'utilisateur demande une image
  const isImageRequest = prompt.toLowerCase().includes("génère") || 
                         prompt.toLowerCase().includes("image") || 
                         prompt.toLowerCase().includes("dessine") ||
                         prompt.toLowerCase().includes("crée une image");

  // Utiliser gemini-3-flash-preview pour les outils (recherche, heure)
  // Utiliser gemini-2.5-flash-image pour la génération d'images
  const model = isImageRequest ? "gemini-2.5-flash-image" : "gemini-3-flash-preview"; 
  
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
  const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}\n\nCONTEXTE TEMPOREL : Nous sommes le ${currentDateTimeStr}. Si l'utilisateur demande l'heure d'un autre pays, utilise tes outils.
  
  CAPACITÉ DE GÉNÉRATION D'IMAGES : Tu peux générer des images si l'utilisateur le demande. Décris simplement l'image que tu veux créer si l'utilisateur demande "génère une image de...".`;

  try {
    const config: any = {
      systemInstruction: dynamicSystemInstruction,
    };

    // N'ajouter les outils que si ce n'est pas un modèle de génération d'images
    if (!isImageRequest) {
      config.tools = [
        { functionDeclarations: [getCurrentTimeFunction] },
        { googleSearch: {} }
      ];
    }

    let response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    // Boucle de gestion des appels de fonctions (jusqu'à 2 itérations pour éviter les boucles infinies)
    let iterations = 0;
    while (response.functionCalls && response.functionCalls.length > 0 && iterations < 2 && !isImageRequest) {
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
        break; 
      }
    }

    let textResponse = "";
    const generatedImages: string[] = [];

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          textResponse += part.text;
        } else if (part.inlineData) {
          generatedImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }
    }
    
    // Ajouter les sources de recherche si disponibles
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      textResponse += "\n\n**Sources :**\n";
      chunks.forEach((chunk: any, index: number) => {
        if (chunk.web) {
          textResponse += `${index + 1}. [${chunk.web.title}](${chunk.web.uri})\n`;
        }
      });
    }

    return {
      text: textResponse || (generatedImages.length > 0 ? "" : "Désolé, je n'ai pas pu générer de réponse."),
      generatedImages: generatedImages.length > 0 ? generatedImages : undefined
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Une erreur est survenue lors de la communication avec l'IA." };
  }
}
