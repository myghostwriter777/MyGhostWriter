import { TextEncoder } from "util";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PortfolioMode } from "./App";
import { preparePdfDocument } from "./presentationPdf";
import { PORTFOLIO_CRITERIA } from "./portfolio";

jest.mock("./localWhisper", () => ({ prepareLocalWhisper: jest.fn(), transcribeLocalAudio: jest.fn() }));
jest.mock("./presentationPdf", () => ({ ...jest.requireActual("./presentationPdf"), preparePdfDocument: jest.fn() }));

const originalFetch = global.fetch;
const originalEncoder = global.TextEncoder;
const portfolio = { title: "Mina's portfolio", introduction: "I enjoy science and serving my community.", sections: [{ heading: "Achievements", body: "I led the school robotics club." }], checklist: ["Add your graduation year."] };
const review = { readable: true, summary: "Clear projects; improve the evidence.", criteria: PORTFOLIO_CRITERIA.map(name => ({ name, score: 80, feedback: "Add specific supporting detail." })), strengths: ["Clear interests"], mistakes: [{ page: 2, excerpt: "recieve", issue: "Spelling mistake", correction: "Use receive." }], suggestions: ["Add dates."], missingInformation: ["Graduation year"] };
const pdf = { name: "portfolio.pdf", type: "application/pdf", dataUrl: "data:application/pdf;base64,JVBERi0=", size: 20, pageCount: 2, textPages: 2, preview: "[Page 1] Student portfolio" };
const respond = output => ({ ok: true, json: async () => ({ output_text: typeof output === "string" ? output : JSON.stringify(output) }) });
const inputNotes = () => fireEvent.change(screen.getByPlaceholderText(/Awards, competitions/), { target: { value: "I led the school robotics club." } });
const createPanel = () => screen.getByRole("tabpanel", { name: "Create Portfolio" });
const reviewPanel = () => screen.getByRole("tabpanel", { name: "Review Portfolio PDF" });

beforeEach(() => {
  global.TextEncoder = TextEncoder;
  global.fetch = jest.fn().mockResolvedValue(respond(portfolio));
  localStorage.clear(); sessionStorage.clear();
  preparePdfDocument.mockReset().mockResolvedValue(pdf);
});
afterEach(() => { global.fetch = originalFetch; global.TextEncoder = originalEncoder; });

test("creates from student details, saves text history, and grounds the follow-up in the original inputs", async () => {
  const user = { email: "portfolio-test@example.test" };
  global.fetch.mockImplementation((url, options) => url === "/api/history" ? Promise.resolve({ ok: true }) : Promise.resolve(respond(JSON.parse(options.body).mode === "portfolio-chat" ? "Describe what your robotics team built." : portfolio)));
  render(<PortfolioMode user={user}/>);
  expect(screen.getByRole("button", { name: "Create Portfolio" })).toBeDisabled();
  inputNotes();
  fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
  expect(await screen.findByLabelText("Generated portfolio preview")).toHaveTextContent("I led the school robotics club.");
  const createRequest = JSON.parse(global.fetch.mock.calls.find(([url]) => url === "/api/openai")[1].body);
  expect(createRequest.mode).toBe("portfolio-create");
  expect(atob(createRequest.files[0].dataUrl.split(",")[1])).toContain("I led the school robotics club.");
  // History writes also travel through the same app route used by other modes.
  expect(global.fetch.mock.calls.some(([url, options]) => url === "/api/history" && JSON.parse(options.body).item.mode === "portfolio")).toBe(true);
  const saved = JSON.parse(global.fetch.mock.calls.find(([url]) => url === "/api/history")[1].body).item;
  expect(saved.output).toContain("I led the school robotics club.");
  expect(JSON.stringify(saved)).not.toContain("base64");
  fireEvent.change(within(createPanel()).getByLabelText("Follow-up question"), { target: { value: "How can I improve my achievement section?" } });
  fireEvent.click(within(createPanel()).getByRole("button", { name: "Send" }));
  expect(await screen.findByText("Describe what your robotics team built.")).toBeInTheDocument();
  const chat = JSON.parse(global.fetch.mock.calls.filter(([url]) => url === "/api/openai").at(-1)[1].body);
  expect(chat.mode).toBe("portfolio-chat");
  expect(chat.files.map(file => file.name)).toEqual(["student-notes.txt", "current-portfolio.txt"]);
  expect(chat.user).toContain("How can I improve my achievement section?");
});

