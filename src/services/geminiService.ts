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

export async function generateResponse(
  prompt: string, 
  imageBase64?: string, 
  history: { role: 'user' | 'assistant', content: string }[] = [],
  onChunk?: (text: string) => void
): Promise<GeminiResponse> {
  // ---------------------------------------------------------
  // ZONE DE CONFIGURATION FACILE
  // ---------------------------------------------------------
  // Remplacez la phrase entre guillemets ci-dessous par votre vraie clé API (ex: "AIzaSy...")
  const HARDCODED_KEY = ""; 
  
  // Le code choisira automatiquement la meilleure méthode
  // @ts-ignore
  const apiKey = HARDCODED_KEY || import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null);
  // ---------------------------------------------------------
  
  if (!apiKey || apiKey === "" || apiKey === "undefined") {
    return { text: "⚠️ Erreur : Clé API non détectée. Assurez-vous d'avoir configuré la variable d'environnement 'VITE_GEMINI_API_KEY' dans Vercel (n'oubliez pas le préfixe VITE_)." };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Détecter si l'utilisateur demande une image
  const isImageRequest = prompt.toLowerCase().includes("génère") || 
                         prompt.toLowerCase().includes("image") || 
                         prompt.toLowerCase().includes("dessine") ||
                         prompt.toLowerCase().includes("crée une image");

  // Utiliser gemini-3.1-pro-preview pour les outils et les réponses textuelles complexes
  // Utiliser gemini-2.5-flash-image pour la génération d'images
  const modelName = isImageRequest ? "gemini-2.5-flash-image" : "gemini-3.1-pro-preview"; 
  
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

    // Utiliser directement le streaming pour une réponse immédiate
    const streamResponse = await ai.models.generateContentStream({
      model: modelName,
      contents,
      config,
    });

    let fullText = "";
    let hasFunctionCall = false;

    for await (const chunk of streamResponse) {
      // Si on détecte un appel de fonction, on doit arrêter le stream et gérer l'appel
      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        hasFunctionCall = true;
        const call = chunk.functionCalls[0];
        
        if (call.name === "getCurrentTime") {
          const { timezone } = call.args as { timezone: string };
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

          // Après l'outil, on relance en stream pour la réponse finale
          const finalStream = await ai.models.generateContentStream({
            model: modelName,
            contents,
            config: { 
              systemInstruction: dynamicSystemInstruction,
              tools: [{ googleSearch: {} }]
            }
          });

          for await (const finalChunk of finalStream) {
            const finalChunkText = finalChunk.text || "";
            fullText += finalChunkText;
            if (onChunk) onChunk(fullText);
          }
          return { text: fullText };
        }
      }

      const chunkText = chunk.text || "";
      if (chunkText) {
        fullText += chunkText;
        if (onChunk) onChunk(fullText);
      }
    }

    // Gestion des images (si c'est une requête d'image, le stream contiendra les données inline)
    const generatedImages: string[] = [];
    // Note: Pour les images, on récupère généralement tout à la fin ou via les parts
    // Mais avec generateContentStream, les images arrivent dans les chunks.
    
    return {
      text: fullText || (isImageRequest ? "" : "Désolé, je n'ai pas pu générer de réponse."),
      generatedImages: generatedImages.length > 0 ? generatedImages : undefined
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    return { text: `⚠️ Erreur de communication avec l'IA : ${errorMessage}. Vérifiez votre clé API (VITE_GEMINI_API_KEY) et votre connexion.` };
  }
}
