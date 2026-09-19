import "./globals.css";
// Background photo for the whole app — expects the file to live at
// app/shop-bg.<ext>, right next to this layout. If your file isn't a
// .jpg (e.g. it's .png or .webp), just change the extension below to
// match — that's the only edit needed.
import shopBg from "./shop-bg.jpg";

export const metadata = {
  title: "B&B System — Boards & Build",
  description: "Stock, orders and WhatsApp automation for Boards & Build.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          // A translucent paper-colored wash sits over the photo so text
          // stays readable on top of it. Lower this opacity further (try
          // 0.3–0.4) for an even more visible photo, or raise it back
          // toward 0.9 if text legibility ever becomes a problem.
          backgroundImage: `linear-gradient(rgba(239,231,214,0.55), rgba(239,231,214,0.55)), url(${shopBg.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          backgroundRepeat: "no-repeat",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
