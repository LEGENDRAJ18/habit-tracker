import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy – HabitAI",
  description: "Read the HabitAI Privacy Policy.",
};

const UPDATED   = "May 2026";
const EFFECTIVE = "18 May 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-slate-400 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#09090f]">
      {/* Header */}
      <header className="border-b border-violet-900/20 bg-[#09090f]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>
          <Link href="/" className="text-xs text-slate-500 hover:text-white transition-colors">
            ← Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Page header */}
        <div className="mb-12">
          <p className="text-xs text-violet-400 uppercase tracking-widest font-semibold mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: {UPDATED} · Effective: {EFFECTIVE}</p>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed mb-10">
          At HabitAI we take your privacy seriously. This Privacy Policy explains what information we
          collect, how we use it, and your rights regarding your data. By using the Service you agree
          to the practices described here.
        </p>

        <Section title="1. Information We Collect">
          <p><strong className="text-slate-300">Account information.</strong> When you create an account we collect your email address, display name, and authentication credentials (hashed, never stored in plaintext).</p>
          <p><strong className="text-slate-300">Habit data.</strong> We store the habits you create, completion logs, streaks, XP progress, and any implementation intentions (time, location, duration) you add.</p>
          <p><strong className="text-slate-300">Usage data.</strong> We collect information about how you interact with the app — features used, pages visited, and session duration — to improve the Service.</p>
          <p><strong className="text-slate-300">Device &amp; technical data.</strong> We collect IP address, browser type, operating system, and crash reports to diagnose issues and improve reliability.</p>
          <p><strong className="text-slate-300">Payment information.</strong> Billing details are processed directly by Stripe. We do not store credit card numbers on our servers.</p>
          <p><strong className="text-slate-300">Communications.</strong> If you contact support or opt in to email notifications, we store those communications and preferences.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li>To provide, operate, and improve the Service.</li>
            <li>To generate AI-powered coaching insights from your habit data.</li>
            <li>To send transactional emails (account confirmation, password reset, weekly AI reports) where you have opted in.</li>
            <li>To process payments and manage subscriptions.</li>
            <li>To detect and prevent fraudulent or abusive activity.</li>
            <li>To comply with legal obligations.</li>
            <li>To communicate product updates and offers (you can unsubscribe at any time).</li>
          </ul>
          <p>
            We never sell your personal data. We do not use your habit data for advertising purposes.
          </p>
        </Section>

        <Section title="3. Third-Party Services">
          <p>
            We work with the following trusted third parties to operate the Service. Each is bound by
            their own privacy policy:
          </p>
          <div className="space-y-4 mt-2">
            {[
              {
                name: "Supabase",
                role: "Authentication, database, and file storage.",
                link: "https://supabase.com/privacy",
              },
              {
                name: "Stripe",
                role: "Payment processing and subscription management.",
                link: "https://stripe.com/privacy",
              },
              {
                name: "OpenAI",
                role: "AI-generated habit insights (paid plans only). Habit data is sent to the OpenAI API to generate personalised coaching. OpenAI does not use API data to train its models by default.",
                link: "https://openai.com/policies/privacy-policy",
              },
              {
                name: "Resend",
                role: "Transactional email delivery (welcome emails, reminders, weekly reports).",
                link: "https://resend.com/privacy",
              },
              {
                name: "Vercel",
                role: "Hosting and edge infrastructure.",
                link: "https://vercel.com/legal/privacy-policy",
              },
            ].map(({ name, role, link }) => (
              <div key={name} className="bg-[#0f0f1a] border border-violet-900/15 rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-300">{name}</span>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
                    Privacy policy ↗
                  </a>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{role}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4. Data Retention">
          <p>
            We retain your account data for as long as your account is active. If you delete your account,
            we remove your personal data within 30 days, except where retention is required by law or
            legitimate business interest (e.g., billing records for up to 7 years).
          </p>
          <p>
            Anonymised and aggregated analytics data may be retained indefinitely as it cannot be used
            to identify you.
          </p>
        </Section>

        <Section title="5. Cookies &amp; Tracking">
          <p>
            We use strictly necessary cookies to maintain authentication sessions. We do not use
            third-party advertising cookies or cross-site tracking technologies.
          </p>
          <p>
            We may use first-party analytics to understand feature usage. This data is anonymised and
            not shared with third parties.
          </p>
        </Section>

        <Section title="6. Your Rights">
          <p>Depending on your location, you may have the following rights:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li><strong className="text-slate-300">Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong className="text-slate-300">Correction:</strong> Request that we correct inaccurate data.</li>
            <li><strong className="text-slate-300">Deletion:</strong> Request deletion of your account and associated data.</li>
            <li><strong className="text-slate-300">Portability:</strong> Request your habit data in a machine-readable format.</li>
            <li><strong className="text-slate-300">Objection:</strong> Object to processing for marketing purposes.</li>
            <li><strong className="text-slate-300">Restriction:</strong> Request that we restrict processing in certain circumstances.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:privacy@habitai.app" className="text-violet-400 hover:text-violet-300 transition-colors">
              privacy@habitai.app
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="7. Data Security">
          <p>
            We use industry-standard security measures including encryption in transit (TLS), encrypted
            storage, and regular security reviews. Access to production data is restricted to authorised
            personnel only.
          </p>
          <p>
            Despite our best efforts, no security system is impenetrable. If you believe your account
            has been compromised, contact us immediately.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            The Service is not directed at children under 13 (or 16 in the EU). We do not knowingly
            collect personal information from children. If we become aware of such collection we will
            delete the data promptly.
          </p>
        </Section>

        <Section title="9. International Transfers">
          <p>
            Your data may be processed in countries outside your own, including the United States, where
            our servers and third-party services are located. We ensure appropriate safeguards are in
            place for such transfers (e.g., Standard Contractual Clauses for EU data).
          </p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>
            We may update this Privacy Policy periodically. We will notify you of material changes via
            email or an in-app notice. The &quot;last updated&quot; date at the top indicates when changes
            were last made.
          </p>
        </Section>

        <Section title="11. Contact Us">
          <p>
            For privacy inquiries, data requests, or to report a concern, contact us at:{" "}
            <a href="mailto:surjeetsj@gmail.com" className="text-violet-400 hover:text-violet-300 transition-colors">
              surjeetsj@gmail.com
            </a>
            . We aim to respond within 24 hours.
          </p>
        </Section>

        {/* Legal operator block */}
        <div className="mt-4 pt-8 border-t border-violet-900/20">
          <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl px-5 py-5 space-y-1.5 text-sm text-slate-400 leading-relaxed">
            <p>
              <strong className="text-slate-300">Legal operator:</strong> Surjeet Jubbal
            </p>
            <p>
              HabitAI is created by <strong className="text-slate-300">Mannraj Jubbal</strong>, a 15-year-old
              developer from Lower Hutt, Wellington, New Zealand, and operated by Surjeet Jubbal.
            </p>
            <p>
              <strong className="text-slate-300">Website:</strong>{" "}
              <a href="https://habitaiapp.com" className="text-violet-400 hover:text-violet-300 transition-colors">
                habitaiapp.com
              </a>
            </p>
            <p>
              For any questions contact{" "}
              <a href="mailto:surjeetsj@gmail.com" className="text-violet-400 hover:text-violet-300 transition-colors">
                surjeetsj@gmail.com
              </a>
              . We aim to respond within 24 hours.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-violet-900/20 py-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} HabitAI. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-400 transition-colors text-slate-400">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-slate-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
