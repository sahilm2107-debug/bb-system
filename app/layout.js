import "./globals.css";
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
