import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

function buildWelcomeHtml(firstName: string): string {
  const tips = [
    {
      emoji: "✅",
      title: "Add your first habit",
      desc: "Start with one small habit. Even 5 minutes a day compounds into something remarkable.",
    },
    {
      emoji: "🔔",
      title: "Set a daily reminder",
      desc: "Turn on reminders in Settings so HabitAI nudges you at the perfect time — no excuses.",
    },
    {
      emoji: "⚡",
      title: "Earn XP and level up",
      desc: "Every habit you complete earns XP. Climb from Beginner to Grandmaster — make it a game.",
    },
  ];

  const tipRows = tips
    .map(
      (t) => `
    <tr>
      <td style="padding:0 0 16px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(109,40,217,0.08);border:1px solid rgba(109,40,217,0.18);border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:18px 20px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:40px;vertical-align:top;">
                    <div style="width:36px;height:36px;background:rgba(124,58,237,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:36px;text-align:center;">
                      ${t.emoji}
                    </div>
                  </td>
                  <td style="padding-left:14px;vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#ffffff;">${t.title}</p>
                    <p style="margin:0;font-size:13px;color:#8b8fa8;line-height:1.5;">${t.desc}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Welcome to HabitAI</title>
</head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:24px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(124,58,237,0.4),rgba(109,40,217,0.25));padding:32px 40px 28px;border-bottom:1px solid rgba(109,40,217,0.2);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="width:40px;height:40px;background:linear-gradient(135deg,#7c3aed,#9333ea);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                      <span style="font-size:20px;line-height:1;">✨</span>
                    </div>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">habit<span style="color:#a78bfa;">AI</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 8px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#7c3aed;letter-spacing:0.08em;text-transform:uppercase;">You&rsquo;re in! 🎉</p>
              <h1 style="margin:0 0 14px;font-size:30px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
                Welcome, ${firstName}!
              </h1>
              <p style="margin:0 0 0;font-size:15px;color:#8b8fa8;line-height:1.65;">
                You&rsquo;ve just taken the first step toward building habits that actually stick. Here&rsquo;s how to make the most of HabitAI from day one.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(109,40,217,0.3),transparent);"></div>
            </td>
          </tr>

          <!-- Tips heading -->
          <tr>
            <td style="padding:24px 40px 16px;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#6d28d9;letter-spacing:0.1em;text-transform:uppercase;">
                3 tips to get started
              </p>
            </td>
          </tr>

          <!-- Tips -->
          <tr>
            <td style="padding:0 40px;">
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                ${tipRows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:32px 40px 40px;">
              <a
                href="${APP_URL}/dashboard"
                style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:14px;letter-spacing:0.01em;box-shadow:0 8px 32px rgba(124,58,237,0.45);"
              >
                Go to Dashboard &rarr;
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:#3d3d5c;">
                Or visit <a href="${APP_URL}/dashboard" style="color:#7c3aed;text-decoration:none;">${APP_URL.replace(/^https?:\/\//, "")}/dashboard</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid rgba(109,40,217,0.12);">
              <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;line-height:1.7;">
                You&rsquo;re receiving this because you created a HabitAI account.<br />
                &copy; ${new Date().getFullYear()} HabitAI &nbsp;&middot;&nbsp;
                <a href="${APP_URL}/dashboard" style="color:#6d28d9;text-decoration:none;">Open app</a>
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

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const firstName = name.split(/[\s_\-+@]/)[0];
  const display = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  await resend.emails.send({
    from: "HabitAI <hello@habitai.app>",
    to: email,
    subject: "Welcome to HabitAI - Let's build something great 🔥",
    html: buildWelcomeHtml(display),
  });
}
