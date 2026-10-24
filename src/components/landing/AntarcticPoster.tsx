import { PROJECT_IDENTITY } from "@/lib/station";
import { cn } from "@/lib/utils";
import { PenguinWaddle } from "./PenguinSvg";

/**
 * The poster.
 *
 * The landing page is the first thing a judge sees, so it opens with the
 * project presented as a poster: the wordmark, the programme identity, and one
 * illustration carrying the whole idea - a satellite downlinking to the station
 * on its stilts under the aurora, the operator's console in the foreground, and
 * the penguins the twin models on the ice.
 */
export function AntarcticPoster({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border/80 bg-[#04080F] shadow-[0_20px_60px_-24px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 760 480"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Satellite downlinking to the Maitri and Bharati station under the aurora, with the operator console in the foreground"
      >
        <defs>
          <linearGradient id="dt-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#04070E" />
            <stop offset="52%" stopColor="#071C2C" />
            <stop offset="100%" stopColor="#0C3348" />
          </linearGradient>
          <linearGradient id="dt-snow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CFE0EC" />
            <stop offset="100%" stopColor="#EAF3F9" />
          </linearGradient>
          <linearGradient id="dt-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7DF3E4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7DF3E4" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="dt-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E2233" />
            <stop offset="100%" stopColor="#061520" />
          </linearGradient>
          <radialGradient id="dt-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB366" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFB366" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect width="760" height="480" fill="url(#dt-sky)" />

        {/* Stars */}
        {[
          [40, 40], [96, 78], [150, 32], [214, 66], [268, 24], [318, 88],
          [372, 44], [430, 22], [486, 72], [540, 36], [604, 96], [660, 52],
          [712, 84], [78, 128], [188, 140], [352, 130], [512, 132], [666, 150],
          [22, 92], [700, 26], [246, 108], [588, 128],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={cy % 3 === 0 ? 1.6 : 1.1} fill="#DCEAF5" opacity={0.75} />
        ))}

        {/* Aurora ribbons */}
        <path
          d="M-20 150 C 140 86, 320 176, 470 108 C 580 58, 690 96, 780 62"
          fill="none"
          stroke="#3EE07F"
          strokeWidth={26}
          opacity={0.12}
          strokeLinecap="round"
        />
        <path
          d="M-20 182 C 150 122, 300 200, 460 138 C 590 88, 680 132, 780 96"
          fill="none"
          stroke="#00E0C6"
          strokeWidth={34}
          opacity={0.12}
          strokeLinecap="round"
        />
        <path
          d="M-20 210 C 170 166, 330 226, 500 172 C 620 132, 700 158, 780 130"
          fill="none"
          stroke="#4A9EFF"
          strokeWidth={18}
          opacity={0.1}
          strokeLinecap="round"
        />

        {/* Far and mid ridges */}
        <path
          d="M0 268 L86 196 L152 246 L232 168 L318 240 L392 190 L470 254 L556 176 L646 244 L760 186 L760 320 L0 320 Z"
          fill="#0A1A28"
        />
        <path
          d="M0 300 L96 240 L178 288 L268 226 L360 286 L452 232 L548 292 L648 236 L760 288 L760 360 L0 360 Z"
          fill="#102A3B"
        />
        {/* Snow caps */}
        <path d="M232 168 L262 196 L202 196 Z" fill="#D7E7F2" opacity={0.85} />
        <path d="M556 176 L584 202 L528 202 Z" fill="#D7E7F2" opacity={0.8} />
        <path d="M86 196 L112 220 L60 220 Z" fill="#D7E7F2" opacity={0.7} />

        {/* Ice field */}
        <path d="M0 336 C 150 320, 330 350, 520 330 C 630 318, 700 330, 760 322 L760 480 L0 480 Z" fill="url(#dt-snow)" />
        <path d="M0 392 C 180 376, 360 404, 560 386 C 650 378, 710 388, 760 382 L760 480 L0 480 Z" fill="#F7FBFD" opacity={0.75} />

        {/* Satellite */}
        <g transform="translate(576 58)">
          <rect x={-40} y={-9} width={34} height={18} rx={2} fill="#1D4E6B" stroke="#7DF3E4" strokeWidth={1} />
          <rect x={6} y={-9} width={34} height={18} rx={2} fill="#1D4E6B" stroke="#7DF3E4" strokeWidth={1} />
          {[-34, -24, -14, 10, 20, 30].map((x) => (
            <line key={x} x1={x} y1={-9} x2={x} y2={9} stroke="#7DF3E4" strokeWidth={0.7} opacity={0.55} />
          ))}
          <rect x={-9} y={-13} width={18} height={26} rx={3} fill="#22303F" stroke="#8FA0B2" strokeWidth={1} />
          <rect x={-4} y={-17} width={8} height={5} rx={1} fill="#FFB020" className="animate-pulse" />
          <circle cx={0} cy={16} r={7} fill="none" stroke="#C9D4DC" strokeWidth={1.4} />
          <line x1={0} y1={9} x2={0} y2={16} stroke="#C9D4DC" strokeWidth={1.2} />
        </g>

        {/* Downlink beam */}
        <path d="M576 74 L470 292 L512 300 Z" fill="url(#dt-beam)" />
        <line x1={576} y1={74} x2={492} y2={296} stroke="#7DF3E4" strokeWidth={1} strokeDasharray="6 5" opacity={0.7} />
        <line x1={576} y1={74} x2={512} y2={300} stroke="#7DF3E4" strokeWidth={1} strokeDasharray="6 5" opacity={0.4} />

        {/* Station on its stilts */}
        <g>
          {/* stilts */}
          {[438, 486, 534, 582, 630, 678].map((x) => (
            <g key={x}>
              <rect x={x} y={330} width={7} height={54} fill="#5A6570" />
              <line x1={x} y1={336} x2={x + 40} y2={372} stroke="#5A6570" strokeWidth={2} opacity={0.8} />
            </g>
          ))}
          {/* deck */}
          <rect x={420} y={322} width={290} height={10} rx={2} fill="#39434D" />

          {/* module row */}
          {[
            { x: 428, w: 62, c: "#B3402F" },
            { x: 494, w: 74, c: "#C9D4DC" },
            { x: 572, w: 62, c: "#B3402F" },
            { x: 638, w: 64, c: "#C9D4DC" },
          ].map((module) => (
            <g key={module.x}>
              <rect x={module.x} y={280} width={module.w} height={42} rx={3} fill={module.c} />
              <rect x={module.x} y={276} width={module.w} height={6} rx={2} fill="#C46A2B" />
              {/* windows */}
              {[0, 1, 2].map((i) => (
                <rect
                  key={i}
                  x={module.x + 8 + i * 17}
                  y={292}
                  width={11}
                  height={10}
                  rx={1.5}
                  fill="#FFB366"
                  opacity={0.95}
                />
              ))}
              <rect x={module.x + 8} y={308} width={module.w - 16} height={2.5} rx={1} fill="#E8EEF4" opacity={0.35} />
            </g>
          ))}

          {/* stair down to the ice */}
          <path d="M420 330 L406 384 M428 330 L414 384" stroke="#8FA0B2" strokeWidth={2} />
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={418 - i * 2.6}
              y1={334 + i * 10.5}
              x2={427 - i * 2.6}
              y2={334 + i * 10.5}
              stroke="#8FA0B2"
              strokeWidth={1.6}
            />
          ))}

          {/* roof mast and dish */}
          <rect x={490} y={252} width={3} height={28} fill="#8A949E" />
          <ellipse cx={492} cy={292} rx={22} ry={9} fill="#C9D4DC" transform="rotate(-24 492 292)" />
          <line x1={492} y1={272} x2={492} y2={292} stroke="#8A949E" strokeWidth={1.4} />
          <circle cx={492} cy={292} r={4} fill="#FFB366" />
          <circle cx={492} cy={292} r={16} fill="url(#dt-glow)" />

          {/* flag */}
          <rect x={424} y={232} width={2.6} height={90} fill="#8A949E" />
          <rect x={426.6} y={234} width={44} height={9} fill="#FF9933" />
          <rect x={426.6} y={243} width={44} height={9} fill="#F7FAFC" />
          <rect x={426.6} y={252} width={44} height={9} fill="#138808" />
          <circle cx={448.6} cy={247.5} r={3.4} fill="none" stroke="#0A3D91" strokeWidth={1.2} />
        </g>

        {/* Operator console */}
        <g>
          {[
            { x: 16, y: 356, title: "STATION OVERVIEW", kind: "plan" as const },
            { x: 132, y: 344, title: "DIGITAL TWIN", kind: "iso" as const },
            { x: 248, y: 356, title: "TELEMETRY", kind: "chart" as const },
          ].map((panel) => (
            <g key={panel.title}>
              <rect x={panel.x} y={panel.y} width={110} height={92} rx={5} fill="url(#dt-glass)" stroke="#1C3A4E" />
              <rect x={panel.x} y={panel.y} width={110} height={16} rx={5} fill="#0B1A26" />
              <text x={panel.x + 7} y={panel.y + 11.5} fontSize={7} fill="#7DF3E4" fontFamily="ui-monospace, monospace">
                {panel.title}
              </text>
              {panel.kind === "plan" && (
                <>
                  <rect x={panel.x + 8} y={panel.y + 24} width={94} height={56} rx={3} fill="#0A222E" />
                  {[0, 1, 2, 3].map((i) => (
                    <rect key={i} x={panel.x + 14 + (i % 2) * 46} y={panel.y + 30 + Math.floor(i / 2) * 26} width={40} height={20} rx={2} fill={i % 3 === 0 ? "#123D4E" : "#0E2C3A"} stroke="#1C5A6E" />
                  ))}
                  <circle cx={panel.x + 34} cy={panel.y + 40} r={3} fill="#FF3B47" className="animate-pulse" />
                </>
              )}
              {panel.kind === "iso" && (
                <>
                  <rect x={panel.x + 8} y={panel.y + 24} width={94} height={56} rx={3} fill="#0A1E30" />
                  <g transform={`translate(${panel.x + 55} ${panel.y + 66})`}>
                    <path d="M-34 0 L0 -16 L34 0 L0 16 Z" fill="#123A52" stroke="#4A9EFF" />
                    <path d="M-24 2 L0 -10 L24 2 L0 14 Z" fill="#0C2C40" stroke="#7DF3E4" strokeWidth={0.8} />
                    <line x1={-34} y1={0} x2={-34} y2={-12} stroke="#4A9EFF" strokeWidth={0.8} />
                    <line x1={0} y1={16} x2={0} y2={4} stroke="#4A9EFF" strokeWidth={0.8} />
                    <line x1={34} y1={0} x2={34} y2={-12} stroke="#4A9EFF" strokeWidth={0.8} />
                  </g>
                </>
              )}
              {panel.kind === "chart" && (
                <>
                  <rect x={panel.x + 8} y={panel.y + 24} width={94} height={56} rx={3} fill="#0A222E" />
                  <path
                    d={`M${panel.x + 12} ${panel.y + 70} L${panel.x + 26} ${panel.y + 52} L${panel.x + 40} ${panel.y + 60} L${panel.x + 54} ${panel.y + 38} L${panel.x + 68} ${panel.y + 48} L${panel.x + 82} ${panel.y + 32} L${panel.x + 96} ${panel.y + 44}`}
                    fill="none"
                    stroke="#00E0C6"
                    strokeWidth={1.8}
                  />
                  {[[26, 52], [54, 38], [82, 32]].map(([dx, dy]) => (
                    <circle key={dx} cx={panel.x + dx} cy={panel.y + dy} r={2.2} fill="#7DF3E4" />
                  ))}
                </>
              )}
            </g>
          ))}

          {/* laptop with system health gauges */}
          <g>
            <rect x={364} y={384} width={128} height={72} rx={5} fill="url(#dt-glass)" stroke="#1C3A4E" />
            <path d="M352 456 L504 456 L496 462 L360 462 Z" fill="#22303F" />
            <text x={372} y={398} fontSize={7} fill="#7DF3E4" fontFamily="ui-monospace, monospace">
              SYSTEM HEALTH
            </text>
            {[
              { cx: 392, label: "99%", value: 0.99, tone: "#3EE07F" },
              { cx: 428, label: "94%", value: 0.94, tone: "#3EE07F" },
              { cx: 464, label: "93%", value: 0.93, tone: "#FFB020" },
            ].map((gauge) => (
              <g key={gauge.cx}>
                <circle cx={gauge.cx} cy={430} r={16} fill="none" stroke="#16303F" strokeWidth={5} />
                <circle
                  cx={gauge.cx}
                  cy={430}
                  r={16}
                  fill="none"
                  stroke={gauge.tone}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={`${(gauge.value * 100 * 0.62).toFixed(1)} 200`}
                  transform={`rotate(-90 ${gauge.cx} 430)`}
                />
                <text x={gauge.cx} y={433.5} fontSize={8} fill="#E8EEF4" textAnchor="middle" fontFamily="ui-monospace, monospace">
                  {gauge.label}
                </text>
              </g>
            ))}
            <text x={372} y={464} fontSize={6.5} fill="#8FA0B2" fontFamily="ui-monospace, monospace">
              OFFLINE QUEUE 0 PENDING
            </text>
          </g>
        </g>
      </svg>

      {/* Penguins, standing on the ice in front of the station */}
      <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
        <PenguinWaddle
          kinds={["emperor", "adelie", "gentoo"]}
          chicks={1}
          penguinClassName="h-14 w-auto sm:h-16"
          bob={3}
          className="gap-2 sm:gap-3"
        />
      </div>

      {/* Poster annotations */}
      <div className="absolute right-3 top-3 flex items-center gap-2 rounded border border-[#FFB020]/50 bg-[#060B14]/80 px-2.5 py-1 backdrop-blur">
        <span className="size-2 rounded-full bg-[#FFB020]" />
        <span className="cc-mono text-[9px] font-semibold uppercase tracking-wider text-[#FFB020]">
          {PROJECT_IDENTITY.event}
        </span>
      </div>
      <div className="absolute left-3 top-3 rounded border border-[#00E0C6]/40 bg-[#060B14]/80 px-2.5 py-1 backdrop-blur">
        <span className="cc-mono text-[9px] font-semibold uppercase tracking-wider text-[#7DF3E4]">
          Maitri 70 45 S - Bharati 69 24 S - 3,098 km apart
        </span>
      </div>
    </div>
  );
}

