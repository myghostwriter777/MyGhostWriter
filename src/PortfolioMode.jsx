import React, { useMemo, useState } from "react";
import GwmIcon from "./GwmIcon";
import { preparePdfDocument } from "./presentationPdf";
import { PORTFOLIO_TEXT_LIMIT, PORTFOLIO_CREATE_SYSTEM, PORTFOLIO_REVIEW_SYSTEM, PORTFOLIO_CHAT_SYSTEM, portfolioNotes, portfolioTextFile, portfolioFiles, parsePortfolio, parsePortfolioReview, portfolioAsText, portfolioReviewAsText, portfolioChatPrompt, buildPortfolioHtml, downloadPortfolioPdf } from "./portfolio";

const C = { text: "var(--gwm-text)", muted: "var(--gwm-muted)", border: "var(--gwm-border)", surface: "var(--gwm-surface)", accent: "var(--gwm-blue-text)", green: "var(--gwm-green-text)", red: "var(--gwm-red-text)" };
const secondaryButton = { minHeight: 40, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, color: C.text, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800 };
const preparePortfolioPdf = file => preparePdfDocument(file, { kind: "portfolio", pageLabel: "Page", action: "review" });

export async function preparePortfolioNotes(file) {
  if (!/\.txt$/i.test(file.name) && file.type !== "text/plain") throw new Error("Choose a plain-text (.txt) notes file.");
  if (file.size > 100000) throw new Error("Keep the notes file under 100 KB.");
  const text = (await file.text()).replace(/^\uFEFF/, "").trim();
  if (!text || text.includes("\u0000") || text.includes("\uFFFD")) throw new Error("This file has no readable text. Save it as a UTF-8 .txt file.");
  if (text.length > PORTFOLIO_TEXT_LIMIT) throw new Error("Use up to 18,000 characters of notes. Split or shorten this file.");
  return { ...portfolioTextFile(file.name, text), text, size: file.size, preparedLabel: `${text.length.toLocaleString()} characters ready` };
}

