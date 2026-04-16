'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Shield, UserCheck, AlertTriangle, Scale, RefreshCw, Mail } from 'lucide-react';
import CircleLogo from '@/components/ui/CircleLogo';

export default function TermsOfServicePage() {
  const router = useRouter();

  const sections = [
    {
      icon: <FileText size={26} />,
      title: '1. Acceptance of Terms',
      content: (
        <>
          <p className="mb-3">
            By accessing, downloading, or using the Circle messaging platform (&ldquo;Service&rdquo;), you confirm that you have read, understood, and agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). These Terms constitute a legally binding agreement between you and Circle Technologies.
          </p>
          <p>
            If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms. If you do not agree to these Terms, you must not access or use the Service.
          </p>
        </>
      ),
    },
    {
      icon: <UserCheck size={26} />,
      title: '2. Account Registration & Eligibility',
      content: (
        <>
          <p className="mb-3">
            To use Circle, you must be at least 13 years of age (or the minimum age required by law in your jurisdiction). You must register using a valid email address, phone number, or a supported third-party authentication provider such as Google OAuth.
          </p>
          <div className="space-y-2 pl-4 border-l-2 border-[var(--emerald)]/30 mt-4">
            <p><strong className="text-[var(--text-primary)]">Account Security:</strong> You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</p>
            <p><strong className="text-[var(--text-primary)]">Accurate Information:</strong> You agree to provide accurate and complete registration information and to keep it updated at all times.</p>
            <p><strong className="text-[var(--text-primary)]">One Account Per User:</strong> Each individual may maintain only one personal account. Creating duplicate or automated accounts is prohibited.</p>
          </div>
        </>
      ),
    },
    {
      icon: <AlertTriangle size={26} />,
      title: '3. Acceptable Use Policy',
      content: (
        <>
          <p className="mb-3">
            Circle is designed for lawful personal and professional communication. You agree not to use the Service to:
          </p>
          <ul className="space-y-2 pl-5 list-disc marker:text-[var(--emerald)]/50">
            <li>Transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.</li>
            <li>Distribute malware, viruses, or any software designed to disrupt, damage, or interfere with the functioning of any system.</li>
            <li>Engage in spamming, phishing, or any form of unsolicited mass communication.</li>
            <li>Impersonate any person or entity, or falsely misrepresent your affiliation with any organization.</li>
            <li>Attempt to gain unauthorized access to other users&apos; accounts, the Service&apos;s infrastructure, or any related systems.</li>
            <li>Use automated scripts, bots, or scrapers to interact with the Service without prior written consent.</li>
          </ul>
          <p className="mt-4 text-[var(--text-muted)] text-[14px] italic">
            Violations of this policy may result in immediate suspension or permanent termination of your account without prior notice.
          </p>
        </>
      ),
    },
    {
      icon: <Shield size={26} />,
      title: '4. Intellectual Property & Content Ownership',
      content: (
        <>
          <p className="mb-3">
            You retain full ownership of all content you create, upload, or share through Circle, including messages, images, videos, and status updates. Circle does not claim any intellectual property rights over your content.
          </p>
          <p>
            By using the Service, you grant Circle a limited, non-exclusive, royalty-free license solely to host, transmit, store, and deliver your content as necessary to operate the Service. This license terminates when you delete your content or your account.
          </p>
        </>
      ),
    },
    {
      icon: <Scale size={26} />,
      title: '5. Limitation of Liability',
      content: (
        <>
          <p className="mb-3">
            The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, whether express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p>
            To the maximum extent permitted by applicable law, Circle and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or business opportunities, arising out of or in connection with your use of the Service.
          </p>
        </>
      ),
    },
    {
      icon: <RefreshCw size={26} />,
      title: '6. Modifications to Terms',
      content: (
        <p>
          Circle reserves the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms within the application or by sending a notification to your registered email address. Your continued use of the Service after such modifications constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.
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
              <FileText size={26} className="text-[var(--emerald)]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Terms of Service</h1>
          </div>
          <p className="text-[14px] text-white/50">Effective Date: January 1, 2026 &middot; Last Updated: April 14, 2026</p>
        </div>
      </div>

      {/* Content card */}
      <div className="max-w-3xl mx-auto px-6 -mt-6 relative z-10">
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden">
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
                <span>Questions? Contact us at <strong className="text-[var(--text-primary)]">legal@circleapp.io</strong></span>
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
