const MAPPINGS: [RegExp | string, string][] = [
  [/row.level security/i,            "Something went wrong saving your profile. Please try again."],
  [/duplicate key/i,                 "That username is already taken. Please choose another."],
  [/JWT expired/i,                   "Your session expired. Please sign in again."],
  [/invalid JWT/i,                   "Your session is invalid. Please sign in again."],
  [/not authenticated/i,             "You need to be signed in to do that."],
  [/network/i,                       "Network error. Please check your connection and try again."],
  [/unique constraint/i,             "That value is already in use. Please choose a different one."],
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
