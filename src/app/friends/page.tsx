"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Flame, Zap, Send, Check, X, Loader2, UserPlus, Trophy, UserSearch, ChevronDown, Share2, Copy, Mail } from "lucide-react";

interface FriendStat {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  streak: number;
  completions30: number;
  habitCount: number;
}

interface PendingFriend {
  id: string;
  name: string;
  email: string;
}

interface FriendProfile {
  id: string;
  name: string;
  username: string | null;
  level: number;
  xp: number;
  streak: number;
  weeklyPct: number;
  habits: { id: string; name: string; category: string }[];
}

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

function avatarPalette(name: string) {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) + hash) ^ name.charCodeAt(i);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

// ─── Friend Profile Modal ────────────────────────────────────────────────────

function FriendProfileModal({
  friendId,
  onClose,
}: {
  friendId: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/friends/profile/${friendId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setProfile(data.profile);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError("Failed to load profile"); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [friendId]);

  const palette = profile ? avatarPalette(profile.name) : AVATAR_PALETTES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f1a] border border-violet-800/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={onClose} className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors">Close</button>
          </div>
        ) : profile ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${palette.bg} border ${palette.border} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-base font-bold ${palette.text}`}>{getInitials(profile.name)}</span>
                </div>
                {/* Name / username */}
                <div>
                  <p className="text-base font-semibold text-white leading-tight">{profile.name}</p>
                  {profile.username && (
                    <p className="text-xs text-violet-400 mt-0.5">{profile.username}</p>
                  )}
                </div>
              </div>
              {/* Level badge */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-900/40 border border-violet-700/40 rounded-lg text-xs font-bold text-violet-300">
                  Lv {profile.level}
                </span>
                <span className="text-[10px] text-slate-600">{profile.xp} XP</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 bg-violet-950/30 border border-violet-900/25 rounded-xl px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4" />{profile.streak}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">streak</p>
              </div>
              <div className="flex-1 bg-violet-950/30 border border-violet-900/25 rounded-xl px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-violet-300">{profile.weeklyPct}%</p>
                <p className="text-[10px] text-slate-600 mt-0.5">this week</p>
              </div>
            </div>

            {/* Public habits */}
            <div className="mb-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Public Habits</p>
              {profile.habits.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No public habits yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {profile.habits.map((h) => (
                    <span
                      key={h.id}
                      className="bg-violet-950/40 border border-violet-800/25 text-xs text-violet-300 px-2 py-1 rounded-lg"
                    >
                      {h.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:bg-violet-950/30 transition-all"
            >
              Close
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── How-to Guide ────────────────────────────────────────────────────────────

const HOW_TO_STEPS = [
  { emoji: "1️⃣", title: "Set your username", desc: "Go to Settings → Account and set a unique @username so friends can find you." },
  { emoji: "2️⃣", title: "Invite a friend",    desc: "Type their @username or email in the invite box below and hit Invite." },
  { emoji: "3️⃣", title: "They accept",        desc: "Your friend will get a notification. Once they accept, you're connected!" },
  { emoji: "4️⃣", title: "Compete & cheer",    desc: "See each other on the leaderboard, cheer each other on, and stay accountable." },
];

function HowToGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-violet-950/20"
      >
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">👥</span>
          <span className="text-sm font-semibold text-white">How to add friends</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-violet-900/15 pt-4">
          {HOW_TO_STEPS.map((s) => (
            <div key={s.title} className="flex items-start gap-3">
              <span className="text-base leading-none flex-shrink-0 mt-0.5">{s.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

const INVITE_TEXT = "Join me on HabitAI — track habits, build streaks, and compete with friends! https://habitai.app";

function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(INVITE_TEXT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const nativeShare = () => {
    if (navigator.share) {
      navigator.share({ title: "HabitAI", text: INVITE_TEXT }).catch(() => {});
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0f0f1a] border border-violet-800/30 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">Invite friends to HabitAI</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-violet-950/50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {canNativeShare && (
            <button
              onClick={nativeShare}
              className="w-full flex items-center gap-3 px-4 py-3 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 rounded-xl transition-all text-sm font-medium text-violet-300"
            >
              <Share2 className="w-4 h-4 flex-shrink-0" />
              Share via…
            </button>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(INVITE_TEXT)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-800/25 rounded-xl transition-all text-sm font-medium text-emerald-300"
          >
            <span className="text-lg leading-none flex-shrink-0">💬</span>
            WhatsApp
          </a>
          <a
            href={`mailto:?subject=Join%20me%20on%20HabitAI&body=${encodeURIComponent(INVITE_TEXT)}`}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/25 rounded-xl transition-all text-sm font-medium text-blue-300"
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            Send via Email
          </a>
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/30 rounded-xl transition-all text-sm font-medium text-slate-300"
          >
            {copied ? <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" /> : <Copy className="w-4 h-4 flex-shrink-0" />}
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Friends Page ────────────────────────────────────────────────────────────

export default function FriendsPage() {
  const [friends, setFriends]   = useState<FriendStat[]>([]);
  const [pending, setPending]   = useState<PendingFriend[]>([]);
  const [loading, setLoading]   = useState(true);

  const [inviteInput, setInviteInput]           = useState("");
  const [inviting, setInviting]                 = useState(false);
  const [inviteStatus, setInviteStatus]         = useState<"idle" | "success" | "error">("idle");
  const [inviteMsg, setInviteMsg]               = useState("");

  const [cheeringId, setCheeringId]             = useState<string | null>(null);
  const [cheeredIds, setCheeredIds]             = useState<Set<string>>(new Set());
  const [respondingId, setRespondingId]         = useState<string | null>(null);

  const [selectedFriend, setSelectedFriend]     = useState<string | null>(null);
  const [showShareModal, setShowShareModal]     = useState(false);

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
    if (!inviteInput.trim()) {
      setInviteStatus("error");
      setInviteMsg("Please enter a username or email.");
      return;
    }
    setInviting(true);
    setInviteStatus("idle");
    const res = await fetch("/api/friends/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite: inviteInput }),
    });
    const data = await res.json();
    if (res.ok) {
      setInviteStatus("success");
      setInviteMsg(data.existing
        ? "Friend request sent!"
        : "Invite email sent! They'll get a link to join HabitAI.");
      setInviteInput("");
      loadFriends();
    } else {
      setInviteStatus("error");
      setInviteMsg(
        data.error === "User not found"
          ? "No user found with that username or email."
          : data.error === "Already friends"
          ? "You're already friends with this person."
          : data.error === "Request already sent"
          ? "You've already sent this person a request."
          : data.error === "You can't invite yourself"
          ? "You can't invite yourself."
          : "Couldn't send invite — please try again.",
      );
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

  return (
    <>
      {selectedFriend && (
        <FriendProfileModal
          friendId={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
      {showShareModal && <ShareModal onClose={() => setShowShareModal(false)} />}

      <div className="min-h-screen bg-[#09090f] pb-20 sm:pb-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-3 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">👥 Friends</h1>
            <p className="text-sm text-slate-500 mt-1.5">Compete and stay accountable with your friends</p>
          </div>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-300 text-sm font-medium rounded-xl transition-all flex-shrink-0 mt-1"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        </div>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-8 space-y-6">

          {/* How-to guide */}
          <HowToGuide />

          {/* Invite form */}
          <div id="invite-form" className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Invite a friend</h2>
            </div>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => { setInviteInput(e.target.value); setInviteStatus("idle"); }}
                placeholder="@username or friend@email.com"
                className="flex-1 bg-violet-950/30 border border-violet-900/30 focus:border-violet-600/60 focus:outline-none focus:ring-2 focus:ring-violet-600/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all"
              />
              <button
                type="submit"
                disabled={inviting || !inviteInput.trim()}
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
                We&apos;ll suggest people you might know as more users join HabitAI. For now, invite friends by username or email above.
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
                    const input = document.querySelector<HTMLInputElement>("#invite-form input[type='text']");
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
                  <div
                    key={friend.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-violet-950/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedFriend(friend.id)}
                  >
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

                    {/* Name + username + habit count */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{friend.name}</p>
                      {friend.username ? (
                        <p className="text-[10px] text-slate-600">@{friend.username}</p>
                      ) : (
                        <p className="text-[11px] text-slate-600">{friend.habitCount} habit{friend.habitCount !== 1 ? "s" : ""}</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div
                      className="flex items-center gap-4 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
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
      </div>
    </>
  );
}
