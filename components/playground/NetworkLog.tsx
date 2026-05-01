"use client";

export type LogEntry = {
  label: string;
  duration: number;
  status: "success" | "pending" | "error";
  timestamp: number;
};

type NetworkLogProps = {
  logs: LogEntry[];
};

export function NetworkLog({ logs }: NetworkLogProps) {
  if (logs.length === 0) return null;

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white/50 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Request Timeline</h4>
        <span className="text-[9px] font-medium text-zinc-400">Total Latency: {logs.reduce((acc, l) => acc + l.duration, 0)}ms</span>
      </div>
      
      <div className="space-y-3">
        {logs.map((log, i) => (
          <div key={i} className="flex items-center justify-between animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-3">
              <div className={`h-1.5 w-1.5 rounded-full ${
                log.status === "success" ? "bg-emerald-500" : 
                log.status === "error" ? "bg-rose-500" : "bg-zinc-300 animate-pulse"
              }`} />
              <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-tight">{log.label}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-100 hidden sm:block">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    log.status === "success" ? "bg-emerald-400" : 
                    log.status === "error" ? "bg-rose-400" : "bg-zinc-200"
                  }`}
                  style={{ width: `${Math.min((log.duration / 1000) * 100, 100)}%` }}
                />
              </div>
              <span className="min-w-[40px] text-right font-mono text-[10px] font-bold text-zinc-400">
                {log.duration}ms
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
