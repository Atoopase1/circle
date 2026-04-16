'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Database, Eye, Lock, Share2, Trash2, Bell, Mail } from 'lucide-react';
import CircleLogo from '@/components/ui/CircleLogo';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const sections = [
    {
      icon: <Eye size={26} />,
      title: '1. Information We Collect',
      content: (
        <>
          <p className="mb-4">
            Circle is built on a principle of data minimization. We collect only the information strictly necessary to provide and improve our messaging services.
          </p>
          <div className="space-y-4 pl-4 border-l-2 border-[var(--emerald)]/30">
            <div>
              <strong className="text-[var(--text-primary)] block mb-1">Account Information</strong>
              <p>When you create an account, we collect your name, email address or phone number, and optional profile photo. If you sign in via Google, we receive your basic profile details from Google.</p>
            </div>
            <div>
              <strong className="text-[var(--text-primary)] block mb-1">Messages & Media</strong>
              <p>Circle processes your messages, photos, videos, voice notes, and documents to deliver them to your intended recipients. Messages are encrypted during transit and stored securely for synchronization across your devices.</p>
            </div>
            <div>
              <strong className="text-[var(--text-primary)] block mb-1">Usage & Device Data</strong>
              <p>We automatically collect basic diagnostic information including device type, operating system, app version, and crash reports. This data helps us maintain service reliability and does not include message content.</p>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: <Database size={26} />,
      title: '2. How We Use Your Information',
      content: (
        <>
          <p className="mb-3">
            We use the information we collect for the following purposes:
          </p>
          <ul className="space-y-2 pl-5 list-disc marker:text-[var(--emerald)]/50">
            <li><strong className="text-[var(--text-primary)]">Deliver messages</strong> — Route your communications to the correct recipients quickly and reliably.</li>
            <li><strong className="text-[var(--text-primary)]">Maintain your account</strong> — Authenticate your identity, sync your profile, and manage your settings across devices.</li>
            <li><strong className="text-[var(--text-primary)]">Improve the Service</strong> — Analyze anonymized usage trends to fix bugs, optimize performance, and develop new features.</li>
            <li><strong className="text-[var(--text-primary)]">Ensure safety</strong> — Detect and prevent spam, abuse, fraud, and other harmful activities on the platform.</li>
            <li><strong className="text-[var(--text-primary)]">Send important notifications</strong> — Communicate service updates, security alerts, and account-related information.</li>
          </ul>
          <div className="mt-5 p-4 rounded-xl bg-[var(--emerald)]/5 border border-[var(--emerald)]/15">
            <p className="text-[14.5px] text-[var(--emerald)] font-medium">
              ✦ Circle does not sell your personal data to advertisers or third parties. We do not use your messages for targeted advertising.
            </p>
          </div>
        </>
      ),
    },
    {
      icon: <Lock size={26} />,
      title: '3. Data Security',
      content: (
        <>
          <p className="mb-3">
            Protecting your data is fundamental to Circle. We implement multiple layers of security:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { label: 'Encryption in Transit', desc: 'All data transmitted between your device and our servers is protected using TLS 1.3 encryption.' },
              { label: 'Secure Storage', desc: 'Data at rest is encrypted using AES-256 on our cloud infrastructure powered by Supabase.' },
              { label: 'Access Controls', desc: 'Row Level Security (RLS) ensures users can only access their own data at the database level.' },
              { label: 'Regular Audits', desc: 'Our security practices are regularly reviewed and updated to meet industry standards.' },
            ].map((item, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <strong className="text-[var(--text-primary)] text-[14.5px] block mb-1">{item.label}</strong>
                <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      icon: <Share2 size={26} />,
      title: '4. Data Sharing & Third Parties',
      content: (
        <>
          <p className="mb-3">
            Circle does not sell, rent, or trade your personal information. We share data only in the following limited circumstances:
          </p>
          <ul className="space-y-2 pl-5 list-disc marker:text-[var(--emerald)]/50">
            <li><strong className="text-[var(--text-primary)]">Service Providers:</strong> Trusted infrastructure partners (cloud hosting, authentication) that process data on our behalf under strict contractual obligations.</li>
            <li><strong className="text-[var(--text-primary)]">Legal Requirements:</strong> When required by a valid court order, subpoena, or applicable law, or to protect the rights and safety of our users.</li>
            <li><strong className="text-[var(--text-primary)]">With Your Consent:</strong> When you explicitly authorize sharing with a specific third party or service.</li>
          </ul>
        </>
      ),
    },
    {
      icon: <Trash2 size={26} />,
      title: '5. Your Rights & Data Control',
      content: (
        <>
          <p className="mb-3">
            You have full control over your personal information. Depending on your jurisdiction, you may exercise the following rights:
          </p>
          <ul className="space-y-2 pl-5 list-disc marker:text-[var(--emerald)]/50">
            <li><strong className="text-[var(--text-primary)]">Access & Portability:</strong> Request a copy of all personal data we hold about you.</li>
            <li><strong className="text-[var(--text-primary)]">Correction:</strong> Update or correct inaccurate information through your account settings.</li>
            <li><strong className="text-[var(--text-primary)]">Deletion:</strong> Request permanent deletion of your account and all associated data from our active servers.</li>
            <li><strong className="text-[var(--text-primary)]">Restriction:</strong> Request that we limit the processing of your personal data in certain situations.</li>
          </ul>
          <p className="mt-4 text-[14px] text-[var(--text-muted)] italic">
            To exercise any of these rights, navigate to Settings within the app or contact our privacy team directly.
          </p>
        </>
      ),
    },
    {
      icon: <Bell size={26} />,
      title: '6. Updates to This Policy',
      content: (
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make material changes, we will notify you through the application or via email. We encourage you to review this policy periodically. Your continued use of Circle after any modifications constitutes acceptance of the updated policy.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-app)] max-h-[100vh] overflow-y-auto scrollbar-thin">
      {/* Hero banner */}
      <div
        className="relative px-8 pt-8 pb-14 bg-[var(--navy)]"
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <button
              onClick={() => router.back()}
              className="p-2.5 bg-white/10 backdrop-blur-sm rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-all"
            >
              <ArrowLeft size={26} />
            </button>
            <CircleLogo size={44} />
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--emerald)]/20 flex items-center justify-center">
              <ShieldCheck size={26} className="text-[var(--emerald)]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-[14px] text-white/50">Effective Date: January 1, 2026 &middot; Last Updated: April 14, 2026</p>
        </div>
      </div>

      {/* Content card */}
      <div className="max-w-3xl mx-auto px-6 -mt-6 relative z-10">
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden">
          {/* Trust banner */}
          <div className="px-6 sm:px-8 py-4 bg-[var(--emerald)]/5 border-b border-[var(--emerald)]/10 flex items-center gap-3">
            <ShieldCheck size={26} className="text-[var(--emerald)] shrink-0" />
            <p className="text-[14.5px] text-[var(--text-secondary)]">
              Your privacy matters to us. Circle is designed to collect only the data necessary to deliver a secure, reliable messaging experience.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-8 text-[14.5px] text-[var(--text-secondary)] leading-relaxed">
            {sections.map((section, i) => (
              <section key={i} className={i > 0 ? 'pt-6 border-t border-[var(--border-color)]' : ''}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-[var(--emerald)]">{section.icon}</span>
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{section.title}</h2>
                </div>
                {section.content}
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-5 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[14px] text-[var(--text-muted)]">
                <Mail size={26} className="text-[var(--emerald)]" />
                <span>Privacy inquiries: <strong className="text-[var(--text-primary)]">privacy@circleapp.io</strong></span>
              </div>
              <div className="text-[14px] text-[var(--text-muted)] flex items-center gap-1.5">
                Built by <a href="https://technoidfix.online" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--emerald)] hover:underline flex items-center gap-1">technoidfix</a>
              </div>
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}
