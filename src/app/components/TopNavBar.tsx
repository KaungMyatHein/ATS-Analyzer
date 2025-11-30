"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cx } from "lib/cx";
import logoSrc from "public/Love.png";
import { LoginButton } from "components/Auth/LoginButton";

export const TopNavBar = () => {
  const pathName = usePathname();
  const isHomePage = pathName === "/";

  return (
    <header
      aria-label="Site Header"
      className={cx(
        "flex h-[var(--top-nav-bar-height)] items-center border-b-2 border-gray-100 px-3 lg:px-12",
        isHomePage && "bg-dot"
      )}
    >
      <div className="flex h-10 w-full items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src={logoSrc.src} alt="logo" className="h-10 w-10" />
          <span className="text-base font-semibold text-gray-900">Harry's Brain Resume Builder</span>
        </Link>
        <nav
          aria-label="Site Nav Bar"
          className="flex items-center gap-2 text-sm font-medium"
        >
          {[
            ["/dashboard", "Dashboard"],
            ["/resume-builder", "Builder"],
            ["/ats-analyzer", "ATS Analyzer"],
            ["/saved-jobs", "Saved Jobs"],
            ["/settings", "Settings"],
          ].map(([href, text]) => (
            <Link
              key={text}
              className="rounded-md px-1.5 py-2 text-gray-500 hover:bg-gray-100 focus-visible:bg-gray-100 lg:px-4"
              href={href}
            >
              {text}
            </Link>
          ))}
          <div className="ml-4">
            <LoginButton />
          </div>
        </nav>
      </div>
    </header>
  );
};
