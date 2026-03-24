interface KpiCardProps {
  title: string;
  value: string | number;
  
}

export default function KpiCard({ title, value }: KpiCardProps) {
  return (
   <div className="relative rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-lg border border-white/10 overflow-hidden">
  
  <div className="flex items-center justify-between gap-3">
    
    {/* CONTENIDO */}
    <div className="min-w-0 flex-1">
      <p className="text-xs sm:text-sm font-medium text-blue-100 mb-1 truncate">
        {title}
      </p>

      <p className="
  font-semibold text-white leading-tight
  text-[clamp(14px,2.5vw,24px)]
  break-words
">
        {value}
      </p>
    </div>

  </div>
</div>
  );
}



