const MAPPINGS: [RegExp | string, string][] = [
  [/row.level security/i,            "Something went wrong saving your profile. Please try again."],
  [/duplicate key/i,                 "That username is already taken. Please choose another."],
  [/unique constraint/i,             "That value is already in use. Please choose a different one."],
  [/JWT expired/i,                   "Your session expired. Please sign in again."],
  [/invalid JWT/i,                   "Your session is invalid. Please sign in again."],
  [/not authenticated/i,             "You need to be signed in to do that."],
  [/invalid login credentials/i,     "Incorrect email or password. Please try again."],
  [/email not confirmed/i,           "Please verify your email address before signing in."],
  [/user already registered/i,       "An account with this email already exists. Try signing in instead."],
  [/password should be at least/i,   "Password must be at least 6 characters."],
  [/over_email_send_rate_limit/i,    "Too many attempts. Please wait a few minutes and try again."],
  [/rate_limit/i,                    "Too many attempts. Please wait a moment and try again."],
  [/email rate limit/i,              "Too many email requests. Please wait before trying again."],
  [/network/i,                       "Network error. Please check your connection and try again."],
  [/failed to fetch/i,               "Could not connect. Please check your internet and try again."],
  [/foreign key/i,                   "Something went wrong. Please refresh and try again."],
  [/column .+ does not exist/i,      "Something went wrong on our end. Please try again."],
  [/permission denied/i,             "You don't have permission to do that."],
  [/relation .+ does not exist/i,    "Something went wrong on our end. Please try again."],
];

export function friendlyError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : "Something went wrong. Please try again.";

  for (const [pattern, friendly] of MAPPINGS) {
    if (typeof pattern === "string" ? msg.includes(pattern) : pattern.test(msg)) {
      return friendly;
    }
  }

  return "Something went wrong. Please try again.";
}
