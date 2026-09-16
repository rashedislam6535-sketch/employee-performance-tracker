import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkPulse — Daily work tracker",
  description: "Track daily work, review activity, and generate weekly reports.",
};

// Runs before hydration so the saved theme is applied without a flash.
const themeScript = `(function(){try{var t=localStorage.getItem("workpulse_theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var c=document.documentElement.classList;if(t==="dark"){c.add("dark");}else{c.remove("dark");}document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
