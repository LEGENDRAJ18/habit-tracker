import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, CreditCard, RefreshCw, XCircle, Database, Mail, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment Policy – HabitAI",
  description: "HabitAI pricing, billing, refund, and cancellation policy.",
};

const UPDATED = "5 May 2025";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-violet-900/40 border border-violet-700/30 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-3 text-sm text-slate-400 leading-relaxed pl-[42px]">
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-violet-900/15 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-slate-200 text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function PaymentPolicyPage() {
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
          <h1 className="text-4xl font-bold text-white mb-3">Payment Policy</h1>
          <p className="text-sm text-slate-500">Last updated: {UPDATED}</p>
          <p className="text-sm text-slate-400 leading-relaxed mt-4 max-w-xl">
            This policy covers pricing, billing, refunds, and cancellations for HabitAI. If you have any
            questions, email us at{" "}
            <a href="mailto:support@habitai.app" className="text-violet-400 hover:text-violet-300 transition-colors">
              support@habitai.app
            </a>{" "}
            and we&apos;ll get back to you within 24 hours.
          </p>
        </div>

        {/* Pricing */}
        <Section icon={<Sparkles className="w-4 h-4 text-violet-400" />} title="Pricing">
          <div className="bg-[#0c0c18] border border-violet-900/20 rounded-xl overflow-hidden mb-3">
            <Row label="Free plan" value="$0 NZD / month — always free, no credit card required" />
            <Row label="Plus plan" value="$7 NZD / month, billed monthly" />
            <Row label="Pro plan"  value="$12 NZD / month, billed monthly" />
          </div>
          <p>
            All prices are in New Zealand Dollars (NZD) and include GST where applicable.
          </p>
          <p>
            Prices may change in the future. Existing subscribers will receive at least{" "}
            <strong className="text-slate-300">30 days&apos; notice</strong> by email before any price
            increase takes effect. You may cancel before the new price applies with no penalty.
          </p>
        </Section>

        {/* Billing */}
        <Section icon={<CreditCard className="w-4 h-4 text-violet-400" />} title="Billing">
          <p>
            Payments are processed securely by{" "}
            <strong className="text-slate-300">Stripe</strong>, a PCI-DSS Level 1 certified payment
            processor. HabitAI never stores or sees your full card number.
          </p>
          <p>
            Your subscription renews automatically on the same date each month. For example, if you
            subscribe on the 10th, you will be charged on the 10th of every subsequent month.
          </p>
          <p>
            You will receive an email receipt from Stripe after each successful payment. All major
            credit and debit cards are accepted, including Visa, Mastercard, and American Express.
          </p>
          <p>
            If a payment fails, Stripe will retry automatically over the following days. You will
            receive an email notification if your payment cannot be processed.
          </p>
        </Section>

        {/* Refund policy */}
        <Section icon={<RefreshCw className="w-4 h-4 text-violet-400" />} title="Refund Policy">
          <div className="bg-emerald-950/30 border border-emerald-700/25 rounded-xl px-4 py-3.5 mb-3">
            <p className="text-emerald-300 font-semibold text-sm">7-day money-back guarantee</p>
            <p className="text-emerald-500/80 text-xs mt-1">
              If you&apos;re not satisfied within the first 7 days of your first paid subscription, we&apos;ll
              refund you in full — no questions asked.
            </p>
          </div>
          <p>
            To request a refund within the 7-day window, email{" "}
            <a href="mailto:support@habitai.app" className="text-violet-400 hover:text-violet-300 transition-colors">
              support@habitai.app
            </a>{" "}
            with the subject line <strong className="text-slate-300">&ldquo;Refund Request&rdquo;</strong> and
            your registered email address. We will process your refund within 5–10 business days.
          </p>
          <p>
            After 7 days, refunds are not available. However, you can cancel at any time and retain
            full access until the end of your current billing period. No partial refunds are issued for
            unused days in a billing cycle.
          </p>
          <p>
            The 7-day guarantee applies to your <strong className="text-slate-300">first</strong> paid
            subscription only and does not reset if you resubscribe after cancelling.
          </p>
        </Section>

        {/* Cancellation */}
        <Section icon={<XCircle className="w-4 h-4 text-violet-400" />} title="Cancellation">
          <p>
            You can cancel your subscription at any time from{" "}
            <strong className="text-slate-300">Settings → Billing</strong> inside the app. There are no
            cancellation fees.
          </p>
          <p>
            After cancellation, you keep full access to your paid features until the end of your
            current billing period. You will not be charged again after that date.
          </p>
          <p>
            Your habit data is retained for <strong className="text-slate-300">30 days</strong> after
            your subscription ends, in case you decide to resubscribe. After 30 days, data may be
            permanently deleted. To immediately delete your account and all data, use{" "}
            <strong className="text-slate-300">Settings → Danger Zone → Delete Account</strong>.
          </p>
        </Section>

        {/* Data and privacy */}
        <Section icon={<ShieldCheck className="w-4 h-4 text-violet-400" />} title="Data &amp; Privacy">
          <p>
            We never sell your personal or payment information to third parties.
          </p>
          <p>
            Stripe handles all card processing. HabitAI only receives a tokenised reference to your
            payment method — we never see your full card number, CVC, or billing address.
          </p>
          <p>
            For full details on how we handle your personal data, see our{" "}
            <Link href="/privacy" className="text-violet-400 hover:text-violet-300 transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        {/* Data storage */}
        <Section icon={<Database className="w-4 h-4 text-violet-400" />} title="Data Storage">
          <p>
            Subscription and billing records are stored securely by Stripe in accordance with their{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              Privacy Policy
            </a>
            .
          </p>
          <p>
            Your habit data is stored on Supabase infrastructure hosted in the United States. By using
            HabitAI you consent to this data being stored and processed in that jurisdiction.
          </p>
        </Section>

        {/* Contact */}
        <Section icon={<Mail className="w-4 h-4 text-violet-400" />} title="Contact Us">
          <p>
            Questions about this policy, billing issues, or refund requests? We&apos;re happy to help.
          </p>
          <div className="bg-[#0c0c18] border border-violet-900/20 rounded-xl px-4 py-4">
            <p className="text-slate-300 font-medium text-sm mb-1">Email support</p>
            <a
              href="mailto:support@habitai.app"
              className="text-violet-400 hover:text-violet-300 transition-colors text-sm"
            >
              support@habitai.app
            </a>
            <p className="text-slate-600 text-xs mt-1">We respond within 24 hours on business days.</p>
          </div>
        </Section>

        {/* Bottom links */}
        <div className="pt-8 border-t border-violet-900/20 flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms"   className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Terms of Service</Link>
          <Link href="/"        className="text-xs text-slate-600 hover:text-slate-400 transition-colors">← Back to HabitAI</Link>
        </div>
      </main>
    </div>
  );
}
