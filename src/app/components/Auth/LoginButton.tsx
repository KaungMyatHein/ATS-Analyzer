"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function LoginButton() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <button
                className="btn btn-primary"
                disabled
            >
                Loading...
            </button>
        );
    }

    if (session) {
        return (
            <div className="flex items-center gap-3">
                {/* <span className="text-sm text-gray-700">
                    {session.user?.email}
                </span> */}
                <button
                    onClick={() => signOut()}
                    className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <Link
            href="/auth/signin"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
            Sign In
        </Link>
    );
}