export async function preparePortfolioPhoto(file, compactImage) {
  if (!/\.(png|jpe?g|webp)$/i.test(file.name) && !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Choose a PNG, JPEG or WebP photo.");
  if (file.size > 4 * 1024 * 1024) throw new Error("Each photo must be 4 MB or smaller.");
  let prepared;
  try { prepared = await compactImage(file); }
  catch { throw new Error("This picture could not be read. Try another PNG, JPEG or WebP file."); }
  if (!prepared?.dataUrl || prepared.dataUrl.length > 1400000) throw new Error("This photo is still too large. Resize it and try again.");
  return { ...prepared, caption: "" };
}

function NotesList({ title, items, color = C.accent }) {
  if (!items?.length) return null;
  return <div style={{ marginTop: 14 }}><h3 style={{ margin: "0 0 6px", fontSize: 14, color }}>{title}</h3><ul style={{ margin: 0, paddingLeft: 20, color: C.text, fontSize: 13, lineHeight: 1.7 }}>{items.map((item, index) => <li key={index}>{item}</li>)}</ul></div>;
}

function CreatePortfolio({ user, request, save, compactImage, ui }) {
  const { Card, FInput, FArea, StudioFileDrop, PriBtn, CopyBtn, ErrBox, FollowUpChat } = ui;
  const [form, setForm] = useState({ name: "", target: "", contact: "", about: "", education: "", achievements: "", activities: "", projects: "", other: "", requirements: "" });
  const [photos, setPhotos] = useState([]);
  const [notesFiles, setNotesFiles] = useState([]);
  const [photosPreparing, setPhotosPreparing] = useState(false);
  const [notesPreparing, setNotesPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pack, setPack] = useState(null);
  const [printNotice, setPrintNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const preview = useMemo(() => {
    if (!pack) return {};
    try { return { html: buildPortfolioHtml(pack.result, pack.form, pack.photos) }; }
    catch (failure) { return { error: failure.message }; }
  }, [pack]);
  const update = key => event => setForm(previous => ({ ...previous, [key]: event.target.value }));
  const notes = portfolioNotes(form, photos) + (notesFiles[0]?.text ? "\n\nUploaded notes:\n" + notesFiles[0].text : "");
  const hasContent = [form.about, form.education, form.achievements, form.activities, form.projects, form.other, notesFiles[0]?.text].some(value => value?.trim());
  const tooLong = notes.length > PORTFOLIO_TEXT_LIMIT;
  const preparing = photosPreparing || notesPreparing;

  const generate = async () => {
    if (busy || exporting || preparing || !hasContent || tooLong) return;
    setBusy(true); setError(""); setPrintNotice("");
    const snapshot = { form: { ...form }, photos: photos.map(photo => ({ ...photo })), notes };
    try {
      const result = parsePortfolio(await request(PORTFOLIO_CREATE_SYSTEM, "Create my university application portfolio using the attached student notes and photos. Keep missing information in the checklist, outside the finished portfolio.", 6500, [...portfolioFiles(snapshot.photos), portfolioTextFile("student-notes.txt", snapshot.notes)], user?.email, { mode: "portfolio-create" }));
      setPack({ ...snapshot, result, id: Date.now() });
      save(user, "Portfolio: " + (snapshot.form.name || result.title), snapshot.form.target || "University application", portfolioAsText(result, snapshot.form, snapshot.photos));
    } catch (failure) { setError(failure?.message || "Your portfolio could not be created. Please try again."); }
    finally { setBusy(false); }
  };

  const answer = async messages => {
    const files = [...portfolioFiles(pack.photos), portfolioTextFile("student-notes.txt", pack.notes), portfolioTextFile("current-portfolio.txt", portfolioAsText(pack.result, pack.form, pack.photos) + "\n\nDetails to add:\n" + pack.result.checklist.join("\n"))];
    return request(PORTFOLIO_CHAT_SYSTEM, portfolioChatPrompt(messages), 1800, files, user?.email, { mode: "portfolio-chat" });
  };

  const download = async () => {
    if (exporting) return;
    setExporting(true); setError(""); setPrintNotice("");
    try {
      const count = await downloadPortfolioPdf(pack.result, pack.form, pack.photos);
      setPrintNotice(`Your ${count}-page portfolio PDF is ready. Check your browser downloads.`);
    } catch (failure) { setError(failure?.message || "The PDF could not be saved. Please try again."); }
    finally { setExporting(false); }
  };

  return <div>
    <div className="studio-grid-2"><FInput label="Your name (optional)" placeholder="Name to show on your portfolio" value={form.name} onChange={update("name")}/><FInput label="University / course (optional)" placeholder="e.g. Architecture, Chulalongkorn University" value={form.target} onChange={update("target")}/></div>
    <FInput label="Contact details (optional)" placeholder="Email or website you want included" value={form.contact} onChange={update("contact")}/>
    <FArea label="About you & your goals" placeholder="Your interests, why you chose this subject, and what you hope to learn..." value={form.about} onChange={update("about")} rows={3} voice/>
    <FArea label="Education background" placeholder="School, graduation year, relevant subjects, grades or qualifications you want to include..." value={form.education} onChange={update("education")} rows={3}/>
    <FArea label="Achievements & awards" placeholder="Awards, competitions, certificates, dates and what you contributed..." value={form.achievements} onChange={update("achievements")} rows={3}/>
    <FArea label="Extracurriculars, leadership & service" placeholder="Clubs, sport, volunteering, leadership roles, your responsibilities and what you learned..." value={form.activities} onChange={update("activities")} rows={3}/>
    <FArea label="Projects & work samples" placeholder="Describe your projects, your role, outcomes and links to supporting work..." value={form.projects} onChange={update("projects")} rows={3}/>
    <FArea label="Skills & anything else" placeholder="Languages, skills, hobbies, experiences or personal reflections..." value={form.other} onChange={update("other")} rows={3}/>
    <FArea label="Application requirements (optional)" placeholder="Paste the university's portfolio instructions, required sections or page limit..." value={form.requirements} onChange={update("requirements")} rows={2}/>
    <StudioFileDrop label="Upload text notes (optional)" hint="UTF-8 .txt · up to 18,000 characters in total with your typed details" accept=".txt,text/plain" files={notesFiles} onChange={setNotesFiles} prepareFile={preparePortfolioNotes} onPreparingChange={setNotesPreparing} disabled={busy}/>
    <StudioFileDrop label="Your pictures (optional)" hint="PNG, JPG or WebP · up to 4 photos, 4 MB each" accept="image/png,image/jpeg,image/webp" files={photos} onChange={setPhotos} maxFiles={4} prepareFile={file => preparePortfolioPhoto(file, compactImage)} onPreparingChange={setPhotosPreparing} disabled={busy}/>
    {photos.length > 0 && <div className="studio-grid-2" style={{ marginBottom: 14 }}>{photos.map((photo, index) => <div key={photo.name + index} style={{ padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }}><img src={photo.dataUrl} alt={photo.caption || photo.name} style={{ display: "block", width: "100%", height: 135, objectFit: "contain", marginBottom: 8 }}/><label style={{ display: "block", color: C.muted, fontSize: 12 }}>Caption for picture {index + 1}<input value={photo.caption} maxLength={300} disabled={busy} onChange={event => setPhotos(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, caption: event.target.value } : item))} placeholder="What does this photo show?" style={{ ...secondaryButton, display: "block", width: "100%", marginTop: 4, fontWeight: 400 }}/></label></div>)}</div>}
    {tooLong && <ErrBox msg="Use up to 18,000 characters in total, including notes and captions. Shorten your details before generating."/>}
    <PriBtn onClick={generate} loading={busy} disabled={!hasContent || tooLong || preparing || exporting}>Create Portfolio</PriBtn>
    {!hasContent && <p style={{ fontSize: 12, color: C.muted }}>Add some background, an achievement, an activity or a text notes file to begin.</p>}
    {error && <ErrBox msg={error}/>}
    {pack && <div style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 16, color: C.accent, margin: "0 0 10px" }}>Your portfolio</h2>
      {!!pack.photos.length && <details style={{ marginBottom: 14, color: C.muted, fontSize: 13 }}><summary style={{ cursor: "pointer", color: C.accent }}>Arrange portfolio photos</summary><p>The first photo appears on the cover by default. Place supporting photos beside the relevant section.</p>{pack.photos.map((photo, index) => <label key={index} style={{ display: "block", marginTop: 8 }}>Picture {index + 1}{photo.caption ? ` · ${photo.caption}` : ""}<select aria-label={`Placement for picture ${index + 1}`} value={photo.placement || ""} disabled={exporting || busy} onChange={event => { const placement = event.target.value; setPrintNotice(""); setPack(current => ({ ...current, photos: current.photos.map((item, i) => i === index ? { ...item, placement } : placement === "cover" && item.placement === "cover" ? { ...item, placement: "auto" } : item) })); }} style={{ ...secondaryButton, display: "block", width: "100%", marginTop: 4 }}><option value="">Automatic</option><option value="cover">Cover</option><option value="auto">Supporting photos</option>{pack.result.sections.map((section, i) => <option key={i} value={String(i)}>{section.heading}</option>)}</select></label>)}</details>}
      {preview.error ? <ErrBox msg={preview.error}/> : <div aria-label="Generated portfolio preview" style={{ borderRadius: 10, overflow: "hidden", maxHeight: 880, overflowY: "auto", background: C.surface, padding: 8, border: `1px solid ${C.border}` }} dangerouslySetInnerHTML={{ __html: preview.html }}/>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><button type="button" style={{ ...secondaryButton, opacity: exporting || busy || preview.error ? 0.55 : 1 }} disabled={exporting || busy || !!preview.error} onClick={download}>{exporting ? "Preparing PDF…" : "Save portfolio as PDF"}</button><CopyBtn text={portfolioAsText(pack.result, pack.form, pack.photos)}/></div>
      <p role="status" style={{ fontSize: 12, color: C.muted }}>{exporting ? "Preparing your pages and photographs…" : printNotice || "Download the A4 pages shown above, including your photographs. Review the content and page count against your university's requirements."}</p>
      {!!pack.result.checklist.length && <Card><NotesList title="Details you could add before submitting" items={pack.result.checklist}/></Card>}
      <FollowUpChat key={pack.id} context="" requestReply={answer} intro="Ask about your portfolio, how to describe an achievement, or which details to add." placeholder="e.g. How can I explain my leadership experience?" accent="#79baec"/>
    </div>}
  </div>;
}

