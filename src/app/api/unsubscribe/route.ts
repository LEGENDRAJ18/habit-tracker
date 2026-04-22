import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });

  const supabase = createAdminClient();
  await supabase.from("profiles").update({ reminder_enabled: false }).eq("id", uid);

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Unsubscribed</title>
    <style>body{font-family:system-ui;background:#09090f;color:#f1f0ff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
    .card{background:#0f0f1a;border:1px solid rgba(109,40,217,0.25);border-radius:16px;padding:40px;text-align:center;max-width:360px;}
    h1{font-size:20px;margin:0 0 8px;}p{color:#8b8fa8;font-size:14px;}
    a{color:#a78bfa;text-decoration:none;}</style></head>
    <body><div class="card"><div style="font-size:40px;margin-bottom:16px;">✅</div>
    <h1>You've been unsubscribed</h1>
    <p>You won't receive habit reminder emails anymore.<br>You can re-enable them in your <a href="/dashboard">dashboard settings</a>.</p>
    </div></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
