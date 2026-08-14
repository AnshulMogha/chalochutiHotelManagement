import { cn } from "@/lib/utils";

export type ReportIdOption = {
  id: number;
  name: string;
};

export function ReportIdMultiSelect({
  title,
  hint,
  options,
  selectedIds,
  onChange,
}: {
  title: string;
  hint?: string;
  options: ReportIdOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const selected = new Set(selectedIds);
  const allSelected =
    options.length > 0 && options.every((option) => selected.has(option.id));

  const toggle = (id: number) => {
    onChange(
      selected.has(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {options.length > 0 ? (
          <button
            type="button"
            onClick={() =>
              onChange(allSelected ? [] : options.map((option) => option.id))
            }
            className="text-xs font-semibold text-[#2f3d95] hover:underline"
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p className="mb-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
      <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 p-1.5">
        {options.length === 0 ? (
          <p className="px-2 py-2 text-sm text-slate-500">No options</p>
        ) : (
          options.map((option) => {
            const checked = selected.has(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50",
                  checked && "bg-slate-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="h-4 w-4 rounded border-slate-300 text-[#2f3d95] focus:ring-[#2f3d95]/30"
                />
                <span className="min-w-0 truncate text-slate-800">
                  {option.name}
                </span>
              </label>
            );
          })
        )}
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        {selectedIds.length
          ? `${selectedIds.length} selected`
          : "All included when none selected"}
      </p>
    </section>
  );
}

export function mergeIdOptions(
  current: ReportIdOption[],
  incoming: ReportIdOption[],
): ReportIdOption[] {
  const next = new Map(current.map((option) => [option.id, option.name]));
  for (const option of incoming) {
    if (!next.has(option.id) && option.id != null && option.name) {
      next.set(option.id, option.name);
    }
  }
  return [...next.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function selectedOptionLabel(
  options: ReportIdOption[],
  ids: number[],
  singular: string,
  plural: string,
): string | null {
  if (!ids.length) return null;
  if (ids.length === 1) {
    return options.find((option) => option.id === ids[0])?.name ?? singular;
  }
  return `${ids.length} ${plural}`;
}
