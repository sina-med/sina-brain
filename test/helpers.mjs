// Builds a miniature Sina site on disk so the importer can be tested end to end.
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const q = (stem, options, answer, extra = {}) => ({ q: stem, options, answer, why: "Because.", ...extra });

/** A small but representative SINA object. Tests copy and modify it. */
export function sampleSina() {
  return {
    programs: [{ id: "y2-anglo" }],
    DEFAULT_PROGRAM: "y2-anglo",
    i18n: { en: { "program.y2-anglo": "2nd Year Anglo" } },
    subjects: [
      { id: "physio", name: "Physiology", semester: "S3", status: "live", program: "y2-anglo", blurb: "Neuro.", groups: [
        { name: "Neurophysiology", items: [{ id: "physio-pain", title: "Physiology of pain" }, { id: "physio-soon", title: "Not written yet" }] },
      ] },
    ],
    lectures: {
      "physio-pain": {
        id: "physio-pain", subject: "physio", group: "Neurophysiology", title: "Physiology of pain",
        sourceFile: "Pain.pdf (Prof. Example)", sourceUrl: "https://drive.google.com/file/d/ABCDEFGHIJKLMNOP/view?usp=drivesdk",
        verified: "21 Sep 2026", buildNote: "Built from the slides.",
        summary: [{ id: "big", title: "The big picture", html: "<p>Pain has <strong>two</strong> lanes.</p>" }, { id: "def", title: "Definitions", html: "<p>Allodynia.</p>" }],
        exam: ["Fast pain: A-delta."],
        visual: { kind: "model", figure: { alt: "Cord", caption: "Cross-section", parts: { horn: { label: ["Dorsal", "horn"] }, root: { label: "Root" } } } },
        mcqs: [
          q("What is allodynia?", ["Pain from a harmless stimulus", "Exaggerated pain from noxious input", "Absence of all pain", "Pain felt in a lost limb"], 0,
            { slides: [{ src: "files/slides/physio-pain/04.jpg", lec: "Physiology of pain", n: 4 }], notes: ["a", "b", "c", "d"] }),
          { q: "Which fibres carry slow pain?", options: ["A-delta", "C", "A-beta"], answers: [1], multi: true, hint: "1 or 2 correct answers", why: "C fibres." },
          q("Which structure is at the arrow?", ["Dorsal horn", "Root"], 0, { target: "horn" }),
          q("Which structure is at the arrow?", ["Dorsal horn", "Root"], 1, { target: "root" }),
          q("A recalled question", ["Yes", "No"], 0, { src: "Midterm recall (Prof. Example)" }),
          q("Missing slide citation", ["Yes", "No"], 0, { slides: [{ src: "files/slides/physio-pain/99.jpg", n: 99 }] }),
        ],
        cards: [{ id: "p1", type: "text", front: "Define pain.", back: "Unpleasant experience." }, { id: "img-horn", type: "image", target: "horn", front: "What is at the arrow?", back: "Dorsal horn." }],
        deeper: [{ title: "Referred pain", html: "<p>Arm.</p>" }],
        resources: [{ title: "Pain pathways", url: "https://teachmephysiology.com/pain/", kind: "Article", why: "Clear.", note: "" }],
        sources: [{ name: "TeachMePhysiology, Pain pathways", url: "https://TeachMePhysiology.com/pain" }, { name: "Kenhub", url: "https://www.kenhub.com/pain" }],
        checks: [],
      },
    },
    papers: [
      { id: "physio-2024", subject: "physio", title: "Physiology exam 2024", year: "2024", links: [{ label: "PDF", url: "https://example.org/p.pdf" }] },
      { id: "physio-sina-mock", subject: "physio", title: "Sina mock 1", year: "Practice",
        questions: [q("Shared question?", ["One", "Two"], 0), q("Mock only?", ["One", "Two"], 1)] },
    ],
    paperQs: { "physio-2024": [q("Shared question?", ["One", "Two"], 0), q("Paper only?", ["One", "Two"], 1)] },
    paperKeyBy: { "physio-2024": "sina" },
    paperLec: {},
    hl: {},
    qAlias: {},
    midterms: [{ id: "physio-mid", program: "y2-anglo", subject: "physio", subjects: ["physio"], title: "Physiology midterm", date: "2026-11-20", groups: [{ name: "Neuro", items: ["physio-pain"] }] }],
    m3d: { cord: { names: { horn: "Dorsal horn" } } },
  };
}

/** Writes the site to a new temporary directory and returns its path. */
export function writeSite(sina, { slides = { "physio-pain": ["03", "04", "p01"] }, models = ["cord"] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "sina-site-"));
  mkdirSync(join(dir, "js/data"), { recursive: true });
  writeFileSync(join(dir, "index.html"), '<script src="js/i18n.js"></script>\n<script src="js/data/all.js"></script>\n<script src="js/app.js"></script>\n');
  const { i18n, ...rest } = sina;
  writeFileSync(join(dir, "js/i18n.js"), `window.SINA = window.SINA || { subjects: [], lectures: {} }; SINA.i18n = ${JSON.stringify(i18n)};`);
  writeFileSync(join(dir, "js/data/all.js"), Object.entries(rest).map(([k, v]) => `SINA[${JSON.stringify(k)}] = ${JSON.stringify(v)};`).join("\n"));
  for (const [lec, stems] of Object.entries(slides)) {
    mkdirSync(join(dir, "files/slides", lec), { recursive: true });
    for (const s of stems) writeFileSync(join(dir, "files/slides", lec, s + ".jpg"), "");
  }
  mkdirSync(join(dir, "files/m3d"), { recursive: true });
  for (const m of models) writeFileSync(join(dir, "files/m3d", m + ".glb"), "");
  const ocr = join(dir, "lines.json");
  writeFileSync(ocr, JSON.stringify({ "files/slides/physio-pain/04.jpg": [{ t: "Allodynia", b: [1.234, 2, 3, 4] }, { t: "  ", b: [0, 0, 0, 0] }], "files/slides/physio-pain/77.jpg": [{ t: "gone", b: [0, 0, 1, 1] }] }));
  return { dir, ocr };
}

export const tmpKb = () => join(mkdtempSync(join(tmpdir(), "sina-kb-")), "kb");
