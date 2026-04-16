'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe, Shield, Scale, Users, Heart, Flag, Mail } from 'lucide-react';
import CircleLogo from '@/components/ui/CircleLogo';

export default function PoliticsPage() {
  const router = useRouter();

  const principles = [
    {
      icon: <Globe size={26} />,
      title: '1. Neutrality & Non-Discrimination',
      highlight: true,
      content: (
        <p>
          Circle operates as a neutral communication platform. We do not algorithmically promote, suppress, or filter content based on political, religious, or ideological viewpoints. Every message is treated equally within our infrastructure, ensuring fair and unbiased delivery to all users regardless of their beliefs or perspectives.
        </p>
      ),
    },
    {
      icon: <Shield size={26} />,
      title: '2. User Sovereignty',
      highlight: false,
      content: (
        <>
          <p className="mb-4">
            We believe that control belongs to the user, not the platform. Circle&apos;s governance philosophy is rooted in the principle of user sovereignty:
          </p>
          <div className="space-y-3 pl-4 border-l-2 border-[var(--emerald)]/30">
            <div>
              <strong className="text-[var(--text-primary)] block mb-0.5">Privacy by Default</strong>
              <p>Your private conversations remain private. No Circle employee or administrator has access to your message content.</p>
            </div>
            <div>
              <strong className="text-[var(--text-primary)] block mb-0.5">Community Self-Governance</strong>
              <p>Groups are managed by their own members and administrators. Circle does not impose top-down moderation on private group conversations.</p>
            </div>
            <div>
              <strong className="text-[var(--text-primary)] block mb-0.5">Data Ownership</strong>
              <p>You own your data. You can export, modify, or permanently delete your information at any time through your account settings.</p>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: <Scale size={26} />,
      title: '3. Community Safety Standards',
      highlight: true,
      content: (
        <>
          <p className="mb-3">
            While Circle is committed to protecting free expression, we maintain clear boundaries against content that poses a direct threat to safety. The following activities are strictly prohibited:
          </p>
          <ul className="space-y-2 pl-5 list-disc marker:text-[var(--emerald)]/50">
            <li>Content involving child sexual abuse material (CSAM) or exploitation of minors</li>
            <li>Coordination of terrorism, violence, or human trafficking</li>
            <li>Automated spam networks, bot-driven harassment campaigns, or coordinated manipulation</li>
            <li>Distribution of non-consensual intimate imagery</li>
          </ul>
          <div className="mt-4 p-4 rounded-xl bg-red-500/5 border border-red-500/15">
            <p className="text-[14.5px] text-red-400/80">
              ⚠ Violations of these standards may result in immediate account termination and, where required by law, reporting to relevant authorities.
            </p>
          </div>
        </>
      ),
    },
    {
      icon: <Users size={26} />,
      title: '4. Transparency & Accountability',
      highlight: false,
      content: (
        <p>
          Circle is committed to transparency in our operations. We do not accept government funding or political contributions that could compromise our neutrality. When law enforcement requests are received, we process them only when legally required and through proper judicial channels. We publish a transparency report summarizing the types and volume of requests we receive, without disclosing details that could compromise individual user privacy.
        </p>
      ),
    },
    {
      icon: <Heart size={26} />,
      title: '5. Inclusivity & Accessibility',
      highlight: true,
      content: (
        <p>
          Circle is designed for everyone. We are committed to building an inclusive platform that is accessible to users of all abilities, backgrounds, and regions. We continuously work to improve accessibility features, support multiple languages, and ensure our service is available across a wide range of devices and network conditions.
        </p>
      ),
    },
    {
      icon: <Flag size={26} />,
      title: '6. Our Commitment',
      highlight: false,
      content: (
        <p>
          We believe technology should bring people closer together without exploiting their attention, harvesting their data, or manipulating their behavior. Circle exists to provide a communication tool that respects your time, your privacy, and your autonomy. We measure our success not by engagement metrics, but by the trust our users place in us.
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
              <Flag size={26} className="text-[var(--emerald)]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Platform Principles</h1>
          </div>
          <p className="text-[14px] text-white/50 max-w-lg">
            Our values, governance philosophy, and commitment to building a trustworthy communication platform.
          </p>
        </div>
      </div>

      {/* Content card */}
      <div className="max-w-3xl mx-auto px-6 -mt-6 relative z-10">
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8 space-y-8 text-[14.5px] text-[var(--text-secondary)] leading-relaxed">
            {principles.map((principle, i) => (
              <section key={i} className={i > 0 ? 'pt-6 border-t border-[var(--border-color)]' : ''}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-[var(--emerald)]">{principle.icon}</span>
                  <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{principle.title}</h2>
                </div>
                {principle.content}
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-5 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[14px] text-[var(--text-muted)]">
                <Mail size={26} className="text-[var(--emerald)]" />
                <span>Policy questions: <strong className="text-[var(--text-primary)]">policy@circleapp.io</strong></span>
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
