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
    icon: "/favicon-v2.png",
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
        <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Caveat:wght@400;500;600;700&family=Cinzel:wght@400;500;600;700&family=Cormorant:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&family=Exo+2:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Lato:ital,wght@0,400;0,700;1,400;1,700&family=Manrope:wght@400;500;600;700&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Quicksand:wght@400;500;600;700&family=Roboto:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
                var fontFamilies = {
                  'Inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  'Poppins': "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
                  'Roboto': "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
                  'Open Sans': "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                  'Lato': "'Lato', -apple-system, BlinkMacSystemFont, sans-serif",
                  'Nunito': "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
                  'Playfair': "'Playfair Display', serif",
                  'Caveat': "'Caveat', cursive",
                  'Exo 2': "'Exo 2', sans-serif",
                  'Cinzel': "'Cinzel', serif",
                  'Abril Fatface': "'Abril Fatface', cursive",
                  'Cormorant': "'Cormorant', serif",
                  'Quicksand': "'Quicksand', sans-serif",
                  'DM Sans': "'DM Sans', sans-serif",
                  'Space Grotesk': "'Space Grotesk', sans-serif",
                  'Manrope': "'Manrope', sans-serif",
                  'Syne': "'Syne', sans-serif"
                };
                var savedFont = localStorage.getItem('app-font') || 'Inter';
                document.documentElement.style.setProperty('--font-sans', fontFamilies[savedFont] || fontFamilies['Inter']);
                
                var savedStyle = localStorage.getItem('app-font-style');
                if (savedStyle === 'italic') {
                  document.documentElement.style.fontStyle = 'italic';
                }
                
                var savedWeight = localStorage.getItem('app-font-weight');
                if (savedWeight === 'bold') {
                  document.documentElement.classList.add('bold-mode');
                }
                
                var savedTextSize = localStorage.getItem('app-text-size') || 'medium';
                if (savedTextSize === '14px') savedTextSize = 'small';
                if (savedTextSize === '16px') savedTextSize = 'medium';
                if (savedTextSize === '18px') savedTextSize = 'large';
                if (savedTextSize === '20px') savedTextSize = 'extra-large';
                
                var textScale = '1';
                if (savedTextSize === 'small') textScale = '0.9';
                if (savedTextSize === 'large') textScale = '1.1';
                if (savedTextSize === 'extra-large') textScale = '1.25';
                document.documentElement.style.setProperty('--text-scale', textScale);
                
                // Register Service Worker for PWA with auto-update
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(registration) {
                      console.log('ServiceWorker registration successful');

                      // Check for updates every 60 seconds
                      setInterval(function() {
                        registration.update().catch(function() {});
                      }, 60 * 1000);

                      // When a new SW is found and waiting, tell it to activate immediately
                      registration.addEventListener('updatefound', function() {
                        var newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              console.log('New version available — reloading...');
                              // The new SW will skipWaiting(), triggering controllerchange below
                            }
                          });
                        }
                      });
                    }, function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    });

                    // When a new SW takes over, reload to get the latest assets
                    var refreshing = false;
                    navigator.serviceWorker.addEventListener('controllerchange', function() {
                      if (refreshing) return;
                      refreshing = true;
                      window.location.reload();
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
