import type { ReactNode } from "react";
import logo from "@/assets/originallogo.webp";

export function AuthSplitShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-black/20 min-h-[min(540px,calc(100vh-3rem))]">
        <aside className="relative hidden w-[44%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-center">
          <div className="absolute inset-0 bg-[#2f3d95]" />

          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/15 blur-sm"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-[18%] -right-10 h-44 w-44 rounded-full bg-white/20 shadow-inner"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-[20%] h-64 w-64 rounded-full bg-black/10 blur-sm"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-[12%] right-[8%] h-28 w-28 rounded-full bg-white/25"
          />

          <svg
            aria-hidden
            className="pointer-events-none absolute top-0 -right-px h-full w-16 text-white"
            viewBox="0 0 64 800"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C40,120 40,680 0,800 L64,800 L64,0 Z"
              fill="currentColor"
            />
          </svg>

          <div className="relative z-10 px-10 py-12 xl:px-14">
            <img
              src={logo}
              alt="ChaloChutti logo"
              className="mb-10 h-9 w-auto object-contain"
            />
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
              Welcome
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white xl:text-4xl">
              Hotel
              <br />
              Management
            </h1>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/75">
              Manage hotels, bookings, and operations from one secure workspace
              built for your team.
            </p>
          </div>
        </aside>

        <main className="relative flex flex-1 flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
          <div className="mb-8 flex justify-center lg:hidden">
            <img
              src={logo}
              alt="ChaloChutti logo"
              className="h-8 w-auto object-contain"
            />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -right-10 hidden h-36 w-36 rounded-full bg-[#2f3d95]/15 lg:block"
          />

          <div className="relative mx-auto w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
