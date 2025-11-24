// ✅ src/app/reset-password/page.tsx
import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <Suspense fallback={<div className="text-white p-6">Loading...</div>}>
      <ResetPasswordWrapper searchParams={searchParams} />
    </Suspense>
  );
}

function ResetPasswordWrapper({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const raw = searchParams?.email;
  const email = Array.isArray(raw) ? raw[0] : raw ?? "";

  return <ResetPasswordForm email={email} />;
}
