import { redirect } from "next/navigation";

export default function LegacySubscriptionsPage() {
  redirect("/dashboard/billing");
}
