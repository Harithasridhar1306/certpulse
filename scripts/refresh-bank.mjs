import fs from "node:fs/promises";
import crypto from "node:crypto";

const ROOT = process.cwd();
const resources = JSON.parse(await fs.readFile(`${ROOT}/data/resources.json`, "utf8"));
const bankPath = `${ROOT}/data/exams.json`;
const bank = JSON.parse(await fs.readFile(bankPath, "utf8"));

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const questionsPerCertification = Number(process.env.QUESTIONS_PER_CERT || 12);

if (!apiKey) {
  console.log("GEMINI_API_KEY is not set. Keeping the existing question bank unchanged.");
  process.exit(0);
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "CertPulse-resource-refresh/1.0" }
  });
  if (!response.ok) throw new Error(`${source.url} returned ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text") && !contentType.includes("json")) {
    throw new Error(`${source.url} is not a text resource (${contentType})`);
  }
  const body = await response.text();
  return stripHtml(body).slice(0, 30000);
}

async function generateQuestions(certification, exam, sourceTexts) {
  const sourceBlock = sourceTexts.map((x) => `SOURCE: ${x.title}\nURL: ${x.url}\nCONTENT:\n${x.content}`).join("\n\n---\n\n");

  const prompt = `You generate original certification practice questions for CertPulse.

Certification: ${exam.name}

Use ONLY the public source material below as factual grounding. Create ${questionsPerCertification} original questions that test understanding and application. Do NOT reproduce, quote, paraphrase, or claim to know live, leaked, remembered, or proprietary exam questions. The questions must be newly authored practice questions based on public documentation and the published exam scope.

Return ONLY a JSON array. Each item must contain:
{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "explanation": "...",
  "type": "mcq|scenario|architecture",
  "difficulty": "easy|medium|hard",
  "domain": "...",
  "skills": ["..."],
  "reference": {"title": "...", "url": "..."}
}

Rules:
- Exactly four options.
- correctAnswer is the zero-based index of the correct option.
- Exactly one option is clearly correct.
- Prefer realistic scenarios over trivia.
- Keep explanations concise and grounded in the cited source.
- Never invent a reference URL; use one of the supplied source URLs.
- Do not mention that the question came from an AI model.

PUBLIC SOURCES:
${sourceBlock}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText.slice(0, 500)}`);
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned no generated content");

  let generated;
  try {
    generated = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Generated response was not valid JSON");
    generated = JSON.parse(match[0]);
  }

  if (!Array.isArray(generated)) throw new Error("Generated question payload is not an array");
  return generated;
}

function normalizeQuestion(q, cert, index) {
  if (!q || typeof q.question !== "string" || !Array.isArray(q.options) || q.options.length !== 4) return null;
  if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) return null;
  const type = ["mcq", "scenario", "architecture"].includes(q.type) ? q.type : "scenario";
  const difficulty = ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium";
  const sourceUrl = q.reference?.url;
  const allowed = resources[cert].sources.some((s) => s.url === sourceUrl);
  if (!allowed) return null;

  const fingerprint = crypto.createHash("sha256").update(`${cert}|${q.question}`).digest("hex").slice(0, 10);
  return {
    id: `DYN-${cert}-${fingerprint}`,
    certification: cert,
    question: q.question.trim(),
    options: q.options.map(String),
    correctAnswer: q.correctAnswer,
    explanation: String(q.explanation || "").trim(),
    type,
    difficulty,
    domain: String(q.domain || "General").trim(),
    skills: Array.isArray(q.skills) ? q.skills.map(String).slice(0, 6) : [],
    reference: {
      title: String(q.reference.title || "Official documentation").trim(),
      url: sourceUrl
    },
    generated: true,
    generatedAt: new Date().toISOString()
  };
}

for (const [cert, exam] of Object.entries(resources)) {
  if (!bank[cert]) continue;
  const sourceTexts = [];

  for (const source of exam.sources) {
    try {
      const content = await fetchSource(source);
      if (content.length > 500) sourceTexts.push({ ...source, content });
      console.log(`Fetched ${cert}: ${source.title}`);
    } catch (error) {
      console.warn(`Skipping ${source.url}: ${error.message}`);
    }
  }

  if (!sourceTexts.length) {
    console.warn(`No usable sources for ${cert}; leaving existing questions untouched.`);
    continue;
  }

  try {
    const generated = await generateQuestions(cert, bank[cert], sourceTexts);
    const normalized = generated.map((q, i) => normalizeQuestion(q, cert, i)).filter(Boolean);
    if (normalized.length < Math.max(3, Math.floor(questionsPerCertification / 2))) {
      console.warn(`Only ${normalized.length} valid questions generated for ${cert}; leaving existing dynamic set unchanged.`);
      continue;
    }

    const staticQuestions = bank[cert].questions.filter((q) => !q.generated);
    bank[cert].questions = [...staticQuestions, ...normalized];
    console.log(`Updated ${cert}: ${normalized.length} fresh resource-grounded questions.`);
  } catch (error) {
    console.error(`Generation failed for ${cert}: ${error.message}`);
  }
}

await fs.writeFile(bankPath, `${JSON.stringify(bank, null, 2)}\n`);
console.log(`Question bank written to ${bankPath}`);
