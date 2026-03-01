const IMAGE_LIMIT = 5;
const MESSAGE_LIMIT = 25;
const MESSAGE_RESET_MS = 2 * 60 * 60 * 1000; // 2 heures en millisecondes

interface UsageData {
  imageCount: number;
  imageResetTime: number;
  messageCount: number;
  messageResetTime: number;
}

function getNextMidnight(): number {
  const now = new Date();
  now.setHours(24, 0, 0, 0);
  return now.getTime();
}

export function getUsage(): UsageData {
  const data = localStorage.getItem('ibkane_usage');
  const now = Date.now();
  
  let usage: UsageData = data ? JSON.parse(data) : {
    imageCount: 0,
    imageResetTime: getNextMidnight(),
    messageCount: 0,
    messageResetTime: now + MESSAGE_RESET_MS,
  };

  let updated = false;

  // Réinitialisation des images à minuit
  if (now > usage.imageResetTime) {
    usage.imageCount = 0;
    usage.imageResetTime = getNextMidnight();
    updated = true;
  }

  // Réinitialisation des messages après 2 heures
  if (now > usage.messageResetTime) {
    usage.messageCount = 0;
    usage.messageResetTime = now + MESSAGE_RESET_MS;
    updated = true;
  }

  if (updated) {
    localStorage.setItem('ibkane_usage', JSON.stringify(usage));
  }

  return usage;
}

export function checkAndIncrementUsage(isImageGeneration: boolean): { allowed: boolean; reason?: string; resetTime?: number } {
  const usage = getUsage();
  const now = Date.now();

  if (isImageGeneration) {
    if (usage.imageCount >= IMAGE_LIMIT) {
      return { allowed: false, reason: 'image_limit', resetTime: usage.imageResetTime };
    }
    usage.imageCount++;
  } else {
    if (usage.messageCount >= MESSAGE_LIMIT) {
      return { allowed: false, reason: 'message_limit', resetTime: usage.messageResetTime };
    }
    
    // Démarrer le chrono de 2h au premier message de la session
    if (usage.messageCount === 0) {
      usage.messageResetTime = now + MESSAGE_RESET_MS;
    }
    usage.messageCount++;
  }

  localStorage.setItem('ibkane_usage', JSON.stringify(usage));
  return { allowed: true };
}