test("reviews the full PDF with valid scores and page corrections, and retains the PDF in follow-ups", async () => {
  global.fetch.mockResolvedValueOnce(respond(review)).mockResolvedValueOnce(respond("On page 2, explain the outcome of your project."));
  render(<PortfolioMode/>);
  fireEvent.click(screen.getByRole("tab", { name: "Review Portfolio PDF" }));
  expect(screen.getByRole("button", { name: "Review Portfolio" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Portfolio PDF"), { target: { files: [new File(["pdf"], "portfolio.pdf")] } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Review Portfolio" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Review Portfolio" }));
  expect(await screen.findByLabelText("Overall portfolio score")).toHaveTextContent("80/100");
  expect(screen.getByText("Page 2")).toBeInTheDocument();
  expect(screen.getByText("Use receive.")).toBeInTheDocument();
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).files[0].dataUrl).toBe(pdf.dataUrl);
  fireEvent.change(within(reviewPanel()).getByLabelText("Follow-up question"), { target: { value: "How should I revise page 2?" } });
  fireEvent.click(within(reviewPanel()).getByRole("button", { name: "Send" }));
  expect(await screen.findByText("On page 2, explain the outcome of your project.")).toBeInTheDocument();
  const chat = JSON.parse(global.fetch.mock.calls[1][1].body);
  expect(chat.mode).toBe("portfolio-chat");
  expect(chat.files[0].dataUrl).toBe(pdf.dataUrl);
  expect(atob(chat.files[1].dataUrl.split(",")[1])).toContain("Spelling mistake");
});

test("keeps both submode results and conversations independent when switching tabs", async () => {
  global.fetch.mockResolvedValueOnce(respond(portfolio)).mockResolvedValueOnce(respond("Creation chat answer.")).mockResolvedValueOnce(respond(review)).mockResolvedValueOnce(respond("Review chat answer."));
  render(<PortfolioMode/>);
  inputNotes(); fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
  await screen.findByLabelText("Generated portfolio preview");
  fireEvent.change(within(createPanel()).getByLabelText("Follow-up question"), { target: { value: "What should I add?" } });
  fireEvent.click(within(createPanel()).getByRole("button", { name: "Send" }));
  await screen.findByText("Creation chat answer.");
  fireEvent.click(screen.getByRole("tab", { name: "Review Portfolio PDF" }));
  fireEvent.change(screen.getByLabelText("Portfolio PDF"), { target: { files: [new File(["pdf"], "portfolio.pdf")] } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Review Portfolio" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Review Portfolio" }));
  await screen.findByLabelText("Overall portfolio score");
  fireEvent.change(within(reviewPanel()).getByLabelText("Follow-up question"), { target: { value: "Explain this score." } });
  fireEvent.click(within(reviewPanel()).getByRole("button", { name: "Send" }));
  await screen.findByText("Review chat answer.");
  fireEvent.click(screen.getByRole("tab", { name: "Create Portfolio" }));
  expect(within(createPanel()).getByText("Creation chat answer.")).toBeVisible();
  expect(within(createPanel()).queryByText("Review chat answer.")).not.toBeInTheDocument();
});

test("preserves the student's question for retry when the chat service fails", async () => {
  global.fetch.mockResolvedValueOnce(respond(portfolio)).mockRejectedValueOnce(new Error("Connection lost"));
  render(<PortfolioMode/>); inputNotes(); fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
  await screen.findByLabelText("Generated portfolio preview");
  const input = within(createPanel()).getByLabelText("Follow-up question");
  fireEvent.change(input, { target: { value: "Should I include volunteering?" } });
  fireEvent.click(within(createPanel()).getByRole("button", { name: "Send" }));
  expect(await screen.findByText("Connection lost")).toBeInTheDocument();
  expect(input).toHaveValue("Should I include volunteering?");
});

test("includes the student's uploaded picture and caption in creation, preview and follow-up", async () => {
  const originalImage = global.Image;
  const dataUrl = "data:image/jpeg;base64,aGVsbG8=";
  global.Image = class {
    naturalWidth = 800;
    naturalHeight = 600;
    set src(value) { Promise.resolve().then(() => this.onload()); }
  };
  const context = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillRect: jest.fn(), drawImage: jest.fn() });
  const encode = jest.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(dataUrl);
  global.fetch.mockResolvedValueOnce(respond(portfolio)).mockResolvedValueOnce(respond("Use that photo beside your robotics project."));
  try {
    render(<PortfolioMode/>); inputNotes();
    fireEvent.change(screen.getByLabelText("Your pictures (optional)"), { target: { files: [new File(["image"], "robotics.jpg", { type: "image/jpeg" })] } });
    const caption = await screen.findByLabelText("Caption for picture 1");
    fireEvent.change(caption, { target: { value: "Building our robot at school" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Portfolio" }));
    const preview = await screen.findByLabelText("Generated portfolio preview");
    expect(within(preview).getByRole("img")).toHaveAttribute("src", dataUrl);
    expect(preview).toHaveTextContent("Building our robot at school");
    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request.files[0]).toMatchObject({ name: "robotics.jpg", type: "image/jpeg", dataUrl });
    expect(atob(request.files[1].dataUrl.split(",")[1])).toContain("Building our robot at school");
    fireEvent.change(within(createPanel()).getByLabelText("Follow-up question"), { target: { value: "Where should this photo go?" } });
    fireEvent.click(within(createPanel()).getByRole("button", { name: "Send" }));
    await screen.findByText("Use that photo beside your robotics project.");
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).files[0].dataUrl).toBe(dataUrl);
  } finally { global.Image = originalImage; context.mockRestore(); encode.mockRestore(); }
});

test("reports PDF read failures and never invents a score", async () => {
  preparePdfDocument.mockRejectedValueOnce(new Error("Upload an unlocked copy."));
  render(<PortfolioMode/>);
  fireEvent.click(screen.getByRole("tab", { name: "Review Portfolio PDF" }));
  fireEvent.change(screen.getByLabelText("Portfolio PDF"), { target: { files: [new File(["pdf"], "locked.pdf")] } });
  expect(await screen.findByText("Upload an unlocked copy.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Review Portfolio" })).toBeDisabled();
  expect(screen.queryByLabelText("Overall portfolio score")).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});