function ReviewPortfolio({ user, request, save, ui }) {
  const { Card, FInput, FArea, StudioFileDrop, PriBtn, CopyBtn, ErrBox, FollowUpChat } = ui;
  const [files, setFiles] = useState([]);
  const [target, setTarget] = useState("");
  const [requirements, setRequirements] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pack, setPack] = useState(null);
  const tooLong = target.length + requirements.length > 10000;

  const review = async () => {
    if (!files.length || busy || preparing || tooLong) return;
    setBusy(true); setError("");
    const snapshot = { file: { ...files[0] }, target, requirements };
    try {
      const result = parsePortfolioReview(await request(PORTFOLIO_REVIEW_SYSTEM, `Review this ${snapshot.file.pageCount}-page portfolio. Target university/course: ${target || "Not specified; give general portfolio feedback"}. User-supplied application requirements: ${requirements || "None supplied"}.`, 6500, portfolioFiles([snapshot.file]), user?.email, { mode: "portfolio-review" }), snapshot.file.pageCount);
      setPack({ ...snapshot, result, id: Date.now() });
      save(user, "Portfolio review: " + snapshot.file.name, target || "Portfolio PDF review", portfolioReviewAsText(result));
    } catch (failure) { setError(failure?.message || "The portfolio could not be reviewed. Please try again."); }
    finally { setBusy(false); }
  };

  const answer = messages => request(PORTFOLIO_CHAT_SYSTEM, portfolioChatPrompt(messages), 1800, [...portfolioFiles([pack.file]), portfolioTextFile("portfolio-review.txt", `Target: ${pack.target}\nRequirements: ${pack.requirements}\n\n${portfolioReviewAsText(pack.result)}`)], user?.email, { mode: "portfolio-chat" });
  return <div>
    <StudioFileDrop label="Portfolio PDF" hint="PDF · up to 4 MB and 100 pages · scanned pages and images are supported" accept=".pdf,application/pdf" files={files} onChange={next => { setFiles(next); setPack(null); setError(""); }} prepareFile={preparePortfolioPdf} onPreparingChange={setPreparing} disabled={busy} required/>
    {files[0] && <details style={{ marginBottom: 14, fontSize: 12, color: C.muted }}><summary style={{ cursor: "pointer", color: C.accent }}>Preview extracted portfolio text</summary><div style={{ padding: 10, whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 220, overflowY: "auto" }}>{files[0].preview}</div><p>The complete PDF, including images and page layout, is used for the review.{files[0].previewTruncated ? " This text preview is shortened." : ""}</p></details>}
    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><FInput label="Target university / course (optional)" placeholder="Which university or subject is this portfolio for?" value={target} onChange={event => { setTarget(event.target.value); setPack(null); }}/>
    <FArea label="Requirements or review focus (optional)" placeholder="Paste application instructions or tell Ghosty what you want checked..." value={requirements} onChange={event => { setRequirements(event.target.value); setPack(null); }} rows={3}/>
    </fieldset>{tooLong && <ErrBox msg="Keep the course and requirements under 10,000 characters."/>}
    <PriBtn onClick={review} loading={busy} disabled={!files.length || preparing || tooLong}>Review Portfolio</PriBtn>
    {error && <ErrBox msg={error}/>}
    {pack && <div style={{ marginTop: 16 }}>
      <Card><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><strong aria-label="Overall portfolio score" style={{ color: C.accent, fontSize: 30 }}>{pack.result.score}<span style={{ fontSize: 14 }}>/100</span></strong><div><h2 style={{ fontSize: 16, margin: 0, color: C.text }}>Portfolio review</h2><div style={{ fontSize: 12, color: C.muted, overflowWrap: "anywhere" }}>{pack.file.name}</div></div></div><p style={{ color: C.text, fontSize: 13, lineHeight: 1.7 }}>{pack.result.summary}</p><p style={{ color: C.muted, fontSize: 12 }}>Average of five equally weighted category scores. This is coaching feedback, not an admission probability.</p>
        {pack.result.criteria.map(item => <div key={item.name} style={{ borderTop: `1px solid ${C.border}`, padding: "10px 0" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: C.accent, fontSize: 13, fontWeight: 800 }}><span>{item.name}</span><span>{item.score}/100</span></div><div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>{item.feedback}</div></div>)}
        <NotesList title="Strengths" items={pack.result.strengths} color={C.green}/>
      </Card>
      <Card style={{ marginTop: 10 }}><h3 style={{ color: C.accent, fontSize: 14, margin: "0 0 10px" }}>Mistakes & corrections</h3>{pack.result.mistakes.length ? pack.result.mistakes.map((mistake, index) => <div key={index} style={{ borderTop: index ? `1px solid ${C.border}` : "none", padding: "10px 0" }}><div style={{ fontSize: 12, fontWeight: 800, color: C.accent }}>{mistake.page ? `Page ${mistake.page}` : "Whole portfolio"}</div><div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{mistake.issue}</div>{mistake.excerpt && <blockquote style={{ margin: "7px 0", paddingLeft: 10, borderLeft: `2px solid ${C.border}`, color: C.muted, fontSize: 13 }}>{mistake.excerpt}</blockquote>}<div style={{ fontSize: 13, color: C.green, lineHeight: 1.6 }}>{mistake.correction}</div></div>) : <p style={{ fontSize: 13, color: C.muted }}>No specific mistakes were identified in this review.</p>}
        <NotesList title="Suggested improvements" items={pack.result.suggestions}/><NotesList title="Missing or unclear information" items={pack.result.missingInformation}/><div style={{ marginTop: 14 }}><CopyBtn text={portfolioReviewAsText(pack.result)}/></div>
      </Card>
      <FollowUpChat key={pack.id} context="" requestReply={answer} intro="Ask about a score, a correction or any page of your uploaded portfolio." placeholder="e.g. What should I improve on page 2?" accent="#79baec"/>
    </div>}
  </div>;
}

export default function PortfolioStudio(props) {
  const [workflow, setWorkflow] = useState("create");
  const { StudioTabs } = props.ui;
  return <div>
    <div style={{ background: "rgba(121,186,236,0.1)", border: "1px solid rgba(121,186,236,0.25)", borderRadius: 10, padding: 12, marginBottom: 14, display: "flex", gap: 9 }}><GwmIcon name="portfolio" size={20} color={C.accent}/><div><div style={{ color: C.accent, fontSize: 14, fontWeight: 800 }}>University Portfolio</div><div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5, marginTop: 3 }}>Bring your school years, achievements and experiences into your university application.</div></div></div>
    <StudioTabs value={workflow} onChange={setWorkflow} items={[{ id: "create", icon: "portfolio", label: "Create Portfolio" }, { id: "review", icon: "reviewer", label: "Review Portfolio PDF" }]}/>
    <div role="tabpanel" aria-label="Create Portfolio" hidden={workflow !== "create"}><CreatePortfolio {...props}/></div>
    <div role="tabpanel" aria-label="Review Portfolio PDF" hidden={workflow !== "review"}><ReviewPortfolio {...props}/></div>
  </div>;
}
