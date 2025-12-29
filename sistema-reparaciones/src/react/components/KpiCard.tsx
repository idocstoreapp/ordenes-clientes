import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export default function KpiCard({ title, value, icon, className = "" }: KpiCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-600 mb-1">{title}</div>
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
        </div>
        {icon && <div className="text-3xl opacity-60">{icon}</div>}
      </div>
    </div>
  );
}

