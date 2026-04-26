"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

function ProtectedContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const { toast, showToast } = useToast();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [keyName, setKeyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setIsValid(null);
    setKeyName(null);

    if (!key) {
      setIsValid(false);
      setIsLoading(false);
      return;
    }

    const validateKey = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const data = await response.json();

        if (data.valid) {
          setIsValid(true);
          setKeyName(data.name);
          showToast("success", `Valid API Key: ${data.name}`);
        } else {
          setIsValid(false);
          showToast("error", "Invalid API Key. Access Denied.");
        }
      } catch (err) {
        setIsValid(false);
        showToast("error", "Error validating key.");
      } finally {
        setIsLoading(false);
      }
    };

    validateKey();
  }, [key, showToast]);

  return (
    <>
      <main className="min-w-0 flex-1 space-y-6">
        <div className="rounded-2xl border border-[#e3dfd4] bg-[#efebe2] p-6">
          <h1 className="text-3xl font-bold tracking-tight">Protected Area</h1>
          
          {isLoading ? (
            <p className="mt-4 text-zinc-600">Validating API key...</p>
          ) : isValid ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-800">
                <h2 className="text-xl font-semibold">Access Granted</h2>
                <p className="mt-1">Welcome back! This key belongs to: <strong>{keyName}</strong></p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold mb-2">Protected Secrets</h3>
                <ul className="list-disc list-inside text-sm text-zinc-600 space-y-2">
                  <li>Confidential API Documentation</li>
                  <li>Internal System Logs</li>
                  <li>Super Secret Strategy Notes</li>
                  <li>Access to Beta Features</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
              <h2 className="text-xl font-semibold">Access Denied</h2>
              <p className="mt-1">The provided API key is invalid or has been revoked.</p>
            </div>
          )}
        </div>
      </main>
      <Toast toast={toast} />
    </>
  );
}

export default function ProtectedPage() {
  return (
    <div className="min-h-screen bg-[#f4f2ed] text-zinc-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:flex-row md:p-6">
        <Sidebar />
        <Suspense fallback={<div className="flex-1 p-6">Loading...</div>}>
          <ProtectedContent />
        </Suspense>
      </div>
    </div>
  );
}
