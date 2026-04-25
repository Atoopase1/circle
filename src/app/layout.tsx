import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import TouchRipple from "@/components/layout/TouchRipple";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tekyel — Connect, Share, Communicate",
  description:
    "Tekyel is a modern social messaging platform. Chat, call, share status updates, and stay connected with your circle.",
  keywords: ["tekyel", "chat", "messaging", "social", "realtime", "video call", "audio call"],
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  verification: {
    google: "sk3Hm1wRQhXhx0Z-Dg0lxMs0HQudYUbN4maojIGSsPs",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F172A" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="sk3Hm1wRQhXhx0Z-Dg0lxMs0HQudYUbN4maojIGSsPs" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
                const savedFont = localStorage.getItem('app-font') || 'var(--font-inter)';
                document.documentElement.style.setProperty('--font-sans', savedFont);
                
                // Register Service Worker for PWA
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(registration) {
                      console.log('ServiceWorker registration successful');
                    }, function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    });
                  });
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased" suppressHydrationWarning>
        <TouchRipple />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