/** Two-tone wordmark: Dhruva in the ice gradient, Twin in the station orange. */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-extrabold leading-none tracking-tight", className)}>
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(120deg, #7DF3E4 0%, #4A9EFF 55%, #2F6BB0 100%)",
        }}
      >
        Dhruva
      </span>
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(120deg, #FFC46B 0%, #F58220 60%, #C46A2B 100%)",
        }}
      >
        Twin
      </span>
    </span>
  );
}

/** The project identity table, as a poster spec block. */
export function IdentityTable({ className }: { className?: string }) {
  const rows = [
    { label: "PS ID", value: PROJECT_IDENTITY.psId },
    { label: "THEME", value: PROJECT_IDENTITY.theme },
    { label: "CATEGORY", value: PROJECT_IDENTITY.category },
    { label: "PROJECT", value: PROJECT_IDENTITY.project },
    { label: "STATIONS", value: "Maitri & Bharati" },
  ];
  return (
    <dl className={cn("overflow-hidden rounded border border-border bg-card/60", className)}>
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={cn("flex items-stretch", index > 0 && "border-t border-border")}
        >
          <dt className="flex w-[104px] shrink-0 items-center border-r border-border bg-[#060B14]/60 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-[#F58220]">
            {row.label}
          </dt>
          <dd className="flex flex-1 items-center px-3 py-1.5 text-xs font-semibold text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
