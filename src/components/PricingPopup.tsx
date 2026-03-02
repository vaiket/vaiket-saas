// src/components/PricingPopup.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PricingPopup({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/subscription/check");
        const data = await res.json();
        if (data.active) {
          clearInterval(interval);
          onClose();
          router.push("/dashboard");
        }
      } catch (e) {
        console.error("Polling sub check failed", e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [router, onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-white w-[95vw] max-w-[900px] h-[90vh] rounded-2xl shadow-2xl overflow-hidden border">
        {/* If local pricing page */}
        <iframe
          src="http://localhost:3000/pricing?embedded=1"
          className="w-full h-full"
          style={{ border: "none" }}
        />
      </div>
    </div>
  );
}
