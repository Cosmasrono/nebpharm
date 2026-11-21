import "./globals.css";

export const metadata = {
  title: "NebTech Pharmacy",
  description: "Pharmacy Point of Sale & Inventory Management",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/images/icons/icon.svg", type: "image/svg+xml" }, { url: "/images/icons/icon-192.png", sizes: "192x192" }],
    apple: "/images/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "NebTech", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
