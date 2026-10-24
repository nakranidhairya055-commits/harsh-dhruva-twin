import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Cute hand-drawn penguins for the public pages.
 *
 * Four kinds, drawn to the same proportions the 3D twin uses: plump bodies,
 * deliberately oversized heads, wide-set eyes with a glint, rosy cheeks and
 * orange feet. The species markings that make each one identifiable are kept
 * correct - the Adelie eye ring, the emperor neck patch, the chinstrap strap,
 * the gentoo bonnet - so the mascots match the animals in the twin rather than
 * being generic birds.
 *
 * Shading is what stops them reading as flat clip art, so each bird is built
 * from gradients rather than solid fills: the sun sits low behind the colony in
 * the twin, which lights the crown and the left shoulder and leaves the belly
 * in soft blue shadow, the way a real bird photographs on the ice. A contact
 * shadow under the feet plants them on the ground.
 */
export type PenguinKind = "adelie" | "emperor" | "chinstrap" | "gentoo";

interface Shade {
  back: string;
  backLight: string;
  backDark: string;
  belly: string;
  bellyShade: string;
  beak: string;
  flap: string;
}

const PALETTE: Record<PenguinKind, Shade> = {
  adelie: {
    back: "#121A24",
    backLight: "#33465C",
    backDark: "#070C12",
    belly: "#F7FAFC",
    bellyShade: "#C6D6E4",
    beak: "#F58220",
    flap: "#0C131B",
  },
  emperor: {
    back: "#243447",
    backLight: "#476788",
    backDark: "#131E2A",
    belly: "#F4E7CC",
    bellyShade: "#D3BC90",
    beak: "#E9A23B",
    flap: "#1B2836",
  },
  chinstrap: {
    back: "#161F2B",
    backLight: "#3A4F66",
    backDark: "#080D14",
    belly: "#F7FAFC",
    bellyShade: "#C6D6E4",
    beak: "#F58220",
    flap: "#0E151E",
  },
  gentoo: {
    back: "#121A24",
    backLight: "#33465C",
    backDark: "#070C12",
    belly: "#F7FAFC",
    bellyShade: "#C6D6E4",
    beak: "#E4572E",
    flap: "#0C131B",
  },
};

/** The markings that identify each species, drawn under the eyes. */
function Markings({ kind, belly }: { kind: PenguinKind; belly: string }) {
  if (kind === "emperor") {
    return (
      <>
        <ellipse cx={38} cy={64} rx={8.5} ry={15} fill="#FFC94D" opacity={0.92} transform="rotate(-14 38 64)" />
        <ellipse cx={82} cy={64} rx={8.5} ry={15} fill="#FFC94D" opacity={0.92} transform="rotate(14 82 64)" />
      </>
    );
  }
  if (kind === "chinstrap") {
    return (
      <>
        <path d="M42 50 Q60 64 78 50" fill="none" stroke="#0E151E" strokeWidth={3.4} strokeLinecap="round" />
        <path d="M42 50 Q37 42 39 32" fill="none" stroke="#0E151E" strokeWidth={3.2} strokeLinecap="round" />
        <path d="M78 50 Q83 42 81 32" fill="none" stroke="#0E151E" strokeWidth={3.2} strokeLinecap="round" />
      </>
    );
  }
  if (kind === "gentoo") {
    return (
      <>
        <ellipse cx={45} cy={30} rx={7.5} ry={5} fill={belly} transform="rotate(-18 45 30)" />
        <ellipse cx={75} cy={30} rx={7.5} ry={5} fill={belly} transform="rotate(18 75 30)" />
      </>
    );
  }
  return (
    <>
      <circle cx={51} cy={40} r={9} fill="none" stroke={belly} strokeWidth={3.6} />
      <circle cx={69} cy={40} r={9} fill="none" stroke={belly} strokeWidth={3.6} />
    </>
  );
}

