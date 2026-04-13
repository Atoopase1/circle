'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import CircleLogo from '@/components/ui/CircleLogo';

export default function PrivacyPolicyPage() {
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

      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Privacy Policy</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-[14px] text-[var(--text-secondary)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Information We Collect</h2>
          <p>
            We collect the following types of information when you use our service:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Account Information:</strong> Your phone number, email address, password, and display name.</li>
            <li><strong>Messages and Media:</strong> Data sent through the platform including chat messages, images, audio, and video files. All messages are securely handled.</li>
            <li><strong>Usage Data:</strong> Information on how you interact with the app, such as device information, IP addresses, and login sessions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. How We Use Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li>Provide, maintain, and improve the Platform.</li>
            <li>Process your authentication securely via OTP or passwords.</li>
            <li>Send you technical notices, updates, security alerts, and support messages.</li>
            <li>Monitor and analyze trends, usage, and activities in connection with the Platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. Data Security and End-to-End Encryption</h2>
          <p>
            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access. While we employ modern cloud infrastructure (Supabase) and encrypted protocols to secure user communication, please note that no method of transmission over the internet or method of electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Sharing of Information</h2>
          <p>
            We do not share your personal information with third parties except as required by law, or with service providers (such as hosting partners) who need access to such information to carry out work on our behalf.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact our support team.
          </p>
        </section>
      </div>

    </div>
  );
}
