"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [apiKey, setApiKey] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin");
        } else if (status === "authenticated") {
            fetchApiKey();
        }
    }, [status, router]);

    const fetchApiKey = async () => {
        try {
            const res = await fetch("/api/settings/gemini-key");
            if (res.ok) {
                const data = await res.json();
                setApiKey(data.apiKey || "");
            }
        } catch (error) {
            console.error("Error fetching API key:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");

        try {
            const res = await fetch("/api/settings/gemini-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey }),
            });

            if (res.ok) {
                setMessage("API key saved successfully!");
            } else {
                setMessage("Failed to save API key.");
            }
        } catch (error) {
            console.error("Error saving API key:", error);
            setMessage("An error occurred.");
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <h1 className="mb-6 text-3xl font-bold">Settings</h1>

            <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Gemini API Key</h2>
                <p className="mb-4 text-sm text-gray-600">
                    Enter your Gemini API key to enable AI features in the resume builder.
                </p>

                <form onSubmit={handleSave}>
                    <div className="mb-4">
                        <label htmlFor="apiKey" className="mb-2 block text-sm font-medium text-gray-700">
                            API Key
                        </label>
                        <input
                            type="password"
                            id="apiKey"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter your Gemini API key"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {saving ? "Saving..." : "Save API Key"}
                    </button>

                    {message && (
                        <p className={`mt-4 text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
