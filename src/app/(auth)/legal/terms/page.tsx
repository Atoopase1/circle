'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import CircleLogo from '@/components/ui/CircleLogo';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="p-8 max-h-[80vh] overflow-y-auto scrollbar-thin">
      <div className="mb-6 flex justify-between items-start">
        <button 
          onClick={() => router.back()}
          className="p-2 bg-[var(--bg-secondary)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <CircleLogo size={40} />
      </div>

      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Terms of Service</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-[14px] text-[var(--text-secondary)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Circle ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. The Platform is subject to continuous updates and features may change without notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. User Accounts</h2>
          <p>
            You are responsible for safeguarding the password and authentication methods that you use to access the Platform. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. User Conduct</h2>
          <p>
            You agree not to use the Platform to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>Transmit any content that is unlawful, harmful, threatening, abusive, or harassing.</li>
            <li>Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation.</li>
            <li>Interfere with or disrupt the operation of the Platform or the servers or networks used to make the Platform available.</li>
            <li>Violate any applicable local, state, national, or international law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Content Ownership</h2>
          <p>
            You retain all your ownership rights in your content. However, by submitting content to the Platform, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display that content in connection with the service provided by the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Disclaimer of Warranties</h2>
          <p>
            The Platform is provided "AS IS" and "AS AVAILABLE". We disclaim all warranties of any kind, whether express or implied.
          </p>
        </section>
      </div>

    </div>
  );
}
