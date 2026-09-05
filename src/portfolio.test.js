import { PORTFOLIO_CRITERIA, parsePortfolio, parsePortfolioReview, buildPortfolioHtml, portfolioChatPrompt, portfolioAsText } from "./portfolio";
import { layoutPortfolio, wrapPortfolioText } from "./portfolioLayout";
import { preparePortfolioNotes, preparePortfolioPhoto } from "./PortfolioMode";

const portfolio = { title: "My application", introduction: "I enjoy building things.", sections: [{ heading: "Education", body: "School and graduation details." }], checklist: ["Add your graduation year."] };
const review = { readable: true, summary: "A useful start.", criteria: PORTFOLIO_CRITERIA.map((name, index) => ({ name, score: 60 + index * 5, feedback: "Specific feedback." })), strengths: ["Clear goals"], mistakes: [{ page: 2, excerpt: "recieve", issue: "Spelling", correction: "receive" }], suggestions: ["Add reflection"], missingInformation: ["Dates"] };
beforeEach(() => { jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });
afterEach(() => jest.restoreAllMocks());

const photo = { name: "school.png", caption: "Project work", dataUrl: "data:image/png;base64,aGVsbG8=" };

test("validates a completed portfolio and keeps checklist outside exported text", () => {
  const data = parsePortfolio(JSON.stringify(portfolio));
  expect(portfolioAsText(data, { name: "Mina" }, [photo])).toContain("Project work");
  expect(portfolioAsText(data)).not.toContain("Add your graduation year");
  expect(portfolioAsText(data, {}, [{ ...photo, caption: "" }])).not.toMatch(/Photos|school.png/);
  expect(() => parsePortfolio('{"title":"Incomplete"}')).toThrow(/not complete/);
  expect(() => parsePortfolio('{"title":')).toThrow(/incomplete/);
});

test("computes overall score from five criteria and rejects fabricated page references", () => {
  expect(parsePortfolioReview(JSON.stringify(review), 2).score).toBe(70);
  expect(() => parsePortfolioReview(JSON.stringify({ ...review, criteria: [] }), 2)).toThrow(/incomplete/);
  expect(() => parsePortfolioReview(JSON.stringify({ ...review, criteria: review.criteria.map(item => ({ ...item, score: 101 })) }), 2)).toThrow(/invalid score/);
  expect(() => parsePortfolioReview(JSON.stringify({ ...review, mistakes: [{ ...review.mistakes[0], page: 3 }] }), 2)).toThrow(/page reference/);
  expect(() => parsePortfolioReview(JSON.stringify({ ...review, readable: false, summary: "The PDF is blank." }), 2)).toThrow("The PDF is blank.");
});

test("escapes student text and image captions in preview and PDF HTML", () => {
  const html = buildPortfolioHtml({ ...portfolio, introduction: '<script>alert("bad")</script>' }, { name: '<img src=x onerror="bad()">' }, [{ ...photo, caption: '"><script>bad()</script>' }, { name: "unsafe", dataUrl: 'javascript:alert(1)' }]);
  const container = document.createElement("div"); container.innerHTML = html;
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelectorAll("image")).toHaveLength(1);
  expect(container.querySelector("image").getAttribute("href")).toBe(photo.dataUrl);
  expect(container.textContent).toContain('<script>alert("bad")</script>');
  expect(html).not.toContain("Add your graduation year");
});

test("retains the latest follow-up question when conversation history exceeds its budget", () => {
  const messages = Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? "ai" : "user", content: "previous ".repeat(500) }));
  messages.push({ role: "user", content: "How should I improve page 2?" });
  const prompt = portfolioChatPrompt(messages);
  const data = JSON.parse(prompt);
  expect(data.latestQuestion).toBe("How should I improve page 2?");
  expect(data.previousMessages.length).toBeLessThan(20);
  expect(prompt.length).toBeLessThan(15000);
  expect(() => portfolioChatPrompt([{ role: "user", content: "x".repeat(3001) }])).toThrow(/3,000/);
});

test("validates uploaded notes and photos without silently truncating them", async () => {
  await expect(preparePortfolioNotes({ name: "archive.zip", size: 5 })).rejects.toThrow(/plain-text/);
  await expect(preparePortfolioNotes({ name: "notes.txt", size: 20, text: async () => "" })).rejects.toThrow(/no readable text/);
  await expect(preparePortfolioNotes({ name: "notes.txt", size: 19000, text: async () => "x".repeat(18001) })).rejects.toThrow(/18,000/);
  const compact = jest.fn();
  await expect(preparePortfolioPhoto({ name: "bad.svg", type: "image/svg+xml", size: 50 }, compact)).rejects.toThrow(/PNG/);
  await expect(preparePortfolioPhoto({ name: "big.jpg", size: 5 * 1024 * 1024 }, compact)).rejects.toThrow(/4 MB/);
  expect(compact).not.toHaveBeenCalled();
});

const measure = (value, size) => Array.from(value).length * size * 0.5;

test("groups short sections and keeps every body line and photo within A4 pages", () => {
  const data = { ...portfolio, sections: [{ heading: "Education", body: "I study physics." }, { heading: "Projects", body: "I built a robot. ".repeat(200) + "FINAL SENTENCE." }] };
  const images = Array.from({ length: 4 }, (_, i) => ({ ...photo, caption: `Caption ${i}`, dataUrl: `data:image/png;base64,${btoa(String(i))}` }));
  const pages = layoutPortfolio(data, { name: "Mina" }, images, measure);
  expect(pages[1].ops.filter(op => op.type === "text").map(op => op.value).join(" ")).toContain("EDUCATION");
  expect(pages.flatMap(page => page.ops).filter(op => op.type === "image")).toHaveLength(4);
  const allText = pages.flatMap(page => page.ops).filter(op => op.type === "text").map(op => op.value).join(" ");
  expect(allText).toContain("FINAL SENTENCE.");
  const bodyText = pages.flatMap(page => page.ops).filter(op => op.type === "text" && op.size === 13).map(op => op.value).join(" ");
  expect(bodyText.match(/I built a robot\./g)).toHaveLength(200);
  expect(allText).not.toContain("school.png");
  for (const page of pages) for (const op of page.ops) {
    if (op.type === "text") { expect(op.y).toBeLessThanOrEqual(815); expect(op.x + measure(op.value, op.size)).toBeLessThanOrEqual(560); }
    if (op.type === "image") { expect(op.y + op.h).toBeLessThan(790); expect(op.x + op.w).toBeLessThan(560); }
  }
});

test("moves a photograph from the cover to its selected section without duplicating it", () => {
  const pages = layoutPortfolio(portfolio, {}, [{ ...photo, placement: "0" }], measure);
  expect(pages[0].ops.some(op => op.type === "image")).toBe(false);
  expect(pages.flatMap(page => page.ops).filter(op => op.type === "image")).toHaveLength(1);
  expect(pages.find(page => page.ops.some(op => op.type === "image")).ops.some(op => op.value === "EDUCATION")).toBe(true);
});

test("wraps unspaced multilingual text without discarding characters", () => {
  const source = "การศึกษาของฉัน".repeat(40);
  const lines = wrapPortfolioText(source, 487, 13, measure);
  expect(lines.join("")).toBe(source);
  expect(lines.every(line => measure(line, 13) <= 487)).toBe(true);
});
