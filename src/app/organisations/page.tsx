"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Users, Plus, Copy, Check, Crown,
  School, BarChart3, AlertCircle, X, ChevronRight, Hash,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/ui/BottomNav";
import type { Plan } from "@/types";
import FeatureUpgradeGate from "@/components/dashboard/FeatureUpgradeGate";

interface Org {
  id: string;
  name: string;
  description: string | null;
  admin_id: string;
  invite_code: string;
  members: Array<{ user_id: string; joined_at: string }>;
  created_at: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy code"}
    </button>
  );
}

export default function OrganisationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tier,        setTier]        = useState<Plan>("free");
  const [loading,     setLoading]     = useState(true);
  const [ownOrgs,     setOwnOrgs]     = useState<Org[]>([]);
  const [memberOrg,   setMemberOrg]   = useState<Org | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [showJoin,    setShowJoin]    = useState(false);
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [joinCode,    setJoinCode]    = useState("");
  const [creating,    setCreating]    = useState(false);
  const [joining,     setJoining]     = useState(false);
  const [kicking,     setKicking]     = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const [profileResult, orgsResult] = await Promise.all([
      supabase.from("profiles").select("subscription_tier").eq("id", user.id).single(),
      fetch("/api/organisations"),
    ]);

    setTier((profileResult.data?.subscription_tier as Plan) ?? "free");

    if (orgsResult.ok) {
      const data = await orgsResult.json() as { ownOrgs: Org[]; memberOrg: Org | null };
      setOwnOrgs(data.ownOrgs ?? []);
      setMemberOrg(data.memberOrg);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createOrg() {
    if (!name.trim()) return;
    setCreating(true); setError(null);
    try {
      const res = await fetch("/api/organisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setOwnOrgs((prev) => [data.org, ...prev]);
      setShowCreate(false); setName(""); setDescription("");
    } finally { setCreating(false); }
  }

  async function kickMember(orgId: string, memberId: string) {
    setKicking(memberId);
    try {
      const res = await fetch("/api/organisations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kick", org_id: orgId, member_id: memberId }),
      });
      if (res.ok) {
        setOwnOrgs((prev) => prev.map((o) =>
          o.id === orgId ? { ...o, members: o.members.filter((m) => m.user_id !== memberId) } : o
        ));
      }
    } finally { setKicking(null); }
  }

  async function joinOrg() {
    if (!joinCode.trim()) return;
    setJoining(true); setError(null);
    try {
      const res = await fetch("/api/organisations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", invite_code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMemberOrg(data.org);
      setShowJoin(false); setJoinCode("");
    } finally { setJoining(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] pb-24 sm:pb-8">
      <div className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Dashboard
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-sm font-semibold text-white">Organisations</span>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-950/50 to-[#0f0f1a] border border-violet-600/25 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-violet-700/30 rounded-xl flex items-center justify-center">
              <School className="w-6 h-6 text-violet-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Organisation Mode</h1>
              <p className="text-xs text-violet-400">Pro · Perfect for schools, sports teams, study groups</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Create an organisation, invite members via a unique code, assign group challenges, and track everyone{"'"}s progress from your admin dashboard.
          </p>
        </div>

        {/* Upgrade gate for free/plus */}
        {tier !== "pro" && (
          <FeatureUpgradeGate
            requiredTier="pro"
            featureName="Organisation Mode"
            description="Manage groups of students, athletes, or team members and track their habit progress."
            features={[
              "Create unlimited organisations",
              "Invite members via unique code",
              "Admin dashboard with group stats",
              "Assign habit challenges to the whole group",
            ]}
          />
        )}

        {tier === "pro" && (
          <>
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreate(true); setShowJoin(false); setError(null); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />Create Organisation
              </button>
              {!memberOrg && (
                <button
                  onClick={() => { setShowJoin(true); setShowCreate(false); setError(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 border border-violet-700/40 text-violet-300 hover:border-violet-500/60 font-semibold text-sm rounded-xl transition-all"
                >
                  <Hash className="w-4 h-4" />Join with Code
                </button>
              )}
            </div>

            {/* Create form */}
            {showCreate && (
              <div className="bg-[#0f0f1a] border border-violet-700/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Create Organisation</h3>
                  <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-slate-500" /></button>
                </div>
                <div className="space-y-3">
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Year 10 Science Class"
                    maxLength={60}
                    className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600"
                  />
                  <textarea
                    value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description…"
                    rows={2}
                    maxLength={200}
                    className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 resize-none"
                  />
                  {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                  <button onClick={() => void createOrg()} disabled={creating || !name.trim()}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Create
                  </button>
                </div>
              </div>
            )}

            {/* Join form */}
            {showJoin && (
              <div className="bg-[#0f0f1a] border border-violet-700/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Join with Code</h3>
                  <button onClick={() => setShowJoin(false)}><X className="w-4 h-4 text-slate-500" /></button>
                </div>
                <div className="space-y-3">
                  <input
                    value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character invite code"
                    maxLength={8}
                    className="w-full bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 font-mono tracking-widest text-center"
                  />
                  {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
                  <button onClick={() => void joinOrg()} disabled={joining || joinCode.length < 4}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                    {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Join
                  </button>
                </div>
              </div>
            )}

            {/* Member org */}
            {memberOrg && (
              <div className="bg-[#0f0f1a] border border-violet-900/25 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-violet-400" />
                  <p className="text-sm font-semibold text-white">Your Organisation</p>
                </div>
                <p className="text-base font-bold text-violet-200 mb-1">{memberOrg.name}</p>
                {memberOrg.description && <p className="text-xs text-slate-500 mb-3">{memberOrg.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{memberOrg.members.length} member{memberOrg.members.length !== 1 ? "s" : ""}</span>
                  <CopyButton text={memberOrg.invite_code} />
                </div>
              </div>
            )}

            {/* Own orgs */}
            {ownOrgs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white">Organisations You Admin</h2>
                </div>
                {ownOrgs.map((org) => (
                  <div key={org.id} className="bg-[#0f0f1a] border border-violet-700/30 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-base font-bold text-white">{org.name}</p>
                        {org.description && <p className="text-xs text-slate-500 mt-0.5">{org.description}</p>}
                      </div>
                      <span className="flex-shrink-0 text-xs bg-violet-950/60 border border-violet-700/30 text-violet-300 px-2 py-0.5 rounded-full">
                        {org.members.length} members
                      </span>
                    </div>

                    {/* Invite code */}
                    <div className="flex items-center justify-between bg-violet-950/30 border border-violet-800/30 rounded-xl px-4 py-2.5 mb-3">
                      <div>
                        <p className="text-[10px] text-violet-500 font-bold uppercase tracking-wider mb-0.5">Invite Code</p>
                        <p className="font-mono text-lg font-bold text-white tracking-widest">{org.invite_code}</p>
                      </div>
                      <CopyButton text={org.invite_code} />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#0c0c18] border border-violet-900/20 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-violet-400">{org.members.length}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">Members</p>
                      </div>
                      <div className="bg-[#0c0c18] border border-violet-900/20 rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-emerald-400">{new Date(org.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">Created</p>
                      </div>
                    </div>

                    {org.members.length > 0 && (
                      <div className="mt-3 border-t border-violet-900/20 pt-3">
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-2">Recent Members</p>
                        <div className="space-y-1.5">
                          {org.members.slice(0, 5).map((m, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-violet-700/30 flex items-center justify-center flex-shrink-0">
                                <Users className="w-2.5 h-2.5 text-violet-400" />
                              </div>
                              <span className="text-xs text-slate-400 font-mono truncate flex-1">{m.user_id.slice(0, 8)}…</span>
                              <span className="text-[10px] text-slate-500">{new Date(m.joined_at).toLocaleDateString()}</span>
                              <button
                                onClick={() => kickMember(org.id, m.user_id)}
                                disabled={kicking === m.user_id}
                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-950/40 text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
                                title="Remove member"
                              >
                                {kicking === m.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                              </button>
                            </div>
                          ))}
                          {org.members.length > 5 && (
                            <p className="text-[10px] text-slate-600">+{org.members.length - 5} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {ownOrgs.length === 0 && !memberOrg && (
              <div className="text-center py-12">
                <School className="w-10 h-10 text-violet-800 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No organisations yet.</p>
                <p className="text-xs text-slate-700 mt-1">Create one or join with an invite code.</p>
              </div>
            )}
          </>
        )}

        {/* How it works */}
        <div className="bg-[#0f0f1a] border border-violet-900/15 rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">How it works</p>
          <div className="space-y-4">
            {[
              { icon: School,      step: "1", title: "Create an Organisation", desc: "Teachers, coaches, or team leads create an org and get a unique invite code." },
              { icon: Hash,        step: "2", title: "Invite Members",         desc: "Share the code with students or teammates — they join in one tap." },
              { icon: BarChart3,   step: "3", title: "Track Group Progress",   desc: "See who's completing their habits and who needs a nudge." },
              { icon: ChevronRight, step: "4", title: "Assign Challenges",     desc: "Set group habit challenges and celebrate collective wins together." },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-700/20 border border-violet-700/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-violet-400">{step}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
