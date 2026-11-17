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
      narration:
        "Have you ever wondered why the sky is blue, when sunlight itself looks white? Let's figure it out together, one drawing at a time.",
      elements: [
        { type: "text", id: "t1", cue: "why the sky is blue", x: 50, y: 70, text: "Why is the sky blue?", size: "lg" },
        { type: "circle", id: "sun", cue: "sunlight itself looks white", cx: 150, cy: 250, r: 60, color: "orange", fill: true, label: "Sun" },
      ],
    },
    {
      newBoard: false,
      narration:
        "Sunlight is actually a mix of every color of the rainbow. A prism can split that white light into red, green, blue and violet.",
      elements: [
        { type: "arrow", id: "ray", cue: "a mix of every", x1: 215, y1: 250, x2: 455, y2: 265 },
        { type: "path", id: "prism", cue: "A prism", points: [[440, 340], [510, 200], [580, 340]], closed: true },
        { type: "arrow", id: "r", cue: "into red", x1: 560, y1: 270, x2: 900, y2: 210, color: "red", label: "red" },
        { type: "arrow", id: "g", cue: "green", x1: 565, y1: 280, x2: 900, y2: 270, color: "green", label: "green" },
        { type: "arrow", id: "b", cue: "blue and violet", x1: 568, y1: 290, x2: 900, y2: 340, color: "blue", label: "blue" },
        { type: "text", id: "n1", cue: "white light", x: 640, y: 470, text: "white light =\nall colors mixed", size: "md" },
      ],
    },
    {
      newBoard: true,
      boardTitle: "Colors are waves",
      narration:
        "Each color is a wave of light. Red light has long, lazy waves, while blue light has short, choppy waves.",
      elements: [
        { type: "text", id: "t2", cue: "Each color is a wave", x: 50, y: 70, text: "Colors are waves", size: "lg" },
        { type: "text", id: "lr", cue: "Red light", x: 600, y: 210, text: "red: long wavelength", size: "sm", color: "red" },
        { type: "path", id: "wr", cue: "long, lazy waves", points: redWave, smooth: true, color: "red" },
        { type: "text", id: "lb", cue: "blue light has", x: 600, y: 390, text: "blue: short wavelength", size: "sm", color: "blue" },
        { type: "path", id: "wb", cue: "short, choppy waves", points: blueWave, smooth: true, color: "blue" },
      ],
    },
    {
      newBoard: false,
      narration:
        "Remember this difference, because it's the whole secret. Shorter waves get bounced around much more easily by tiny particles.",
      elements: [
        { type: "highlight", id: "h1", cue: "the whole secret", target: "wb", style: "box", color: "orange" },
        { type: "text", id: "n2", cue: "bounced around much more", x: 600, y: 500, text: "short waves scatter more", size: "md", color: "orange" },
      ],
    },
    {
      newBoard: true,
      boardTitle: "Scattering",
      narration:
        "Our atmosphere is full of tiny gas molecules, mostly nitrogen and oxygen. They are far smaller than a wave of light.",
      elements: [
        { type: "text", id: "t3", cue: "Our atmosphere", x: 50, y: 70, text: "Scattering in the air", size: "lg" },
        { type: "rect", id: "air", cue: "full of tiny gas molecules", x: 60, y: 120, w: 880, h: 260, color: "blue" },
        { type: "circle", id: "m1", cue: "mostly nitrogen", cx: 300, cy: 240, r: 9 },
        { type: "circle", id: "m2", cue: "and oxygen", cx: 430, cy: 300, r: 9 },
        { type: "circle", id: "m3", cue: "far smaller", cx: 560, cy: 210, r: 9 },
        { type: "text", id: "la", cue: "far smaller than", x: 80, y: 160, text: "atmosphere", size: "sm", color: "blue" },
      ],
    },
    {
      newBoard: false,
      narration:
        "When sunlight hits these molecules, blue light gets scattered in every direction, much more than red light does. This is called Rayleigh scattering.",
      elements: [
        { type: "arrow", id: "in", cue: "When sunlight hits", x1: 70, y1: 270, x2: 415, y2: 297, color: "orange" },
        { type: "arrow", id: "s1", cue: "scattered in every direction", x1: 435, y1: 290, x2: 480, y2: 160, color: "blue" },
        { type: "arrow", id: "s2", cue: "every direction", x1: 440, y1: 305, x2: 540, y2: 360, color: "blue" },
        { type: "arrow", id: "s3", cue: "much more than", x1: 425, y1: 292, x2: 330, y2: 160, color: "blue" },
        { type: "arrow", id: "rr", cue: "red light does", x1: 445, y1: 300, x2: 900, y2: 335, color: "red", label: "red mostly passes" },
        { type: "text", id: "ray", cue: "Rayleigh scattering", x: 600, y: 470, text: "Rayleigh scattering", size: "md", color: "purple" },
      ],
    },
    {
      newBoard: false,
      narration:
        "So wherever you look in the sky, scattered blue light is coming toward your eyes from every direction. That's the blue you see.",
      elements: [
        { type: "circle", id: "head", cue: "wherever you look", cx: 200, cy: 470, r: 18 },
        { type: "line", id: "body", cue: "you look in the sky", x1: 200, y1: 488, x2: 200, y2: 555 },
        { type: "arrow", id: "e1", cue: "toward your eyes", x1: 300, y1: 250, x2: 210, y2: 448, color: "blue" },
        { type: "arrow", id: "e2", cue: "from every direction", x1: 560, y1: 220, x2: 222, y2: 458, color: "blue" },
      ],
    },
    {
      newBoard: true,
      boardTitle: "Recap",
      narration:
        "Let's put it together. Sunlight contains all colors, short blue waves scatter the most off air molecules, and that scattered blue light fills the sky.",
      elements: [
        { type: "text", id: "t4", cue: "put it together", x: 50, y: 70, text: "Recap", size: "lg" },
        { type: "text", id: "b1", cue: "Sunlight contains all colors", x: 80, y: 160, text: "1. Sunlight = all colors", size: "md" },
        { type: "text", id: "b2", cue: "short blue waves scatter", x: 80, y: 225, text: "2. Short blue waves scatter most", size: "md", color: "blue" },
        { type: "text", id: "b3", cue: "fills the sky", x: 80, y: 290, text: "3. Scattered blue fills the sky", size: "md" },
      ],
    },
    {
      newBoard: false,
      narration:
        "And a bonus: at sunset, light travels through much more air, so most of the blue is scattered away and the reds and oranges are left. That's why sunsets glow.",
      elements: [
        { type: "line", id: "hz", cue: "at sunset", x1: 560, y1: 520, x2: 950, y2: 520 },
        { type: "circle", id: "ss", cue: "much more air", cx: 760, cy: 470, r: 46, color: "orange", fill: true },
        { type: "highlight", id: "h2", cue: "scattered away", target: "b2", style: "underline", color: "orange" },
        { type: "text", id: "n3", cue: "reds and oranges", x: 560, y: 390, text: "sunset: long red path", size: "sm", color: "red" },
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
