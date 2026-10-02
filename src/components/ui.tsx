import React from 'react';

// Shared building blocks so every screen looks and behaves the same.
// (Page titles live in the app header, so pages only add a short description + their main action.)

export const PageIntro: React.FC<{ children?: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <p className="text-sm text-mute max-w-2xl">{children}</p>
    {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
  </div>
);

export interface TabDef { id: string; label: string; count?: number; alert?: boolean }

export const Tabs: React.FC<{ tabs: TabDef[]; value: string; onChange: (id: string) => void; label?: string }> = ({ tabs, value, onChange, label = 'Sections' }) => (
  <div role="tablist" aria-label={label} className="flex items-center gap-1 border-b border-line overflow-x-auto">
    {tabs.map(t => {
      const on = t.id === value;
      return (
        <button key={t.id} role="tab" aria-selected={on} onClick={() => onChange(t.id)}
          className={`-mb-px px-3.5 py-2.5 text-sm whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors ${on ? 'border-violet-500 text-ink font-semibold' : 'border-transparent text-mute hover:text-ink'}`}>
          {t.label}
          {t.count !== undefined && (
            <span className={`min-w-[20px] text-center text-[11px] font-medium px-1.5 py-0.5 rounded-full ${t.alert && t.count > 0 ? 'bg-amber-500/15 text-amber-300' : 'bg-raised text-mute'}`}>{t.count}</span>
          )}
        </button>
      );
    })}
  </div>
);

export const Stat: React.FC<{ icon?: any; label: string; value: React.ReactNode; hint?: string; warn?: boolean }> = ({ icon: I, label, value, hint, warn }) => (
  <div className={`rounded-2xl border bg-surface p-4 ${warn ? 'border-amber-500/40' : 'border-line'}`}>
    <div className="flex items-center gap-2 text-xs font-medium text-mute">{I && <I size={14} />}{label}</div>
    <div className="text-2xl font-bold text-ink mt-1 leading-tight tabular-nums">{value}</div>
    {hint && <div className="text-xs text-mute mt-0.5 truncate">{hint}</div>}
  </div>
);

export const btnGhost = 'px-3.5 py-2 rounded-lg text-sm font-medium border border-line-strong text-ink-soft hover:bg-raised hover:text-ink whitespace-nowrap transition-colors inline-flex items-center gap-1.5';
export const th = 'px-4 py-2.5 text-left text-xs font-medium text-mute';
