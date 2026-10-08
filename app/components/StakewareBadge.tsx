/* eslint-disable @next/next/no-img-element */

export function StakewareBadge({ source }: { source: string }) {
  return (
    <a
      href={`https://stakeware.xyz/?utm_source=${source}&utm_medium=sponsor_badge`}
      target="_blank"
      rel="noopener sponsored"
      className="stakeware-badge group relative inline-flex max-w-full rounded-full p-[1.5px] shadow-lg shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-cyan-400/30"
      aria-label="Sponsored by Stakeware. Using this faucet? Consider staking with us."
    >
      <span className="relative flex items-center gap-3 rounded-full bg-slate-950 py-1.5 pl-1.5 pr-5">
        <img
          src="/stakeware-mark.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 flex-none rounded-full ring-1 ring-cyan-400/40 transition-transform duration-500 group-hover:rotate-[20deg]"
        />
        <span className="flex min-w-0 flex-col text-left leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">
            Sponsored by
          </span>
          <span className="bg-gradient-to-r from-cyan-200 via-teal-200 to-emerald-300 bg-clip-text text-base font-bold text-transparent">
            Stakeware
          </span>
          <span className="text-xs text-slate-400 transition-colors group-hover:text-slate-200">
            Using this faucet? Consider staking with us
            <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </span>
      </span>
    </a>
  );
}
