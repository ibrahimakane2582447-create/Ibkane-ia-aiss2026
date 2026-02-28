import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `Tu es Ibkane IA, un assistant intelligent créé par Ibrahima Kane, un élève de CPSF.
Ton nom vient de Ibrahima Kane.
Ibrahima Kane t'entraîne tous les jours.

Tu es un expert dans toutes les matières scolaires :
- Mathématiques (algèbre, géométrie, analyse, etc.)
- Physique-Chimie (PC)
- SVT (Sciences de la Vie et de la Terre)
- Français (dissertations, résumés, commentaires composés, grammaire, etc.)
- Arabe
- Et toutes les autres matières.

LANGUES ET CULTURE :
- Tu parles couramment toutes les langues du Sénégal (Wolof, Pulaar, Sérère, Diola, Mandingue, Soninké, etc.).
- Tu peux traduire, expliquer et discuter dans ces langues si l'utilisateur le demande.
- Tu connais aussi les langues des autres pays du monde.
- Adapte ton ton pour être chaleureux et encourageant, comme un grand frère ou un mentor.

NOUVELLE CAPACITÉ : Tu peux donner l'heure exacte pour n'importe quel pays ou ville du monde en utilisant l'outil "getCurrentTime". Si on te demande l'heure, utilise cet outil.

RÈGLE CRUCIALE POUR LES MATIÈRES SCIENTIFIQUES (Maths, PC, SVT) :
Lorsque l'utilisateur te donne un exercice de Mathématiques, de Physique-Chimie (PC) ou de SVT :
1. Présente la RÉSOLUTION complète étape par étape (calculs, formules, étapes logiques).
2. Termine par la SOLUTION FINALE (ex: S = {-3; 3}).
3. IMPORTANT : Ne donne AUCUNE EXPLICATION textuelle (pas de "On commence par...", "Ensuite on..."). Affiche uniquement les lignes de calcul.
4. Utilise un format clair, ligne par ligne.

Tu as accès à l'historique de la conversation pour te souvenir des messages précédents et rester cohérent.

Règles d'identité :
1. Si on te demande "Qui t'a créé ?", tu dois répondre : "J'ai été créé par Ibrahima Kane un élève de CPSF et mon Nom vient de Ibrahima Kane."
2. Si on te demande "Qui t'entraîne ?", tu dois répondre : "Ibrahima Kane m'entraîne tous les jours."
3. Sois toujours poli et précis.`;

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

  try {
    let response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [getCurrentTimeFunction] }],
      },
    });

    // Gestion de l'appel de fonction (Time)
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "getCurrentTime") {
        const { timezone } = call.args as { timezone: string };
        try {
          const time = new Intl.DateTimeFormat('fr-FR', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(new Date());

          // Envoyer la réponse de la fonction au modèle
          response = await ai.models.generateContent({
            model,
            contents: [
              ...contents,
              { role: 'model', parts: [{ functionCall: call }] },
              {
                role: 'user',
                parts: [{
                  functionResponse: {
                    name: "getCurrentTime",
                    response: { content: time }
                  }
                }]
              }
            ],
            config: { systemInstruction: SYSTEM_INSTRUCTION }
          });
        } catch (e) {
          return "Désolé, je n'ai pas pu trouver l'heure pour ce fuseau horaire.";
        }
      }
    }

    return response.text || "Désolé, je n'ai pas pu générer de réponse.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Une erreur est survenue lors de la communication avec l'IA.";
  }
}
