import "globals.css";
import { TopNavBar } from "components/TopNavBar";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "components/Auth/AuthProvider";

export const metadata = {
  title: "Harry's Brain Resume Builder",
  description:
    "Harry's Brain Resume Builder is a modern, ATS-aware resume builder with analyzer and PDF highlighting.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TopNavBar />
          {children}
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
