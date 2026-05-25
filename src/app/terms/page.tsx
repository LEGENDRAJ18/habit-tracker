import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service – HabitAI",
  description: "Read the HabitAI Terms of Service.",
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

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: {UPDATED} · Effective: {EFFECTIVE}</p>
        </div>

        <div className="prose-custom">
          <p className="text-slate-400 text-sm leading-relaxed mb-10">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of HabitAI (&quot;Service&quot;),
            operated by HabitAI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By creating an account or using the Service
            you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>

          <Section title="1. Accounts">
            <p>
              You must provide accurate information when creating an account. You are responsible for
              maintaining the confidentiality of your credentials and for all activity that occurs under
              your account. Notify us immediately at{" "}
              <a href="mailto:support@habitai.app" className="text-violet-400 hover:text-violet-300 transition-colors">
                support@habitai.app
              </a>{" "}
              if you believe your account has been compromised.
            </p>
            <p>
              You must be at least 13 years old (16 in the EU) to use the Service. By creating an account
              you confirm you meet this requirement.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that violate these Terms, engage in
              fraudulent behaviour, or otherwise harm the Service or other users.
            </p>
          </Section>

          <Section title="2. Subscription Plans &amp; Payments">
            <p>
              HabitAI offers a free tier and paid subscriptions (&quot;Plus&quot; and &quot;Pro&quot;). Paid plans are billed
              monthly in advance through Stripe, our third-party payment processor. By subscribing you
              authorise us to charge your payment method on a recurring basis until you cancel.
            </p>
            <p>
              Prices are listed in USD and may be subject to applicable taxes. We reserve the right to
              change pricing with at least 30 days' notice. Continued use of a paid plan after a price
              change constitutes acceptance of the new pricing.
            </p>
            <p>
              All payments are non-refundable except where required by applicable law. If you believe you
              have been charged in error, contact us within 14 days of the charge.
            </p>
          </Section>

          <Section title="3. Cancellations &amp; Refunds">
            <p>
              You may cancel your subscription at any time through the Billing page within the app or by
              contacting support. Cancellation takes effect at the end of the current billing period —
              you retain access to paid features until then.
            </p>
            <p>
              We do not offer pro-rated refunds for partial billing periods. Exceptions may be made at
              our sole discretion for extenuating circumstances.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li>Use the Service for any unlawful purpose or in violation of any applicable regulations.</li>
              <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
              <li>Scrape, reverse-engineer, or reproduce the Service's content or functionality.</li>
              <li>Upload or transmit malicious code, viruses, or harmful content.</li>
              <li>Impersonate another person or entity.</li>
              <li>Use the Service in a way that disrupts or degrades performance for other users.</li>
              <li>Resell or sublicense access to the Service without prior written consent.</li>
            </ul>
          </Section>

          <Section title="5. Your Data">
            <p>
              You retain ownership of the habit data, notes, and other content you create in the Service
              (&quot;User Content&quot;). By using the Service you grant us a limited licence to process your
              User Content solely for the purpose of providing and improving the Service.
            </p>
            <p>
              We do not sell your personal data to third parties. See our{" "}
              <Link href="/privacy" className="text-violet-400 hover:text-violet-300 transition-colors">
                Privacy Policy
              </Link>{" "}
              for full details on how we collect, use, and protect your data.
            </p>
          </Section>

          <Section title="6. AI Features">
            <p>
              Certain features of the Service use artificial intelligence to analyse your habit data and
              generate insights (&quot;AI Features&quot;). AI-generated content is provided for informational
              purposes only and does not constitute medical, psychological, or professional advice.
            </p>
            <p>
              AI Features are available on paid plans and subject to fair-use rate limits. We reserve the
              right to modify or discontinue AI Features at any time.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              The Service, including its design, code, trademarks, and content (excluding User Content),
              is owned by HabitAI and protected by copyright, trademark, and other intellectual property
              laws. Nothing in these Terms grants you any rights to use our trademarks or branding.
            </p>
          </Section>

          <Section title="8. Disclaimer of Warranties">
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
              express or implied, including but not limited to fitness for a particular purpose,
              merchantability, or non-infringement. We do not warrant that the Service will be
              uninterrupted, error-free, or free of harmful components.
            </p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, HabitAI and its directors, employees, and agents
              shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages arising out of or related to your use of the Service, even if we have been advised
              of the possibility of such damages.
            </p>
            <p>
              Our aggregate liability to you for any claim arising out of these Terms shall not exceed the
              amount you paid us in the 12 months preceding the claim, or $50 (whichever is greater).
            </p>
          </Section>

          <Section title="10. Governing Law">
            <p>
              These Terms are governed by the laws of the State of Delaware, USA, without regard to its
              conflict-of-law provisions. Any disputes shall be resolved exclusively in the courts of
              Delaware, and you consent to personal jurisdiction therein.
            </p>
          </Section>

          <Section title="11. Changes to These Terms">
            <p>
              We may update these Terms from time to time. We will notify you of material changes via
              email or an in-app notice at least 14 days before they take effect. Continued use of the
              Service after the effective date constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Questions about these Terms? Contact us at{" "}
              <a href="mailto:surjeetsj@gmail.com" className="text-violet-400 hover:text-violet-300 transition-colors">
                surjeetsj@gmail.com
              </a>
              . We aim to respond within 24 hours.
            </p>
          </Section>
        </div>

        {/* Legal operator block */}
        <div className="mt-12 pt-8 border-t border-violet-900/20">
          <div className="bg-[#0c0c18] border border-violet-900/20 rounded-2xl px-5 py-5 space-y-1.5 text-sm text-slate-400 leading-relaxed">
            <p>
              <strong className="text-slate-300">Legal operator:</strong> HabitAI
            </p>
            <p>
              HabitAI is created by a 16-year-old developer from Wellington, New Zealand, and operated by a small independent team.
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
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-slate-400 transition-colors text-slate-400">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