/** One adult penguin, drawn at 120 by 150 and scaled by the caller. */
function AdultSvg({ kind, className }: { kind: PenguinKind; className?: string }) {
  const p = PALETTE[kind];
  const uid = `pg-${kind}`;
  return (
    <svg
      viewBox="0 0 120 150"
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={`${kind} penguin`}
    >
      <defs>
        <linearGradient id={`${uid}-back`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={p.backLight} />
          <stop offset="0.5" stopColor={p.back} />
          <stop offset="1" stopColor={p.backDark} />
        </linearGradient>
        <linearGradient id={`${uid}-belly`} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor={p.belly} />
          <stop offset="0.68" stopColor={p.belly} />
          <stop offset="1" stopColor={p.bellyShade} />
        </linearGradient>
        <radialGradient id={`${uid}-head`} cx="0.36" cy="0.26" r="0.9">
          <stop offset="0" stopColor={p.backLight} />
          <stop offset="0.62" stopColor={p.back} />
          <stop offset="1" stopColor={p.backDark} />
        </radialGradient>
        <linearGradient id={`${uid}-flap`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={p.backLight} />
          <stop offset="0.55" stopColor={p.flap} />
          <stop offset="1" stopColor={p.backDark} />
        </linearGradient>
      </defs>

      {/* Contact shadow, so the bird stands on the ice instead of hovering. */}
      <ellipse cx={60} cy={146} rx={32} ry={5} fill="#04121C" opacity={0.35} />

      {/* Feet */}
      <ellipse cx={47} cy={140} rx={12} ry={5.4} fill={p.beak} />
      <ellipse cx={73} cy={140} rx={12} ry={5.4} fill={p.beak} />
      <ellipse cx={47} cy={139} rx={9} ry={3.4} fill="#FFFFFF" opacity={0.16} />

      {/* Flippers, behind the body */}
      <ellipse cx={27} cy={90} rx={9} ry={27} fill={`url(#${uid}-flap)`} transform="rotate(-13 27 90)" />
      <ellipse cx={93} cy={90} rx={9} ry={27} fill={`url(#${uid}-flap)`} transform="rotate(13 93 90)" />

      {/* Body and belly */}
      <ellipse cx={60} cy={90} rx={33} ry={48} fill={`url(#${uid}-back)`} />
      <ellipse cx={60} cy={97} rx={23} ry={38} fill={`url(#${uid}-belly)`} />

      {/* Head */}
      <circle cx={60} cy={44} r={27} fill={`url(#${uid}-head)`} />

      <Markings kind={kind} belly={p.belly} />

      {/* Face patch */}
      <ellipse cx={60} cy={50} rx={19} ry={19} fill={p.belly} />
      <ellipse cx={60} cy={53} rx={16} ry={14} fill={p.bellyShade} opacity={0.28} />

      {/* Cheeks */}
      <ellipse cx={41} cy={53} rx={6} ry={3.8} fill="#F58C8C" opacity={0.6} />
      <ellipse cx={79} cy={53} rx={6} ry={3.8} fill="#F58C8C" opacity={0.6} />

      {/* Eyes with a glint */}
      <circle cx={51.5} cy={41} r={5.3} fill="#0B1119" />
      <circle cx={68.5} cy={41} r={5.3} fill="#0B1119" />
      <circle cx={53.2} cy={39.2} r={1.9} fill="#FFFFFF" />
      <circle cx={70.2} cy={39.2} r={1.9} fill="#FFFFFF" />

      {/* Beak */}
      <path d="M54 51.5 L66 51.5 L60 63 Z" fill={p.beak} />
      <path d="M54 51.5 L66 51.5 L60 55.5 Z" fill="#FFFFFF" opacity={0.22} />

      {/* Rim light down the lit side, which reads as feathers rather than ink. */}
      <circle cx={60} cy={44} r={27} fill="none" stroke="#FFFFFF" strokeWidth={1.3} opacity={0.1} />
      <ellipse cx={60} cy={90} rx={33} ry={48} fill="none" stroke="#FFFFFF" strokeWidth={1.3} opacity={0.07} />
    </svg>
  );
}

/** An emperor chick: downy grey, dark cap, and a begging open beak. */
function ChickSvg({ className }: { className?: string }) {
  const uid = "pg-chick";
  return (
    <svg
      viewBox="0 0 120 150"
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="emperor penguin chick"
    >
      <defs>
        <radialGradient id={`${uid}-down`} cx="0.34" cy="0.26" r="0.92">
          <stop offset="0" stopColor="#E4EBF1" />
          <stop offset="0.55" stopColor="#BCC8D2" />
          <stop offset="1" stopColor="#8C9BA8" />
        </radialGradient>
        <radialGradient id={`${uid}-cap`} cx="0.4" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#4E6175" />
          <stop offset="1" stopColor="#1B2734" />
        </radialGradient>
      </defs>

      <ellipse cx={60} cy={142} rx={27} ry={4.6} fill="#04121C" opacity={0.32} />

      {/* Feet */}
      <ellipse cx={50} cy={136} rx={9} ry={4.2} fill="#3B3B3B" />
      <ellipse cx={70} cy={136} rx={9} ry={4.2} fill="#3B3B3B" />

      {/* Downy body, made shaggy with overlapping puffs. */}
      <ellipse cx={60} cy={100} rx={31} ry={36} fill={`url(#${uid}-down)`} />
      {[
        [34, 84, 7],
        [86, 84, 7],
        [38, 118, 7],
        [82, 118, 7],
        [60, 68, 7],
        [46, 70, 6],
        [74, 70, 6],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={`url(#${uid}-down)`} />
      ))}

      {/* Pale front */}
      <ellipse cx={60} cy={106} rx={20} ry={26} fill="#EDF3F7" opacity={0.85} />

      {/* Head and dark cap */}
      <circle cx={60} cy={62} r={24} fill={`url(#${uid}-down)`} />
      <path d="M36 58 A24 24 0 0 1 84 58 Q70 48 60 48 Q50 48 36 58 Z" fill={`url(#${uid}-cap)`} />

      {/* Cheeks and eyes */}
      <ellipse cx={44} cy={68} rx={5} ry={3.2} fill="#F58C8C" opacity={0.55} />
      <ellipse cx={76} cy={68} rx={5} ry={3.2} fill="#F58C8C" opacity={0.55} />
      <circle cx={52} cy={62} r={4.6} fill="#0B1119" />
      <circle cx={68} cy={62} r={4.6} fill="#0B1119" />
      <circle cx={53.6} cy={60.4} r={1.7} fill="#FFFFFF" />
      <circle cx={69.6} cy={60.4} r={1.7} fill="#FFFFFF" />

      {/* Begging open beak */}
      <path d="M54 71 L66 71 L60 79 Z" fill="#7A7A7A" />
      <path d="M54 71 L66 71 L60 75 Z" fill="#2E2E2E" />

      <circle cx={60} cy={62} r={24} fill="none" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.14} />
    </svg>
  );
}

