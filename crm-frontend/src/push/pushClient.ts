import { pushApi } from "../api/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return await navigator.serviceWorker.register("/push-sw.js");
}

async function ensureSubscription() {
  const registration = await registerServiceWorker();
  if (!registration) return;

  const permission = Notification.permission;
  if (permission === "denied") return;
  if (permission === "default") {
    const granted = await Notification.requestPermission();
    if (granted !== "granted") return;
  }

  const keyResponse = await pushApi.publicKey();
  const publicKey = keyResponse.data?.publicKey;
  if (!publicKey) return;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await pushApi.subscribe({
    subscription: subscription.toJSON(),
    userAgent: navigator.userAgent,
  });
}

export const pushClient = {
  ensureSubscription,
};

