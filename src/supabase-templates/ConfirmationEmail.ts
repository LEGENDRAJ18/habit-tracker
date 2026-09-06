/**
 * Confirmation email template for Supabase Auth.
 *
 * `buildConfirmationHtml(url)` – use directly from an API route.
 * `SUPABASE_CONFIRMATION_TEMPLATE`  – paste verbatim into:
 *   Supabase Dashboard → Authentication → Email Templates → Confirm signup
 */

export function buildConfirmationHtml(confirmationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Confirm your HabitAI account</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" style="width:100%;background:#0a0a0f;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0f0f1a;border:1px solid rgba(124,58,237,0.3);border-radius:24px;overflow:hidden;box-shadow:0 0 60px rgba(124,58,237,0.12);">

          <!-- Header / Logo -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(124,58,237,0.35),rgba(109,40,217,0.2));padding:32px 40px 28px;border-bottom:1px solid rgba(124,58,237,0.2);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="width:42px;height:42px;background:linear-gradient(135deg,#7c3aed,#9333ea);border-radius:12px;text-align:center;line-height:42px;font-size:20px;box-shadow:0 0 20px rgba(124,58,237,0.6);">
                      &#10024;
                    </div>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">habit<span style="color:#a78bfa;">AI</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:44px 40px 8px;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#7c3aed;letter-spacing:0.1em;text-transform:uppercase;">One step away</p>
              <h1 style="margin:0 0 16px;font-size:32px;font-weight:800;color:#ffffff;line-height:1.15;letter-spacing:-0.5px;">
                You&rsquo;re almost in! &#128293;
              </h1>
              <p style="margin:0;font-size:15px;color:#8b8fa8;line-height:1.7;">
                Click the button below to confirm your email and start building habits that actually stick.
                The link expires in&nbsp;<strong style="color:#c4b5fd;">24&nbsp;hours</strong>.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,0.35),transparent);"></div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:40px 40px 12px;">
              <a
                href="${confirmationUrl}"
                style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;padding:18px 52px;border-radius:14px;letter-spacing:0.01em;box-shadow:0 8px 40px rgba(124,58,237,0.5);"
              >
                Confirm my account &rarr;
              </a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td align="center" style="padding:0 40px 16px;">
              <p style="margin:12px 0 0;font-size:12px;color:#3d3d5c;">
                Button not working?&nbsp;
                <a href="${confirmationUrl}" style="color:#7c3aed;text-decoration:underline;word-break:break-all;">${confirmationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(124,58,237,0.2),transparent);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              <p style="margin:0 0 6px;font-size:13px;color:#4a4a6a;text-align:center;line-height:1.7;">
                With &#128156; The HabitAI Team
              </p>
              <p style="margin:0;font-size:11px;color:#2e2e48;text-align:center;line-height:1.7;">
                If you didn&rsquo;t create a HabitAI account you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Ready-to-paste HTML for the Supabase email template editor.
 * Uses `{{ .ConfirmationURL }}` — Supabase replaces this at send time.
 */
export const SUPABASE_CONFIRMATION_TEMPLATE = buildConfirmationHtml(
  "{{ .ConfirmationURL }}"
);
