import { Resend } from "resend";

const resend  = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.habitaiapp.com";

function buildStreakBrokenHtml(firstName: string, habitName?: string): string {
  const habitLine = habitName
    ? `Your <strong style="color:#fff;">${habitName}</strong> streak broke today.`
    : "One of your habit streaks broke today.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Your streak broke — but you can rebuild</title>
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
          <td style="padding:40px 40px 10px;text-align:center;">
            <div style="font-size:56px;line-height:1;margin-bottom:20px;">😢</div>
            <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.25;letter-spacing:-0.4px;">
              Your streak broke, ${firstName}.
            </h1>
            <p style="margin:0;font-size:14px;color:#8b8fa8;line-height:1.7;">
              ${habitLine} It happens to everyone — even the best.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(109,40,217,0.35),transparent);"></div>
          </td>
        </tr>

        <!-- Encouraging message -->
        <tr>
          <td style="padding:28px 40px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(109,40,217,0.08);border:1px solid rgba(109,40,217,0.2);border-radius:16px;">
              <tr>
                <td style="padding:24px 24px;">
                  <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#a78bfa;">Here&rsquo;s what the data says:</p>
                  <p style="margin:0 0 10px;font-size:14px;color:#c4b5fd;line-height:1.7;">
                    &#128200;&nbsp; People who miss one day and immediately get back on track are <strong style="color:#fff;">just as successful</strong> as those who never miss.
                  </p>
                  <p style="margin:0;font-size:14px;color:#c4b5fd;line-height:1.7;">
                    &#129504;&nbsp; The <em>decision to restart</em> is the habit. Show up tomorrow and the streak starts again.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Mindset tips -->
        <tr>
          <td style="padding:20px 40px 0;">
            ${[
              ["🔥", "Miss one, not two", "One missed day is a slip. Two missed days is a new habit you don't want."],
              ["💪", "Progress &gt; perfection", "You&rsquo;ve already shown you can do this. Today was an exception, not your identity."],
              ["🎯", "Restart tomorrow", "Open HabitAI tomorrow morning. Mark it done. That&rsquo;s all it takes."],
            ].map(([emoji, title, desc]) => `
            <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:12px;">
              <tr>
                <td style="vertical-align:top;width:36px;">
                  <div style="width:32px;height:32px;background:rgba(124,58,237,0.18);border-radius:8px;text-align:center;line-height:32px;font-size:16px;">${emoji}</div>
                </td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#ffffff;">${title}</p>
                  <p style="margin:0;font-size:12px;color:#8b8fa8;line-height:1.5;">${desc}</p>
                </td>
              </tr>
            </table>`).join("")}
          </td>
        </tr>

        <!-- Quote -->
        <tr>
          <td style="padding:20px 40px 0;">
            <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(124,58,237,0.06);border-left:3px solid #7c3aed;border-radius:0 12px 12px 0;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:14px;color:#a78bfa;line-height:1.65;font-style:italic;">
                    &ldquo;We are what we repeatedly do. Excellence, then, is not an act, but a habit.&rdquo;
                  </p>
                  <p style="margin:8px 0 0;font-size:11px;color:#4b4b6b;font-style:normal;">— Aristotle</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:32px 40px 38px;">
            <a href="${APP_URL}/dashboard"
               style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:14px;letter-spacing:0.01em;box-shadow:0 8px 32px rgba(124,58,237,0.4);">
              Rebuild My Streak &rarr;
            </a>
            <p style="margin:14px 0 0;font-size:13px;color:#6d28d9;font-weight:600;">
              Tomorrow is a fresh start. You&rsquo;ve got this. 💜
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 40px 26px;border-top:1px solid rgba(109,40,217,0.12);">
            <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;line-height:1.7;">
              You&rsquo;re receiving this because you have an active habit on HabitAI.<br />
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

export async function sendStreakBrokenEmail(
  email:      string,
  name:       string,
  habitName?: string,
): Promise<void> {
  const firstName = name.split(/[\s_\-+@]/)[0];
  const display   = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  await resend.emails.send({
    from:    "HabitAI <hello@habitaiapp.com>",
    to:      email,
    subject: "Your streak broke 😢 — but you can rebuild",
    html:    buildStreakBrokenHtml(display, habitName),
  });
}