export function PenguinSvg({
  kind = "adelie",
  className,
  chick = false,
}: {
  kind?: PenguinKind;
  className?: string;
  /** Draw the downy chick instead of the adult. */
  chick?: boolean;
}) {
  return chick ? <ChickSvg className={className} /> : <AdultSvg kind={kind} className={className} />;
}

/**
 * A waddle of penguins that bob out of phase.
 *
 * Used as the mascot band on the landing page. The animation is a small
 * vertical bob with a stagger, which reads as birds shifting their weight
 * rather than a looping cartoon.
 */
export function PenguinWaddle({
  kinds = ["adelie", "emperor", "chinstrap", "gentoo"],
  className,
  penguinClassName,
  bob = 4,
  chicks = 0,
}: {
  kinds?: PenguinKind[];
  className?: string;
  penguinClassName?: string;
  bob?: number;
  /** How many chicks to stand at the front of the group. */
  chicks?: number;
}) {
  const birds = [
    ...kinds.map((kind) => ({ kind, chick: false })),
    ...Array.from({ length: chicks }, () => ({ kind: "emperor" as PenguinKind, chick: true })),
  ];
  return (
    <div className={cn("flex items-end justify-center gap-2 sm:gap-3", className)}>
      {birds.map((bird, index) => (
        <motion.div
          key={`${bird.kind}-${bird.chick ? "chick" : "adult"}-${index}`}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.08 }}
        >
          <motion.div
            animate={{
              y: [0, bird.chick ? -bob * 1.3 : -bob, 0],
              rotate: [0, index % 2 === 0 ? -1.6 : 1.6, 0],
              scale: [1, bird.chick ? 1.025 : 1.015, 1],
            }}
            transition={{
              duration: 2.6 + index * 0.35,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.3,
            }}
          >
            <PenguinSvg
              kind={bird.kind}
              chick={bird.chick}
              className={cn(
                "w-auto drop-shadow-[0_10px_16px_rgba(2,8,16,0.55)]",
                bird.chick ? "h-16 sm:h-20" : "h-24",
                penguinClassName,
              )}
            />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
