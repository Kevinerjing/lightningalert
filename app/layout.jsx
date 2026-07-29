import "./globals.css";

export const metadata = {
  title: "A Century of Canadian History Through Photographs",
  description: "A documentary-style Canadian history photo presentation."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
