"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Flame, Zap, Send, Check, X, Loader2, UserPlus, Trophy, UserSearch } from "lucide-react";
import PageNav from "@/components/layout/PageNav";
import BottomNav from "@/components/ui/BottomNav";

interface FriendStat {
  id: string;
  name: string;
  email: string;
  streak: number;
  completions30: number;
  habitCount: number;
}

interface PendingFriend {
  id: string;
  name: string;
  email: string;
}

export default function FriendsPage() {
  const [friends, setFriends]   = useState<FriendStat[]>([]);
  const [pending, setPending]   = useState<PendingFriend[]>([]);
  const [loading, setLoading]   = useState(true);

  const [inviteEmail, setInviteEmail]       = useState("");
  const [inviting, setInviting]             = useState(false);
  const [inviteStatus, setInviteStatus]     = useState<"idle" | "success" | "error">("idle");
  const [inviteMsg, setInviteMsg]           = useState("");

  const [cheeringId, setCheeringId]         = useState<string | null>(null);
  const [cheeredIds, setCheeredIds]         = useState<Set<string>>(new Set());
  const [respondingId, setRespondingId]     = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    const res = await fetch("/api/friends/list");
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends ?? []);
      setPending(data.pending ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteStatus("idle");
    const res = await fetch("/api/friends/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    if (res.ok) {
      setInviteStatus("success");
      setInviteMsg(data.existing
        ? "Friend request sent!"
        : "Invite email sent! They'll get a link to join HabitAI.");
      setInviteEmail("");
      loadFriends();
    } else {
      setInviteStatus("error");
      setInviteMsg(data.error ?? "Something went wrong");
    }
    setInviting(false);
  };

  const handleRespond = async (requesterId: string, action: "accept" | "reject") => {
    setRespondingId(requesterId);
    await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId, action }),
    });
    setRespondingId(null);
    loadFriends();
  };

  const handleCheer = async (friendId: string) => {
    setCheeringId(friendId);
    await fetch("/api/friends/cheer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    setCheeredIds((prev) => new Set([...prev, friendId]));
    setCheeringId(null);
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const AVATAR_PALETTES = [
    { bg: "from-violet-500/50 to-purple-500/50",   border: "border-violet-600/35",  text: "text-violet-200"  },
    { bg: "from-blue-500/50 to-cyan-500/50",        border: "border-blue-600/35",    text: "text-blue-200"    },
    { bg: "from-emerald-500/50 to-teal-500/50",     border: "border-emerald-600/35", text: "text-emerald-200" },
    { bg: "from-rose-500/50 to-pink-500/50",        border: "border-rose-600/35",    text: "text-rose-200"    },
    { bg: "from-amber-500/50 to-orange-500/50",     border: "border-amber-600/35",   text: "text-amber-200"   },
    { bg: "from-fuchsia-500/50 to-violet-500/50",   border: "border-fuchsia-600/35", text: "text-fuchsia-200" },
    { bg: "from-indigo-500/50 to-blue-500/50",      border: "border-indigo-600/35",  text: "text-indigo-200"  },
    { bg: "from-teal-500/50 to-emerald-500/50",     border: "border-teal-600/35",    text: "text-teal-200"    },
  ] as const;

  const avatarPalette = (name: string) => {
    let hash = 5381;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) + hash) ^ name.charCodeAt(i);
    return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
  };

  return (
    <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
      <PageNav
        emoji="👥"
        title="Friends"
        subtitle="Compete and stay accountable with your friends"
        maxWidth="max-w-2xl"
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-8 space-y-6">

        {/* Invite form */}
        <div id="invite-form" className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Invite a friend</h2>
          </div>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteStatus("idle"); }}
              placeholder="friend@email.com"
              required
              className="flex-1 bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
            />
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-all flex-shrink-0"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Invite</span>
            </button>
          </form>
          {inviteStatus !== "idle" && (
            <p className={`mt-2.5 text-xs ${inviteStatus === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {inviteStatus === "success" ? "✓ " : "✗ "}{inviteMsg}
            </p>
          )}
        </div>

        {/* Pending requests */}
        {pending.length > 0 && (
          <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-900/15">
              <h2 className="text-sm font-semibold text-white">Friend requests</h2>
            </div>
            <div className="divide-y divide-violet-900/10">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarPalette(p.name).bg} border ${avatarPalette(p.name).border} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs font-bold ${avatarPalette(p.name).text}`}>{getInitials(p.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                    <p className="text-xs text-slate-600 truncate">{p.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRespond(p.id, "accept")}
                      disabled={respondingId === p.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-all"
                    >
                      {respondingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(p.id, "reject")}
                      disabled={respondingId === p.id}
                      className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/20"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested friends */}
        <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-900/15 flex items-center gap-2">
            <UserSearch className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Suggested</h2>
          </div>
          <div className="px-5 py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-900/20 border border-violet-800/25 flex items-center justify-center mx-auto mb-3">
              <UserSearch className="w-5 h-5 text-violet-500" />
            </div>
            <p className="text-sm font-medium text-slate-300 mb-1">No suggestions yet</p>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              We&apos;ll suggest people you might know as more users join HabitAI. For now, invite friends by email above.
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-violet-900/20 border border-violet-800/25 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-violet-500" />
            </div>
            <h2 className="text-base font-semibold text-slate-300 mb-2">No friends yet</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-5">
              Invite friends to compete on streaks and cheer each other on.
            </p>
            <button
              onClick={() => {
                document.getElementById("invite-form")?.scrollIntoView({ behavior: "smooth" });
                setTimeout(() => {
                  const input = document.querySelector<HTMLInputElement>("#invite-form input[type='email']");
                  input?.focus();
                }, 400);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Invite friends
            </button>
          </div>
        ) : (
          <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-900/15 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Leaderboard</h2>
              <span className="text-xs text-slate-600 ml-1">by streak</span>
            </div>
            <div className="divide-y divide-violet-900/10">
              {friends.map((friend, i) => (
                <div key={friend.id} className="flex items-center gap-4 px-5 py-4 hover:bg-violet-950/20 transition-colors">
                  {/* Rank */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    i === 0 ? "bg-amber-400/20 text-amber-300" :
                    i === 1 ? "bg-slate-400/15 text-slate-400" :
                    i === 2 ? "bg-orange-700/20 text-orange-400" :
                    "bg-violet-950/40 text-slate-600"
                  }`}>
                    {i + 1}
                  </div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarPalette(friend.name).bg} border ${avatarPalette(friend.name).border} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs font-bold ${avatarPalette(friend.name).text}`}>{getInitials(friend.name)}</span>
                  </div>

                  {/* Name + habit count */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{friend.name}</p>
                    <p className="text-[11px] text-slate-600">{friend.habitCount} habit{friend.habitCount !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-semibold text-slate-300 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-violet-400" />
                        {friend.completions30}
                      </p>
                      <p className="text-[10px] text-slate-600">30-day</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-orange-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />{friend.streak}
                      </p>
                      <p className="text-[10px] text-slate-600">streak</p>
                    </div>

                    {/* Cheer button */}
                    <button
                      onClick={() => handleCheer(friend.id)}
                      disabled={cheeringId === friend.id || cheeredIds.has(friend.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        cheeredIds.has(friend.id)
                          ? "bg-emerald-900/20 border border-emerald-700/30 text-emerald-400 cursor-default"
                          : "bg-violet-950/40 border border-violet-800/30 text-violet-400 hover:bg-violet-900/40 hover:border-violet-700/50"
                      }`}
                    >
                      {cheeringId === friend.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : cheeredIds.has(friend.id) ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        "🎉"
                      )}
                      {cheeredIds.has(friend.id) ? "Cheered!" : "Cheer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
