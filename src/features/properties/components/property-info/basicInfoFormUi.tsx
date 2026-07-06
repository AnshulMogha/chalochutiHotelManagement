import { cn } from "@/lib/utils";

export function BasicInfoFormCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BasicInfoFormLoading({ message }: { message: string }) {
  return (
    <BasicInfoFormCard>
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-500" />
        <p className="text-sm font-medium text-gray-500">{message}</p>
      </div>
    </BasicInfoFormCard>
  );
}

export function BasicInfoFormDivider() {
  return <div className="my-8 border-t border-dashed border-slate-200" />;
}

export function BasicInfoFormPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
