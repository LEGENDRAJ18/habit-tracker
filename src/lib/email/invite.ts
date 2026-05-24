import { Resend } from "resend";

const resend  = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.habitaiapp.com";

function buildInviteHtml(inviterName: string, acceptUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>You've been invited to HabitAI</title>
</head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:24px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(124,58,237,0.4),rgba(109,40,217,0.25));padding:28px 36px 24px;border-bottom:1px solid rgba(109,40,217,0.2);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#9333ea);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                      <span style="font-size:18px;line-height:1;">✨</span>
                    </div>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:18px;font-weight:700;color:#ffffff;">habit<span style="color:#a78bfa;">AI</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 32px;">
              <div style="font-size:48px;text-align:center;margin-bottom:20px;">👋</div>
              <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#ffffff;line-height:1.25;text-align:center;">
                ${inviterName} invited you to HabitAI
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#8b8fa8;line-height:1.65;text-align:center;">
                Track habits together, compete on leaderboards, and cheer each other on. Building habits is easier with friends.
              </p>

              <!-- Feature highlights -->
              <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:28px;">
                ${[
                  ["🔥", "Daily streaks", "Build momentum with consecutive-day completion streaks"],
                  ["⚡", "XP & Levels", "Earn XP for every habit and climb from Beginner to Grandmaster"],
                  ["👥", "Friends leaderboard", "See how your habits stack up against friends"],
                ].map(([emoji, title, desc]) => `
                <tr>
                  <td style="padding:0 0 12px;">
                    <table cellpadding="0" cellspacing="0" style="width:100%;background:rgba(109,40,217,0.08);border:1px solid rgba(109,40,217,0.18);border-radius:12px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:36px;vertical-align:middle;font-size:20px;">${emoji}</td>
                              <td style="padding-left:12px;vertical-align:middle;">
                                <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#ffffff;">${title}</p>
                                <p style="margin:0;font-size:12px;color:#8b8fa8;">${desc}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join("")}
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td align="center">
                    <a href="${acceptUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:12px;letter-spacing:0.01em;box-shadow:0 4px 24px rgba(124,58,237,0.4);">
                      Accept Invite &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 36px;border-top:1px solid rgba(109,40,217,0.12);">
              <p style="margin:0;font-size:11px;color:#3d3d5c;text-align:center;line-height:1.6;">
                You received this because ${inviterName} invited you to HabitAI.<br />
                <a href="${APP_URL}" style="color:#6d28d9;text-decoration:none;">habitai.app</a>
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

export async function sendInviteEmail(
  toEmail: string,
  inviterName: string,
  inviterUserId: string,
): Promise<void> {
  const acceptUrl = `${APP_URL}/friends?invite=${inviterUserId}`;
  await resend.emails.send({
    from: "HabitAI <hello@habitaiapp.com>",
    to: toEmail,
    subject: `${inviterName} invited you to build habits together on HabitAI 🔥`,
    html: buildInviteHtml(inviterName, acceptUrl),
  });
}
