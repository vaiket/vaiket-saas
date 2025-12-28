"use client";

export function Card({ className = "", children }: any) {
  return (
    <div className={`rounded-xl border bg-white shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: any) {
  return <div className="mb-4">{children}</div>;
}

export function CardTitle({ children }: any) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

export function CardContent({ children, className = "" }: any) {
  return <div className={className}>{children}</div>;
}
