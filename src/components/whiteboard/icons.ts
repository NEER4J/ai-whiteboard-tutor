import type { ICON_NAMES } from "@/lib/schema"

/**
 * Hand-authored line icons on a 100 x 100 grid. Each icon is a list of SVG path
 * strings; `fill` marks icons whose first path is a closed shape that looks
 * good with a light hatched fill. They are drawn through rough.js, so they take
 * on the same wobbly marker look as everything else on the board.
 */
type Icon = { paths: string[]; fill?: boolean }

export const ICONS: Record<(typeof ICON_NAMES)[number], Icon> = {
  sun: {
    paths: [
      "M32 50 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0",
      "M50 8 V22 M50 78 V92 M8 50 H22 M78 50 H92 M20 20 L30 30 M70 70 L80 80 M80 20 L70 30 M30 70 L20 80",
    ],
    fill: true,
  },
  cloud: { paths: ["M28 72 C8 72 6 46 26 44 C26 24 52 18 62 34 C76 26 94 38 88 54 C100 60 96 74 80 72 Z"], fill: true },
  tree: {
    paths: [
      "M50 8 C20 8 12 44 38 52 C18 62 36 72 50 66 C64 72 82 62 62 52 C88 44 80 8 50 8 Z",
      "M45 96 V64 M55 96 V64 M38 96 H62",
    ],
    fill: true,
  },
  house: {
    paths: [
      "M10 48 L50 14 L90 48 M20 42 V90 H80 V42 M42 90 V62 H58 V90",
      "M68 30 V16 H78 V38",
    ],
  },
  person: {
    paths: [
      "M60 22 a10 10 0 1 0 -20 0 a10 10 0 1 0 20 0",
      "M50 34 V64 M50 42 L30 58 M50 42 L70 58 M50 64 L34 94 M50 64 L66 94",
    ],
    fill: true,
  },
  bulb: {
    paths: [
      "M50 10 C26 10 20 38 34 54 C40 61 40 66 40 72 H60 C60 66 60 61 66 54 C80 38 74 10 50 10 Z",
      "M40 80 H60 M43 88 H57 M50 0 V4 M20 12 L24 16 M80 12 L76 16",
    ],
    fill: true,
  },
  gear: {
    paths: [
      "M44 8 H56 L58 20 L68 24 L78 16 L86 24 L78 34 L82 44 L94 46 V56 L82 58 L78 68 L86 78 L78 86 L68 78 L58 82 L56 94 H44 L42 82 L32 78 L22 86 L14 78 L22 68 L18 58 L6 56 V46 L18 44 L22 34 L14 24 L22 16 L32 24 L42 20 Z",
      "M62 50 a12 12 0 1 0 -24 0 a12 12 0 1 0 24 0",
    ],
    fill: true,
  },
  heart: { paths: ["M50 88 C8 56 10 18 34 18 C44 18 50 26 50 34 C50 26 56 18 66 18 C90 18 92 56 50 88 Z"], fill: true },
  star: { paths: ["M50 8 L61 38 L93 38 L67 57 L77 90 L50 70 L23 90 L33 57 L7 38 L39 38 Z"], fill: true },
  magnet: {
    paths: ["M20 10 V52 C20 84 80 84 80 52 V10 H62 V52 C62 64 38 64 38 52 V10 Z", "M20 24 H38 M62 24 H80"],
    fill: true,
  },
  battery: {
    paths: ["M10 28 H82 V72 H10 Z", "M82 42 H94 V58 H82", "M26 50 H40 M33 43 V57 M58 50 H72"],
    fill: true,
  },
  droplet: {
    paths: ["M50 6 C50 6 20 42 20 64 C20 82 34 94 50 94 C66 94 80 82 80 64 C80 42 50 6 50 6 Z", "M36 66 C36 76 42 82 48 84"],
    fill: true,
  },
  mountain: { paths: ["M4 90 L36 26 L54 60 L68 40 L96 90 Z", "M26 44 L32 50 L36 42 L42 50 L46 46"], fill: true },
  book: { paths: ["M10 24 C28 16 42 20 50 30 C58 20 72 16 90 24 V82 C72 74 58 78 50 88 C42 78 28 74 10 82 Z", "M50 30 V88"], fill: true },
  flask: {
    paths: ["M40 8 H60 M44 8 V38 L16 84 C12 92 18 94 24 94 H76 C82 94 88 92 84 84 L56 38 V8", "M28 68 H72"],
    fill: true,
  },
  laptop: { paths: ["M20 22 H80 V66 H20 Z", "M8 78 H92 L82 66 H18 Z", "M40 72 H60"], fill: true },
  globe: {
    paths: [
      "M50 8 a42 42 0 1 0 0.1 0",
      "M8 50 H92 M50 8 C28 28 28 72 50 92 C72 72 72 28 50 8 M14 28 C34 36 66 36 86 28 M14 72 C34 64 66 64 86 72",
    ],
    fill: true,
  },
  rocket: {
    paths: [
      "M50 6 C68 22 70 50 62 68 H38 C30 50 32 22 50 6 Z",
      "M57 38 a7 7 0 1 0 -14 0 a7 7 0 1 0 14 0 M38 68 L24 86 L38 80 M62 68 L76 86 L62 80 M44 78 L50 96 L56 78",
    ],
    fill: true,
  },
  clock: {
    paths: ["M50 10 a40 40 0 1 0 0.1 0", "M50 28 V50 L66 60 M50 14 V18 M50 82 V86 M14 50 H18 M82 50 H86"],
    fill: true,
  },
  lock: { paths: ["M22 44 H78 V90 H22 Z", "M34 44 V30 C34 6 66 6 66 30 V44 M50 60 V74"], fill: true },
  brain: {
    paths: [
      "M50 18 C40 4 18 10 22 28 C6 32 8 54 24 56 C18 72 36 84 50 76 C64 84 82 72 76 56 C92 54 94 32 78 28 C82 10 60 4 50 18 Z",
      "M50 18 V76 M34 36 C42 38 42 46 34 50 M66 36 C58 38 58 46 66 50",
    ],
    fill: true,
  },
  flame: {
    paths: [
      "M50 6 C56 26 78 36 76 62 C74 82 60 94 50 94 C38 94 24 82 26 62 C28 50 36 44 38 32 C44 38 46 44 46 50 C54 38 52 22 50 6 Z",
      "M50 94 C42 88 40 76 46 68 C50 74 58 76 60 82",
    ],
    fill: true,
  },
  leaf: { paths: ["M10 90 C10 40 40 12 92 8 C92 62 62 90 10 90 Z", "M10 90 L58 42 M40 66 L30 58 M54 52 L48 40"], fill: true },
  atom: {
    paths: [
      "M55 50 a5 5 0 1 0 -10 0 a5 5 0 1 0 10 0",
      "M10 50 A40 15 0 1 0 90 50 A40 15 0 1 0 10 50",
      "M30 15.4 A40 15 60 1 0 70 84.6 A40 15 60 1 0 30 15.4",
      "M70 15.4 A40 15 120 1 0 30 84.6 A40 15 120 1 0 70 15.4",
    ],
  },
}
