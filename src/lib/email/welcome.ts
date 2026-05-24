import { Resend } from "resend";

const resend  = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.habitaiapp.com";

function buildWelcomeHtml(firstName: string): string {
  const tips = [
    {
      emoji: "✅",
      title: "Add your first habit",
      desc:  "Start with one small habit. Even 5 minutes a day compounds into something remarkable.",
    },
    {
      emoji: "🔔",
      title: "Set a daily reminder",
      desc:  "Turn on reminders in Settings so HabitAI nudges you at the perfect time — no excuses.",
    },
    {
      emoji: "⚡",
      title: "Earn XP and level up",
      desc:  "Every habit you complete earns XP. Climb from Beginner to Grandmaster — make it a game.",
    },
  ];

  const tipRows = tips
    .map(
      (t) => `
    <tr>
      <td style="padding:0 0 14px;">
        <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(109,40,217,0.08);border:1px solid rgba(109,40,217,0.18);border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:16px 18px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:38px;vertical-align:top;">
                    <div style="width:34px;height:34px;background:rgba(124,58,237,0.2);border-radius:10px;font-size:17px;line-height:34px;text-align:center;">${t.emoji}</div>
                  </td>
                  <td style="padding-left:12px;vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#ffffff;">${t.title}</p>
                    <p style="margin:0;font-size:13px;color:#8b8fa8;line-height:1.5;">${t.desc}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`)
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
          <td style="background:linear-gradient(135deg,rgba(124,58,237,0.4),rgba(109,40,217,0.25));padding:30px 40px 26px;border-bottom:1px solid rgba(109,40,217,0.2);">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="width:40px;height:40px;background:linear-gradient(135deg,#7c3aed,#9333ea);border-radius:12px;display:inline-block;vertical-align:middle;text-align:center;line-height:40px;font-size:20px;">✨</div>
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
          <td style="padding:38px 40px 10px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#7c3aed;letter-spacing:0.1em;text-transform:uppercase;">Welcome aboard 🎉</p>
            <h1 style="margin:0 0 12px;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.4px;">
              Hey ${firstName}, you made it!
            </h1>
            <p style="margin:0 0 10px;font-size:15px;color:#a78bfa;font-weight:600;line-height:1.5;">
              You just joined thousands of people building better habits every day.
            </p>
            <p style="margin:0;font-size:14px;color:#8b8fa8;line-height:1.65;">
              HabitAI uses AI coaching to help you build habits that actually stick &mdash; no willpower required. Here&rsquo;s how to hit the ground running.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(109,40,217,0.35),transparent);"></div>
          </td>
        </tr>

        <!-- Tips heading -->
        <tr>
          <td style="padding:22px 40px 14px;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#6d28d9;letter-spacing:0.1em;text-transform:uppercase;">3 steps to get started</p>
          </td>
        </tr>

        <!-- Tips -->
        <tr>
          <td style="padding:0 40px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">${tipRows}</table>
          </td>
        </tr>

        <!-- Social proof strip -->
        <tr>
          <td style="padding:6px 40px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);border-radius:12px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;font-size:13px;color:#c4b5fd;text-align:center;line-height:1.5;">
                    &#11088;&nbsp; <strong style="color:#fff;">4.9/5 rating</strong>&nbsp;&nbsp;&middot;&nbsp;&nbsp;
                    &#128293;&nbsp; <strong style="color:#fff;">Thousands</strong> of daily streaks&nbsp;&nbsp;&middot;&nbsp;&nbsp;
                    &#129302;&nbsp; <strong style="color:#fff;">AI-powered</strong> coaching
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:32px 40px 38px;">
            <a href="${APP_URL}/dashboard"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:14px;letter-spacing:0.01em;box-shadow:0 8px 32px rgba(124,58,237,0.45);">
              Start Building Habits &rarr;
            </a>
            <p style="margin:14px 0 0;font-size:12px;color:#3d3d5c;">
              Or visit <a href="${APP_URL}" style="color:#7c3aed;text-decoration:none;">habitaiapp.com</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 40px 26px;border-top:1px solid rgba(109,40,217,0.12);">
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
  const display   = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  await resend.emails.send({
    from:    "HabitAI <hello@habitaiapp.com>",
    to:      email,
    subject: "Welcome to HabitAI 🎉",
    html:    buildWelcomeHtml(display),
  });
}
