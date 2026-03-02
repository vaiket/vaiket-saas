"use client";

interface Props {
  status: "pending" | "success" | "fail" | "warning";
}

export default function StatusDot({ status }: Props) {
  const colorMap: Record<Props["status"], string> = {
    pending: "bg-gray-400",
    success: "bg-green-500",
    fail: "bg-red-500",
    warning: "bg-yellow-500",
  };

  const labelMap: Record<Props["status"], string> = {
    pending: "Pending",
    success: "Verified",
    fail: "Failed",
    warning: "Warning",
  };

  return (
    <span
      title={labelMap[status]}
      className={`inline-block h-3 w-3 rounded-full ${colorMap[status]}`}
    />
  );
}
