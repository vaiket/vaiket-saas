// src/app/page.tsx
import HomeLanding from "@/components/HomeLanding";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  return <HomeLanding />;
}
