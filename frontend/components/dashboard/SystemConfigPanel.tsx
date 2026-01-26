import React from "react";

interface ConfigRow {
  id: string;
  label: string;
  value: string;
}

interface SystemConfigPanelProps {
  rows: ConfigRow[];
}

export const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({
  rows,
}) => {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm px-6 py-5">
      <h2 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-4">
        System configuration
      </h2>
      <div className="divide-y divide-neutral-100">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between h-12 text-[14px]"
          >
            <span className="text-neutral-600">{row.label}</span>
            <span className="text-neutral-900 font-medium">{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
