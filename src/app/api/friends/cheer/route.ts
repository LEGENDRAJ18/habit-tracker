import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { pushNotify } from "@/lib/pushNotify";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { friendId } = await req.json();
  if (!friendId) return NextResponse.json({ error: "friendId required" }, { status: 400 });

  const admin = createAdminClient();

  // Verify they are actually friends
  const [{ data: f1 }, { data: f2 }] = await Promise.all([
    admin.from("friendships").select("id").eq("requester_id", user.id).eq("addressee_id", friendId).eq("status", "accepted").single(),
    admin.from("friendships").select("id").eq("requester_id", friendId).eq("addressee_id", user.id).eq("status", "accepted").single(),
  ]);

  if (!f1 && !f2) {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  const { data: friendAuth } = await admin.auth.admin.getUserById(friendId);
  const friendEmail = friendAuth?.user?.email;
  if (!friendEmail) return NextResponse.json({ error: "Friend not found" }, { status: 404 });

  const senderName = (user.email ?? "Your friend").split("@")[0];

  // Push notification (non-blocking)
  void pushNotify(admin, friendId, {
    title: `${senderName} is cheering you on! 🎉`,
    body:  "Your friend believes in you — go complete your habits today!",
    tag:   `cheer-${user.id}`,
    url:   "/dashboard",
  }, "friend");

  await resend.emails.send({
    from: "HabitAI <hello@habitai.app>",
    to: friendEmail,
    subject: `${senderName} is cheering you on! 🎉`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#09090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table cellpadding="0" cellspacing="0" style="width:100%;background:#09090f;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:24px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,rgba(124,58,237,0.4),rgba(109,40,217,0.25));padding:24px 32px;border-bottom:1px solid rgba(109,40,217,0.2);">
              <span style="font-size:18px;font-weight:700;color:#ffffff;">habit<span style="color:#a78bfa;">AI</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;text-align:center;">
              <div style="font-size:56px;margin-bottom:16px;">🎉</div>
              <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#ffffff;">
                ${senderName} is cheering you on!
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#8b8fa8;line-height:1.65;">
                Keep building those habits. Your friend believes in you — don't let that streak break!
              </p>
              <a href="${APP_URL}/dashboard"
                 style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;">
                Complete Today's Habits →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid rgba(109,40,217,0.12);text-align:center;">
              <p style="margin:0;font-size:11px;color:#3d3d5c;">
                <a href="${APP_URL}/friends" style="color:#6d28d9;text-decoration:none;">View Friends</a>
                &nbsp;&middot;&nbsp;
                <a href="${APP_URL}" style="color:#6d28d9;text-decoration:none;">HabitAI</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  return NextResponse.json({ ok: true });
}
