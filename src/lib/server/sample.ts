import "server-only"
import type { Clip } from "../schema"

/**
 * Hand-written sample content used ONLY when no AI Gateway credentials are
 * configured (or MOCK_AI=1). The UI labels this mode as "Sample mode" so it is
 * never mistaken for a live model response.
 */

const redWave = [[80,200],[98,176],[116,163],[133,167],[151,187],[169,213],[187,233],[204,237],[222,224],[240,200],[258,176],[276,163],[293,167],[311,187],[329,213],[347,233],[364,237],[382,224],[400,200],[418,176],[436,163],[453,167],[471,187],[489,213],[507,233],[524,237],[542,224],[560,200]]
const blueWave = [[80,380],[92,353],[105,365],[117,399],[129,405],[142,376],[154,352],[166,369],[178,402],[191,403],[203,371],[215,352],[228,373],[240,404],[252,400],[265,367],[277,353],[289,378],[302,406],[314,397],[326,363],[338,354],[351,382],[363,407],[375,393],[388,360],[400,356],[412,387],[425,408],[437,389],[449,357],[462,358],[474,391],[486,408],[498,384],[511,355],[523,361],[535,395],[548,407],[560,380]]

export const SAMPLE_LESSON: Clip = {
  title: "Why the sky is blue",
  reply:
    "**Sample mode** — no AI key is configured on this deployment, so you're seeing a pre-written lesson about why the sky is blue. With a key, Chalk generates a lesson for any topic.",
  segments: [
    {
      newBoard: true,
      boardTitle: "A blue puzzle",
      boardPlan: "title top-left; sun icon left; person looking up at right; sky label and a question note bottom-right",
      narration:
        "Have you ever wondered why the sky is blue, when sunlight itself looks white? Let's figure it out together, one drawing at a time.",
      elements: [
        { type: "text", id: "t1", cue: "why the sky is blue", x: 50, y: 70, text: "Why is the sky blue?", size: "lg" },
        { type: "icon", id: "sun", cue: "sunlight itself looks white", name: "sun", x: 90, y: 190, size: 130, label: "Sunlight = white?", color: "orange" },
        { type: "icon", id: "me", cue: "figure it out", name: "person", x: 760, y: 370, size: 120, label: "You", color: "ink" },
        { type: "curve", id: "look", cue: "one drawing at a time", x1: 800, y1: 360, x2: 800, y2: 190, bend: 70, label: "look up", color: "blue" },
        { type: "note", id: "q", cue: "Let's figure it out", x: 340, y: 400, w: 300, h: 100, text: "Sunlight looks white, so where does blue come from?", color: "orange" },
      ],
    },
    {
      newBoard: false,
      narration:
        "Sunlight is actually a mix of every color of the rainbow. A prism can split that white light into red, green, blue and violet.",
      elements: [
        { type: "arrow", id: "ray", cue: "a mix of every", x1: 250, y1: 255, x2: 455, y2: 285, label: "white light" },
        { type: "path", id: "prism", cue: "A prism", points: [[440, 350], [510, 210], [580, 350]], closed: true, fill: true },
        { type: "arrow", id: "r", cue: "into red", x1: 575, y1: 285, x2: 900, y2: 215, color: "red", label: "red" },
        { type: "arrow", id: "g", cue: "green", x1: 580, y1: 295, x2: 900, y2: 290, color: "green", label: "green" },
        { type: "arrow", id: "b", cue: "blue and violet", x1: 582, y1: 305, x2: 900, y2: 370, color: "blue", label: "blue + violet" },
        { type: "brace", id: "mix", cue: "every color of the rainbow", x1: 900, y1: 190, x2: 900, y2: 400, label: "a rainbow", color: "purple" },
      ],
    },
    {
      newBoard: true,
      boardTitle: "Colors are waves",
      boardPlan: "title top-left; red wave y ~200 and blue wave y ~380 across x 80-560; labels and a note in the right column",
      narration:
        "Each color is a wave of light. Red light has long, lazy waves, while blue light has short, choppy waves.",
      elements: [
        { type: "text", id: "t2", cue: "Each color is a wave", x: 50, y: 70, text: "Colors are waves", size: "lg" },
        { type: "path", id: "wr", cue: "Red light has long", points: redWave, smooth: true, color: "red" },
        { type: "text", id: "lr", cue: "long, lazy waves", x: 600, y: 210, text: "red: long wavelength", size: "sm", color: "red" },
        { type: "brace", id: "len", cue: "long, lazy", x1: 80, y1: 262, x2: 400, y2: 262, label: "one long wave", color: "red" },
        { type: "path", id: "wb", cue: "blue light has short", points: blueWave, smooth: true, color: "blue" },
        { type: "text", id: "lb", cue: "short, choppy waves", x: 600, y: 390, text: "blue: short wavelength", size: "sm", color: "blue" },
      ],
    },
    {
      newBoard: false,
      narration:
        "Remember this difference, because it's the whole secret. Shorter waves get bounced around much more easily by tiny particles.",
      elements: [
        { type: "highlight", id: "h1", cue: "the whole secret", target: "wb", style: "box", color: "orange" },
        { type: "note", id: "n2", cue: "bounced around much more", x: 600, y: 440, w: 340, h: 100, text: "Short waves scatter more than long waves", color: "orange" },
      ],
    },
    {
      newBoard: true,
      boardTitle: "Scattering",
      boardPlan: "title top-left; atmosphere box across y 130-390 with molecules; sun top-left inside; note bottom-right",
      narration:
        "Our atmosphere is full of tiny gas molecules, mostly nitrogen and oxygen. They are far smaller than a wave of light.",
      elements: [
        { type: "text", id: "t3", cue: "Our atmosphere", x: 50, y: 70, text: "Scattering in the air", size: "lg" },
        { type: "rect", id: "air", cue: "full of tiny gas molecules", x: 60, y: 120, w: 880, h: 280, color: "blue" },
        { type: "icon", id: "n2m", cue: "mostly nitrogen", name: "atom", x: 320, y: 190, size: 70, label: "N₂", color: "purple" },
        { type: "icon", id: "o2m", cue: "and oxygen", name: "atom", x: 520, y: 260, size: 70, label: "O₂", color: "green" },
        { type: "icon", id: "cl", cue: "wave of light", name: "cloud", x: 740, y: 150, size: 80, label: "air", color: "blue" },
        { type: "text", id: "la", cue: "far smaller than", x: 80, y: 160, text: "atmosphere", size: "sm", color: "blue" },
      ],
    },
    {
      newBoard: false,
      narration:
        "When sunlight hits these molecules, blue light gets scattered in every direction, much more than red light does. This is called Rayleigh scattering.",
      elements: [
        { type: "arrow", id: "in", cue: "When sunlight hits", x1: 70, y1: 290, x2: 300, y2: 300, color: "orange", label: "sunlight" },
        { type: "arrow", id: "s1", cue: "scattered in every direction", x1: 360, y1: 250, x2: 420, y2: 140, color: "blue" },
        { type: "arrow", id: "s2", cue: "every direction", x1: 365, y1: 280, x2: 480, y2: 350, color: "blue" },
        { type: "arrow", id: "s3", cue: "much more than", x1: 340, y1: 240, x2: 250, y2: 140, color: "blue", label: "blue scatters" },
        { type: "arrow", id: "rr", cue: "red light does", x1: 390, y1: 305, x2: 900, y2: 340, color: "red", label: "red mostly passes" },
        { type: "note", id: "ray", cue: "Rayleigh scattering", x: 640, y: 430, w: 300, h: 90, text: "Rayleigh scattering: blue light bounces most", color: "purple" },
      ],
    },
    {
      newBoard: false,
      narration:
        "So wherever you look in the sky, scattered blue light is coming toward your eyes from every direction. That's the blue you see.",
      elements: [
        { type: "icon", id: "eye", cue: "wherever you look", name: "person", x: 120, y: 420, size: 110, label: "you", color: "ink" },
        { type: "curve", id: "e1", cue: "toward your eyes", x1: 330, y1: 240, x2: 190, y2: 430, bend: -40, color: "blue" },
        { type: "curve", id: "e2", cue: "from every direction", x1: 560, y1: 300, x2: 215, y2: 460, bend: 50, color: "blue", label: "blue light" },
      ],
    },
    {
      newBoard: true,
      boardTitle: "Recap",
      boardPlan: "title top-left; three numbered steps down the left with icons on the right; sunset bonus bottom-right",
      narration:
        "Let's put it together. Sunlight contains all colors, short blue waves scatter the most off air molecules, and that scattered blue light fills the sky.",
      elements: [
        { type: "text", id: "t4", cue: "put it together", x: 50, y: 70, text: "Recap", size: "lg" },
        { type: "text", id: "b1", cue: "Sunlight contains all colors", x: 80, y: 170, text: "1. Sunlight = all colors", size: "md" },
        { type: "icon", id: "i1", cue: "all colors", name: "sun", x: 480, y: 120, size: 80, color: "orange" },
        { type: "text", id: "b2", cue: "short blue waves scatter", x: 80, y: 280, text: "2. Short blue waves scatter most", size: "md", color: "blue" },
        { type: "icon", id: "i2", cue: "air molecules", name: "atom", x: 700, y: 230, size: 80, color: "purple" },
        { type: "text", id: "b3", cue: "fills the sky", x: 80, y: 390, text: "3. Scattered blue fills the sky", size: "md" },
        { type: "icon", id: "i3", cue: "that scattered blue light", name: "cloud", x: 780, y: 340, size: 90, color: "blue" },
      ],
    },
    {
      newBoard: false,
      narration:
        "And a bonus: at sunset, light travels through much more air, so most of the blue is scattered away and the reds and oranges are left. That's why sunsets glow.",
      elements: [
        { type: "line", id: "hz", cue: "at sunset", x1: 480, y1: 530, x2: 950, y2: 530 },
        { type: "ellipse", id: "ss", cue: "much more air", cx: 740, cy: 505, rx: 60, ry: 30, color: "orange", fill: true },
        { type: "highlight", id: "h2", cue: "scattered away", target: "b2", style: "underline", color: "orange" },
        { type: "bars", id: "bars", cue: "reds and oranges are left", x: 90, y: 530, w: 280, h: 60, values: [10, 30, 90, 100], labels: ["blue", "green", "orange", "red"], highlight: 3, color: "blue" },
      ],
    },
  ],
}

export const SAMPLE_FOLLOWUP: Clip = {
  title: "Sample answer",
  reply:
    "**Sample mode** — follow-up questions need a live model, and no AI key is configured on this deployment. Here's a placeholder so you can try the playback flow.",
  segments: [
    {
      newBoard: true,
      boardTitle: "Sample answer",
      narration:
        "In sample mode I can't answer new questions live. Once an AI Gateway key is added, I'll draw a fresh explanation for any question you ask.",
      elements: [
        { type: "text", id: "f1", cue: "In sample mode", x: 50, y: 70, text: "Sample mode", size: "lg" },
        { type: "rect", id: "f2", cue: "an AI Gateway key", x: 120, y: 200, w: 360, h: 120, label: "AI Gateway key", color: "blue" },
        { type: "arrow", id: "f3", cue: "I'll draw", x1: 490, y1: 260, x2: 640, y2: 260 },
        { type: "rect", id: "f4", cue: "a fresh explanation", x: 650, y: 200, w: 300, h: 120, label: "live lesson", color: "green" },
      ],
    },
  ],
}
