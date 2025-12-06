"use client";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function OnboardingCompletePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />

        <h1 className="text-3xl font-bold text-gray-900">
          Business Profile Completed 🎉
        </h1>

        <p className="text-gray-600 max-w-md mx-auto">
          Your AI email automation is now ready to respond to your customers.
        </p>

        <button
          onClick={() => router.push("/dashboard")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-all"
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
