import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileDown, Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared look for download, filter, and refresh icon buttons. Matches transfer management. */
export const toolbarIconButtonClassName = cn(
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border p-0",
  "border-[#3344A5]/20 bg-[#EEF2FF] text-[#3344A5]",
  "shadow-[0_1px_2px_rgba(51,68,165,0.08)] transition-all duration-200",
  "hover:border-[#3344A5]/40 hover:bg-[#E0E7FF] hover:text-[#29388A]",
  "hover:shadow-[0_4px_12px_rgba(51,68,165,0.16)]",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export const toolbarIconButtonActiveClassName = cn(
  "border-[#3344A5]/45 bg-[#3344A5] text-white",
  "shadow-[0_4px_14px_rgba(51,68,165,0.28)]",
  "hover:bg-[#29388A] hover:text-white",
);

type ToolbarIconButtonProps = {
  icon: LucideIcon;
  tooltip: string;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  "aria-haspopup"?: boolean | "menu";
  "aria-expanded"?: boolean;
};

export function ToolbarIconButton({
  icon: Icon,
  tooltip,
  onClick,
  busy,
  disabled,
  active,
  className,
  ...aria
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className={cn(
        toolbarIconButtonClassName,
        active && toolbarIconButtonActiveClassName,
        className,
      )}
      aria-label={tooltip}
      title={tooltip}
      {...aria}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
      ) : (
        <Icon
          className={cn("h-4 w-4", active ? "text-white" : "text-[#3344A5]")}
          strokeWidth={2.25}
        />
      )}
    </button>
  );
}

export function RefreshToolbarButton({
  onClick,
  busy,
  disabled,
  tooltip = "Refresh",
  className,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}) {
  return (
    <ToolbarIconButton
      icon={RefreshCw}
      tooltip={tooltip}
      onClick={onClick}
      busy={busy}
      disabled={disabled}
      className={className}
    />
  );
}

export function DownloadToolbarButton({
  onClick,
  busy,
  disabled,
  tooltip = "Download",
  className,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}) {
  return (
    <ToolbarIconButton
      icon={FileDown}
      tooltip={tooltip}
      onClick={onClick}
      busy={busy}
      disabled={disabled}
      className={className}
    />
  );
}

export type ToolbarMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
};

/** Icon button that opens a format menu under the control. */
export function ToolbarMenu({
  tooltip = "Download",
  busy,
  disabled,
  items,
  icon = FileDown,
  excludeFromCapture,
  className,
}: {
  tooltip?: string;
  busy?: boolean;
  disabled?: boolean;
  items: ToolbarMenuItem[];
  icon?: LucideIcon;
  excludeFromCapture?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (busy) setOpen(false);
  }, [busy]);

  return (
    <div
      className={cn("relative", className)}
      ref={menuRef}
      {...(excludeFromCapture ? { "data-exclude-from-capture": "true" } : {})}
    >
      <ToolbarIconButton
        icon={icon}
        tooltip={tooltip}
        busy={busy}
        disabled={disabled}
        active={open}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      />
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/5"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={busy || disabled || item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-[#eef2ff] hover:text-[#2f3d95] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200/80">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function reportSectionTabClass(active: boolean) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
    active
      ? "bg-[#3344A5] text-white shadow-sm"
      : "text-[#64748B] hover:bg-[#F1F4F9] hover:text-[#172033]",
  );
}

export function reportSectionTabBadgeClass(active: boolean) {
  return cn(
    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
    active ? "bg-white/20 text-white" : "bg-[#F1F4F9] text-[#64748B]",
  );
}

export function ReportSectionTabBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[12px] border border-[#E2E8F0] bg-white px-2 py-2 shadow-sm sm:px-3",
        className,
      )}
    >
      <div className="flex min-w-max gap-1">{children}</div>
    </div>
  );
}

export type ReportSectionTabItem = {
  id: string;
  label: string;
  badge?: string | number;
  icon?: LucideIcon;
};

export function ReportSectionTabs({
  tabs,
  activeId,
  onChange,
  layout = "bar",
  className,
}: {
  tabs: ReportSectionTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  layout?: "bar" | "inline";
  className?: string;
}) {
  const buttons = tabs.map((tab) => {
    const active = tab.id === activeId;
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={reportSectionTabClass(active)}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.25} /> : null}
        {tab.label}
        {tab.badge != null ? (
          <span className={reportSectionTabBadgeClass(active)}>{tab.badge}</span>
        ) : null}
      </button>
    );
  });

  if (layout === "inline") {
    return <div className={cn("flex min-w-max gap-1", className)}>{buttons}</div>;
  }

  return <ReportSectionTabBar className={className}>{buttons}</ReportSectionTabBar>;
}
