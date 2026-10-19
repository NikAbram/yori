export type TelegramImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type TelegramNotificationType = "error" | "success" | "warning";

let sdkPromise: Promise<typeof import("@tma.js/sdk")> | undefined;

function loadTelegramSdk() {
  sdkPromise ??= import("@tma.js/sdk");
  return sdkPromise;
}

export async function impactTelegram(style: TelegramImpactStyle = "light") {
  try {
    const { hapticFeedback, isTMA } = await loadTelegramSdk();
    if (isTMA()) hapticFeedback.impactOccurred.ifAvailable(style);
  } catch {
    // Haptics are an optional enhancement; browser behavior must stay unchanged.
  }
}

export async function notifyTelegram(type: TelegramNotificationType) {
  try {
    const { hapticFeedback, isTMA } = await loadTelegramSdk();
    if (isTMA()) hapticFeedback.notificationOccurred.ifAvailable(type);
  } catch {
    // Haptics are an optional enhancement; browser behavior must stay unchanged.
  }
}

export async function selectTelegram() {
  try {
    const { hapticFeedback, isTMA } = await loadTelegramSdk();
    if (isTMA()) hapticFeedback.selectionChanged.ifAvailable();
  } catch {
    // Haptics are an optional enhancement; browser behavior must stay unchanged.
  }
}
