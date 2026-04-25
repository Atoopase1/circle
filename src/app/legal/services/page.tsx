'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Video, Image, Mic, Users, Zap, Globe, Shield, Smartphone, Cloud, BarChart3, Mail } from 'lucide-react';
import TekyelLogo from '@/components/ui/TekyelLogo';

export default function ServicesPage() {
  const router = useRouter();

  const coreServices = [
    {
      icon: <MessageSquare size={26} />,
      title: 'Instant Messaging',
      desc: 'Send text messages with real-time delivery and read receipts. Support for emoji reactions, message replies, forwarding, and starring.',
      badge: 'Core',
    },
    {
      icon: <Video size={26} />,
      title: 'Voice & Video Calls',
      desc: 'Make high-quality one-on-one audio and video calls with low-latency peer-to-peer signaling for crisp, natural conversations.',
      badge: 'Core',
    },
    {
      icon: <Image size={26} />,
      title: 'Media Sharing',
      desc: 'Share photos, videos, and documents in any conversation. Files are uploaded securely to cloud storage with optimized delivery.',
      badge: 'Core',
    },
    {
      icon: <Mic size={26} />,
      title: 'Voice Notes',
      desc: 'Record and send voice messages directly within any chat. Playback with waveform visualization and variable speed control.',
      badge: 'Core',
    },
    {
      icon: <Users size={26} />,
      title: 'Group Conversations',
      desc: 'Create groups with custom names and icons. Manage members, assign admins, and collaborate with your team or community.',
      badge: 'Social',
    },
    {
      icon: <Zap size={26} />,
      title: 'Status Updates',
      desc: 'Share what\'s on your mind with your tekyel. Post text, photos, and updates with likes, comments, and star ratings from your followers.',
      badge: 'Social',
    },
  ];

  const platformFeatures = [
    {
      icon: <Shield size={26} />,
      title: 'End-to-End Security',
      desc: 'All communications are encrypted in transit using TLS 1.3. Data at rest is protected with AES-256 encryption and Row Level Security policies.',
    },
    {
      icon: <Smartphone size={26} />,
      title: 'Cross-Platform Access',
      desc: 'Access Tekyel from any device with a modern web browser. Your conversations, contacts, and settings sync seamlessly across all devices.',
    },
    {
      icon: <Cloud size={26} />,
      title: 'Cloud Infrastructure',
      desc: 'Built on Supabase and modern edge computing for global availability, automatic scaling, and reliable message delivery worldwide.',
    },
    {
      icon: <Globe size={26} />,
      title: 'Real-Time Presence',
      desc: 'See who\'s online, typing indicators, and last-seen timestamps. Stay connected and know when your contacts are available.',
    },
    {
      icon: <BarChart3 size={26} />,
      title: 'Profile Analytics',
      desc: 'LinkedIn-style profile pages with follower counts, activity timelines, and cover photos to showcase your digital identity.',
    },
    {
      icon: <MessageSquare size={26} />,
      title: 'Smart Interactions',
      desc: 'Pin important messages, react with emojis, star favorites, forward to contacts, and select multiple messages for bulk actions.',
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
            <TekyelLogo size={44} />
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--emerald)]/20 flex items-center justify-center">
              <Zap size={26} className="text-[var(--emerald)]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Our Services</h1>
          </div>
          <p className="text-[14px] text-white/50 max-w-lg">
            Tekyel provides a complete suite of communication tools designed for simplicity, security, and speed.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 -mt-6 relative z-10">
        {/* Core Services Grid */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden mb-6">
          <div className="px-6 sm:px-8 py-5 border-b border-[var(--border-color)]">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Core Services</h2>
            <p className="text-[14px] text-[var(--text-muted)] mt-0.5">The foundation of your Tekyel experience</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--border-color)]">
            {coreServices.map((service, i) => (
              <div
                key={i}
                className="bg-[var(--bg-primary)] p-5 hover:bg-[var(--bg-secondary)] transition-colors duration-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[var(--emerald)]/10 flex items-center justify-center text-[var(--emerald)] shrink-0 group-hover:bg-[var(--emerald)]/20 transition-colors">
                    {service.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{service.title}</h3>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        service.badge === 'Core'
                          ? 'bg-[var(--emerald)]/10 text-[var(--emerald)]'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {service.badge}
                      </span>
                    </div>
                    <p className="text-[14.5px] text-[var(--text-muted)] leading-relaxed">{service.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Features */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden mb-6">
          <div className="px-6 sm:px-8 py-5 border-b border-[var(--border-color)]">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)]">Platform & Infrastructure</h2>
            <p className="text-[14px] text-[var(--text-muted)] mt-0.5">What powers Tekyel behind the scenes</p>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {platformFeatures.map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--emerald)]/30 transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--emerald)]/10 flex items-center justify-center text-[var(--emerald)] shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">{feature.title}</h3>
                  <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Availability Card */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-3">Service Availability</h2>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4">
              Tekyel is available 24/7 as a progressive web application accessible through any modern browser. Our cloud infrastructure ensures high availability with automatic failover and global content delivery.
            </p>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
              All services listed above are provided free of charge for personal use. Tekyel reserves the right to introduce premium features in the future, which will be clearly communicated to users in advance.
            </p>
          </div>
          
          {/* Footer */}
          <div className="px-6 sm:px-8 py-5 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[14px] text-[var(--text-muted)]">
                <Mail size={26} className="text-[var(--emerald)]" />
                <span>Service inquiries: <strong className="text-[var(--text-primary)]">support@tekyelapp.io</strong></span>
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
