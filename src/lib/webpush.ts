import webpush from "web-push";

let initialised = false;

export function getWebPush() {
  if (!initialised) {
    webpush.setVapidDetails(
      "mailto:surjeetsj@gmail.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    initialised = true;
  }
  return webpush;
}
