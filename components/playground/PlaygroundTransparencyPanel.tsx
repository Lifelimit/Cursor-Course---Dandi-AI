import { CommandPanel, StatusPill, type StatusPillProps } from "@/components/command";

type TransparencyRow = {
  label: string;
  value: string;
  detail: string;
};

type PlaygroundTransparencyPanelProps = {
  rows: TransparencyRow[];
  tone: NonNullable<StatusPillProps["tone"]>;
  label: string;
  pulse: boolean;
};

export function PlaygroundTransparencyPanel({ rows, tone, label, pulse }: PlaygroundTransparencyPanelProps) {
  return (
    <CommandPanel className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300/70">Repository Transparency</p>
        <StatusPill tone={tone} pulse={pulse} compact>
          {label}
        </StatusPill>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{item.label}</span>
              <span className="text-right text-xs font-black text-slate-100">{item.value}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </CommandPanel>
  );
}
