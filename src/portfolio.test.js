import { PORTFOLIO_CRITERIA, parsePortfolio, parsePortfolioReview, buildPortfolioHtml, portfolioChatPrompt, portfolioAsText, printPortfolio } from "./portfolio";
import { preparePortfolioNotes, preparePortfolioPhoto } from "./PortfolioMode";

const portfolio = { title: "My application", introduction: "I enjoy building things.", sections: [{ heading: "Education", body: "School and graduation details." }], checklist: ["Add your graduation year."] };
const review = { readable: true, summary: "A useful start.", criteria: PORTFOLIO_CRITERIA.map((name, index) => ({ name, score: 60 + index * 5, feedback: "Specific feedback." })), strengths: ["Clear goals"], mistakes: [{ page: 2, excerpt: "recieve", issue: "Spelling", correction: "receive" }], suggestions: ["Add reflection"], missingInformation: ["Dates"] };
const photo = { name: "school.png", caption: "Project work", dataUrl: "data:image/png;base64,aGVsbG8=" };

test("validates a completed portfolio and keeps checklist outside exported text", () => {
  const data = parsePortfolio(JSON.stringify(portfolio));
  expect(portfolioAsText(data, { name: "Mina" }, [photo])).toContain("Project work");
  expect(portfolioAsText(data)).not.toContain("Add your graduation year");
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
  expect(container.querySelectorAll("img")).toHaveLength(1);
  expect(container.querySelector("img").src).toBe(photo.dataUrl);
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

test("prints the complete portfolio and photos, and reports blocked popups", async () => {
  const printDocument = document.implementation.createHTMLDocument();
  const popup = { document: printDocument, focus: jest.fn(), print: jest.fn(), closed: false };
  const open = jest.spyOn(window, "open").mockReturnValue(popup);
  printPortfolio(portfolio, { name: "Mina" }, [photo]);
  expect(printDocument.body.textContent).toContain("School and graduation details.");
  expect(printDocument.images).toHaveLength(1);
  printDocument.images[0].dispatchEvent(new Event("load"));
  await Promise.resolve(); await Promise.resolve();
  expect(popup.print).toHaveBeenCalledTimes(1);
  open.mockReturnValue(null);
  expect(() => printPortfolio(portfolio, {}, [])).toThrow(/Allow popups/);
  open.mockRestore();
});
