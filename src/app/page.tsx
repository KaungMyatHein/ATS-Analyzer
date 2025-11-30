"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { SparklesIcon, CheckCircleIcon, CpuChipIcon, ArrowDownTrayIcon, PaintBrushIcon, ChartBarIcon, KeyIcon, BookmarkSquareIcon } from "@heroicons/react/24/outline";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-[calc(100vh-var(--top-nav-bar-height))] bg-gradient-to-b from-gray-50 via-white to-white">
      <section className="relative mx-auto max-w-7xl overflow-hidden px-6 py-24 lg:px-8">
        <div className="absolute left-1/3 top-[-2rem] -z-10 h-64 w-64 rounded-full bg-blue-100 blur-3xl animate-float-slow" />
        <div className="absolute right-1/4 top-[2rem] -z-10 h-48 w-48 rounded-full bg-indigo-100 blur-3xl animate-float-fast" />
        <div className="absolute left-1/2 bottom-[-3rem] -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-violet-100 blur-3xl animate-float-slow" />
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <SparklesIcon className="h-4 w-4" /> ATS-Analyzer
          </span>
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Build And Analyze Your Resume
            <span className="block animated-gradient-text">For ATS Success</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Create ATS-friendly resumes and analyze job description matches with synonyms, section weighting, and PDF highlights.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/ats-analyzer"
              className="rounded-xl bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-500 hover:shadow-lg hover:scale-[1.03]"
            >
              Try ATS Analyzer
            </Link>
            <Link
              href="/resume-builder"
              className="rounded-xl border border-gray-300 px-6 py-3 text-lg font-semibold text-gray-900 transition hover:bg-gray-100 hover:shadow"
            >
              Build Resume
            </Link>
            {!session && (
              <Link
                href="/api/auth/signin"
                className="rounded-xl border border-gray-300 px-6 py-3 text-lg font-semibold text-gray-900 transition hover:bg-gray-100 hover:shadow"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Everything You Need</h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">Build, analyze, and highlight with industry-wide matching</p>
          </div>
          <div className="mx-auto mt-12 max-w-7xl">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <CpuChipIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">ATS Scoring</h3>
                <p className="mt-2 text-gray-600">Exact, flex, and phrase matches with section weighting.</p>
              </div>
              <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">PDF Highlights</h3>
                <p className="mt-2 text-gray-600">Green for exact, yellow for flex; see matches instantly.</p>
              </div>
              <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50">
                  <SparklesIcon className="h-6 w-6 text-violet-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">AI Suggest</h3>
                <p className="mt-2 text-gray-600">Generate summary and bullets with your resume context.</p>
              </div>
              <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50">
                  <ArrowDownTrayIcon className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">Instant Download</h3>
                <p className="mt-2 text-gray-600">Export high-quality PDFs in one click.</p>
              </div>
              <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50">
                  <KeyIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">Gemini Integration</h3>
                <p className="mt-2 text-gray-600">Manage your API key in Settings for suggestions.</p>
              </div>
              <div className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50">
                  <BookmarkSquareIcon className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">Saved Jobs</h3>
                <p className="mt-2 text-gray-600">Keep results history and reanalyze anytime.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-blue-600 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to analyze your resume?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">Boost match scores and highlight strengths with ATS-Analyzer.</p>
            <div className="mt-10">
              <Link
                href="/ats-analyzer"
                className="rounded-xl bg-white px-8 py-3 text-lg font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50"
              >
                Start Analyzing Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
