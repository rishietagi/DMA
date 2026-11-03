/**
 * The exported PDF (react-pdf): a consulting-style report rendered from ReportModel. Loaded only when
 * the user clicks Export PDF. Uses the built-in Helvetica, so text is limited to WinAnsi — `t()` maps
 * the few characters outside it.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ladderHex, type ReportModel } from "@/lib/report/report-data";

const C = {
  ink: "#18181b",
  muted: "#71717a",
  faint: "#a1a1aa",
  line: "#e4e4e7",
  soft: "#f4f4f5",
  primary: "#2f4fd8",
  ai: "#6d28d9",
  aiSoft: "#f5f3ff",
  ok: "#047857",
  okSoft: "#ecfdf5",
  warn: "#b45309",
  warnSoft: "#fef3c7",
  bad: "#b91c1c",
  badSoft: "#fee2e2",
  self: "#a78bfa",
};

/** Characters Helvetica (WinAnsi) can't draw, mapped to ones it can. */
const t = (s: string) =>
  s
    .replace(/→/g, "to")
    .replace(/₹/g, "INR ")
    .replace(/[≥]/g, ">=")
    .replace(/[≤]/g, "<=")
    .replace(/[×]/g, "x")
    .replace(/[^\u0000-ÿ–—‘’“”•…€]/g, "");
const n1 = (v: number | null) => (v === null ? "—" : v.toFixed(1));

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 52, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 9, color: C.ink, lineHeight: 1.35 },
  header: { position: "absolute", top: 22, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted, borderBottomWidth: 0.5, borderBottomColor: C.line, paddingBottom: 6 },
  footer: { position: "absolute", top: 806, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.faint },
  eyebrow: { fontSize: 8, color: C.primary, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 6, lineHeight: 1.15 },
  meta: { fontSize: 9, color: C.muted, marginTop: 6 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  lead: { fontSize: 9, color: C.muted, marginBottom: 10 },
  section: { marginTop: 22 },
  bold: { fontFamily: "Helvetica-Bold" },
  small: { fontSize: 7.5, color: C.muted },
  row: { flexDirection: "row" },
});

function Header({ m }: { m: ReportModel }) {
  return (
    <View style={s.header} fixed>
      <Text>{t(`${m.client} · Digital maturity assessment · ${m.functionName}`)}</Text>
      <Text>{m.date}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text>Illustrative data · simulated AI · KPMG proof of concept</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
    </View>
  );
}

function Stat({ value, label, first }: { value: string; label: string; first?: boolean }) {
  return (
    <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderLeftWidth: first ? 0 : 0.5, borderLeftColor: C.line }}>
      <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.1 }}>{value}</Text>
      <Text style={[s.small, { marginTop: 3 }]}>{label}</Text>
    </View>
  );
}

/** Current to target on a 0–5 track. */
function Slider({ current, target }: { current: number | null; target: number }) {
  const pct = (v: number) => `${(Math.min(5, Math.max(0, v)) / 5) * 100}%`;
  const now = current ?? 0;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ height: 22, position: "relative" }}>
        <View style={{ position: "absolute", top: 8, left: 0, right: 0, height: 5, borderRadius: 3, backgroundColor: C.soft }} />
        <View style={{ position: "absolute", top: 8, left: pct(Math.min(now, target)), width: pct(Math.abs(target - now)), height: 5, borderRadius: 3, backgroundColor: "#c4b5fd" }} />
        <View style={{ position: "absolute", top: 4, left: pct(now), marginLeft: -6, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.ai, backgroundColor: "#ffffff" }} />
        <View style={{ position: "absolute", top: 2, left: pct(target), marginLeft: -1, width: 2, height: 17, backgroundColor: C.ink }} />
      </View>
      <View style={{ position: "relative", height: 10 }}>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <Text key={l} style={{ position: "absolute", left: pct(l), marginLeft: l === 5 ? -6 : l === 0 ? 0 : -3, fontSize: 7, color: C.faint }}>
            {l}
          </Text>
        ))}
      </View>
      <View style={[s.row, { justifyContent: "space-between", marginTop: 4 }]}>
        <Text style={s.small}>
          Current <Text style={[s.bold, { color: C.ink }]}>{n1(current)}</Text>
        </Text>
        <Text style={s.small}>
          Target <Text style={[s.bold, { color: C.ink }]}>{target.toFixed(1)}</Text>
        </Text>
      </View>
    </View>
  );
}

const INSIGHT_COLOR = { strength: C.ok, gap: C.bad, priority: C.ai } as const;

function Cell({ v, w, bold }: { v: number | null; w: string; bold?: boolean }) {
  const c = ladderHex(v);
  return (
    <View style={{ width: w, padding: 2 }}>
      <View style={{ backgroundColor: c.fill, borderRadius: 3, paddingVertical: 5, alignItems: "center" }}>
        <Text style={{ color: c.text, fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }}>{n1(v)}</Text>
      </View>
    </View>
  );
}

function DiagnosticTable({ m }: { m: ReportModel }) {
  const W = { name: "28%", num: "14%", gap: "16%" };
  return (
    <View>
      <View style={[s.row, { borderBottomWidth: 0.5, borderBottomColor: C.line, paddingBottom: 4 }]}>
        {(
          [
            ["Process", W.name, "left"],
            ["Overall", W.num, "center"],
            ["Process", W.num, "center"],
            ["People", W.num, "center"],
            ["Data & Analytics", W.num, "center"],
            ["Gap to target", W.gap, "center"],
          ] as const
        ).map(([h, w, a], i) => (
          <Text key={i} style={{ width: w, textAlign: a, fontSize: 7.5, color: C.muted }}>
            {h}
          </Text>
        ))}
      </View>
      {m.diagnostic.map((r) => {
        const g = r.gapLevels;
        const tone = g === null ? { bg: C.soft, fg: C.muted } : g === 0 ? { bg: C.okSoft, fg: C.ok } : g === 1 ? { bg: C.warnSoft, fg: C.warn } : { bg: C.badSoft, fg: C.bad };
        return (
          <View key={r.name} style={[s.row, { alignItems: "center", marginTop: 2 }]} wrap={false}>
            <Text style={{ width: W.name, paddingRight: 6, fontFamily: "Helvetica-Bold" }}>{t(r.name)}</Text>
            <Cell v={r.overall} w={W.num} bold />
            <Cell v={r.process} w={W.num} />
            <Cell v={r.people} w={W.num} />
            <Cell v={r.data} w={W.num} />
            <View style={{ width: W.gap, padding: 2 }}>
              <View style={{ backgroundColor: tone.bg, borderRadius: 3, paddingVertical: r.nothingPlanned ? 2 : 5, alignItems: "center" }}>
                <Text style={{ color: tone.fg, fontFamily: "Helvetica-Bold" }}>{r.gap}</Text>
                {r.nothingPlanned && <Text style={{ color: tone.fg, fontSize: 6.5 }}>nothing planned</Text>}
              </View>
            </View>
          </View>
        );
      })}
      <Text style={[s.small, { marginTop: 6 }]}>
        Scores on the 0–5 ladder; colour deepens with maturity. Area scores come from the 2025 capabilities each process owns, or from its own document sentences.
      </Text>
    </View>
  );
}

function SelfVsTodayBars({ m }: { m: ReportModel }) {
  const pct = (v: number) => `${(v / 5) * 100}%`;
  return (
    <View>
      {m.selfVsToday.map((r) => (
        <View key={r.name} style={[s.row, { alignItems: "center", marginBottom: 6 }]} wrap={false}>
          <Text style={{ width: "28%", paddingRight: 6 }}>{t(r.name)}</Text>
          <View style={{ flex: 1 }}>
            {(
              [
                [r.self, C.self, "2025"],
                [r.today, "#4f86d9", "Today"],
              ] as const
            ).map(([v, color, label]) => (
              <View key={label} style={[s.row, { alignItems: "center", marginVertical: 1 }]}>
                <View style={{ flex: 1, height: 7, backgroundColor: C.soft, borderRadius: 2 }}>
                  {v !== null && <View style={{ width: pct(v), height: 7, backgroundColor: color, borderRadius: 2 }} />}
                </View>
                <Text style={{ width: 52, textAlign: "right", fontSize: 7.5, color: C.muted }}>
                  {label} {v === null ? "none" : v.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={[s.row, { marginTop: 2 }]}>
        <View style={{ width: 10, height: 6, backgroundColor: C.self, marginRight: 4, marginTop: 1 }} />
        <Text style={[s.small, { marginRight: 12 }]}>2025 self-assessment</Text>
        <View style={{ width: 10, height: 6, backgroundColor: "#4f86d9", marginRight: 4, marginTop: 1 }} />
        <Text style={s.small}>Our findings (documents, interviews, review)</Text>
      </View>
    </View>
  );
}

function ProcessBlock({ p }: { p: ReportModel["processes"][number] }) {
  const c = ladderHex(p.score);
  return (
    <View style={{ borderWidth: 0.5, borderColor: p.validated ? "#6ee7b7" : C.line, borderRadius: 4, padding: 9, marginBottom: 7 }} wrap={false}>
      <View style={[s.row, { alignItems: "center" }]}>
        <View style={{ backgroundColor: c.fill, borderRadius: 3, paddingVertical: 3, paddingHorizontal: 6, marginRight: 8 }}>
          <Text style={{ color: c.text, fontFamily: "Helvetica-Bold" }}>{p.stage}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold" }}>{t(p.name)}</Text>
          <Text style={s.small}>
            {t(p.stageName)}
            {p.score !== null ? ` · exact score ${p.score.toFixed(2)}` : ""}
          </Text>
        </View>
        <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: p.validated ? C.ok : C.ai }}>{t(p.status)}</Text>
      </View>
      {p.sources.length > 0 && (
        <Text style={{ marginTop: 5, fontSize: 8 }}>
          {p.sources.map((x, i) => (
            <Text key={x.source}>
              {i > 0 ? "   |   " : ""}
              <Text style={{ color: C.muted }}>{x.source} </Text>
              <Text style={s.bold}>{x.stages}</Text>
            </Text>
          ))}
        </Text>
      )}
      <Text style={{ marginTop: 3, fontSize: 8, color: C.muted }}>{t(p.why)}</Text>
      {p.rationale && <Text style={{ marginTop: 3, fontSize: 8 }}>{t(`Consultant: ${p.rationale}`)}</Text>}
      {p.quotes.map((q) => (
        <View key={q.text} style={{ marginTop: 4, paddingLeft: 7, borderLeftWidth: 1.5, borderLeftColor: C.line }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Oblique" }}>{t(`“${q.text}”`)}</Text>
          <Text style={[s.small, { fontSize: 7 }]}>{t(q.source)}</Text>
        </View>
      ))}
    </View>
  );
}

const PHASE_SUB = { Now: "0–6 months", Next: "6–12 months", Later: "12–24 months" } as const;

function IdeasTable({ m }: { m: ReportModel }) {
  const W = ["40%", "20%", "9%", "9%", "9%", "13%"];
  return (
    <View>
      {(["Now", "Next", "Later"] as const).map((ph) =>
        m.ideas[ph].length ? (
          <View key={ph} style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 3 }}>
              {ph} <Text style={{ fontFamily: "Helvetica", color: C.muted, fontSize: 8 }}>· {PHASE_SUB[ph]}</Text>
            </Text>
            <View style={[s.row, { borderBottomWidth: 0.5, borderBottomColor: C.line, paddingBottom: 3 }]}>
              {["Idea", "Process", "Value", "Ease", "Priority", "Depends on"].map((h, i) => (
                <Text key={h} style={{ width: W[i], fontSize: 7.5, color: C.muted, textAlign: i >= 2 && i <= 4 ? "center" : "left" }}>
                  {h}
                </Text>
              ))}
            </View>
            {m.ideas[ph].map((i) => (
              <View key={i.title} style={[s.row, { paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.soft }]} wrap={false}>
                <View style={{ width: W[0], paddingRight: 6 }}>
                  <Text style={s.bold}>{t(i.title)}</Text>
                  <Text style={[s.small, { fontSize: 7 }]}>{t(i.description)}</Text>
                </View>
                <Text style={{ width: W[1], paddingRight: 4 }}>{t(i.processName)}</Text>
                <Text style={{ width: W[2], textAlign: "center" }}>{i.value}/5</Text>
                <Text style={{ width: W[3], textAlign: "center" }}>{i.feasibility}/5</Text>
                <Text style={{ width: W[4], textAlign: "center", fontFamily: "Helvetica-Bold" }}>{i.priority}</Text>
                <Text style={{ width: W[5], fontSize: 7.5, color: C.muted }}>{i.dependsOn.length ? t(i.dependsOn.join(", ")) : "—"}</Text>
              </View>
            ))}
          </View>
        ) : null,
      )}
    </View>
  );
}

export function ResultsReport({ m }: { m: ReportModel }) {
  const h = m.headline;
  const anyIdeas = m.ideas.Now.length + m.ideas.Next.length + m.ideas.Later.length > 0;
  return (
    <Document title={t(m.title)} author="KPMG (illustrative POC)" subject="Digital maturity assessment" creator="Himalaya DMA workbench">
      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        <Text style={s.eyebrow}>Digital maturity assessment</Text>
        <Text style={s.title}>{t(m.functionName)}</Text>
        <Text style={s.meta}>
          {t(`${m.client} · ${m.date} · ${h.reviewed} of ${h.total} levels validated by the consultant · Illustrative`)}
        </Text>

        <View style={s.section}>
          <Text style={s.h2}>{t(`Current maturity ${n1(h.current)} against a target of ${h.target.toFixed(1)}`)}</Text>
          <Text style={s.lead}>Evidence-backed assessment across process, people and data, on the 0–5 digital maturity ladder.</Text>
          <View style={[s.row, { borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.line }]}>
            <Stat first value={n1(h.current)} label="Current maturity" />
            <Stat value={String(h.target)} label="Target stage" />
            <Stat value={h.avgGap.toFixed(1)} label="Average gap (levels)" />
            <Stat value={`${h.below}/${h.scored}`} label="Processes below target" />
          </View>
          <Slider current={h.current} target={h.target} />
        </View>

        {m.insights.length > 0 && (
          <View style={[s.section, { backgroundColor: C.aiSoft, borderRadius: 4, padding: 12 }]} wrap={false}>
            <Text style={[s.eyebrow, { color: C.ai, marginBottom: 6 }]}>Key insights (AI generated)</Text>
            {m.insights.map((x) => (
              <View key={x.kind} style={[s.row, { marginBottom: 4 }]}>
                <View style={{ width: 3, backgroundColor: INSIGHT_COLOR[x.kind], marginRight: 7, borderRadius: 1 }} />
                <Text style={{ flex: 1, fontSize: 9.5 }}>
                  <Text style={s.bold}>{x.label}: </Text>
                  {t(x.text)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.h2}>Diagnostic table</Text>
          <Text style={s.lead}>Where each process sits overall and by area, and how far it is from target.</Text>
          <DiagnosticTable m={m} />
        </View>

      </Page>

      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        <View>
          <Text style={s.h2}>2025 self assessment compared with our findings</Text>
          <Text style={s.lead}>Processes with no 2025 bar had no matching capability in the self-assessment.</Text>
          <SelfVsTodayBars m={m} />
        </View>
        <View style={s.section}>
          <Text style={s.h2}>Process by process</Text>
          <Text style={s.lead}>Each stage traces to its sources: interview, questionnaire, documents and the 2025 baseline.</Text>
          {m.processes.map((p) => (
            <ProcessBlock key={p.name} p={p} />
          ))}
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        <Text style={s.h2}>Prioritize & roadmap</Text>
        <Text style={s.lead}>Ideas matched to process gaps, phased so nothing starts before what it depends on. Value and ease on a 1–5 scale; priority 0–100.</Text>
        {anyIdeas ? <IdeasTable m={m} /> : <Text>No gaps to close at this target.</Text>}
        {m.nothingPlanned.length > 0 && (
          <View style={[s.section, { backgroundColor: C.badSoft, borderRadius: 4, padding: 10 }]} wrap={false}>
            <Text style={[s.bold, { color: C.bad, marginBottom: 3 }]}>Gaps with nothing on the 2026-27 roadmap</Text>
            {m.nothingPlanned.map((g) => (
              <Text key={g.name}>{t(`• ${g.name}: ${g.gap} ${g.gap === 1 ? "level" : "levels"} below target`)}</Text>
            ))}
          </View>
        )}

        <View break>
          <Text style={s.h2}>Method and sources</Text>
          <Text style={s.lead}>The maturity ladder every process is rated on.</Text>
          {m.ladder.map((l) => {
            const c = ladderHex(Number(l.stage.replace(/\D/g, "")));
            return (
              <View key={l.stage} style={[s.row, { alignItems: "center", marginBottom: 3 }]} wrap={false}>
                <View style={{ width: 52, backgroundColor: c.fill, borderRadius: 3, paddingVertical: 3, alignItems: "center", marginRight: 8 }}>
                  <Text style={{ color: c.text, fontFamily: "Helvetica-Bold", fontSize: 8 }}>{l.stage}</Text>
                </View>
                <Text style={{ width: 130, fontFamily: "Helvetica-Bold" }}>{t(l.name)}</Text>
                <Text style={{ flex: 1, color: C.muted }}>{t(l.meaning)}</Text>
                {l.isTarget && <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.primary }}>TARGET</Text>}
              </View>
            );
          })}

          <Text style={[s.bold, { marginTop: 14, marginBottom: 3 }]}>How a level is calculated</Text>
          <Text>
            Each process is scored from four kinds of signal: the overall interview answer (quick check), questionnaire answers including the
            consultant&apos;s own questions, sentences in the documents and interviews that the AI places on the process, and the 2025 self-assessment of
            the capabilities it owns. Each signal is weighted by its importance and the reliability of its source; the weighted average is the
            AI-suggested score, rounded to a stage. A consultant confirms or changes every level, and every change carries a recorded reason.
            Confidence reflects how many sources speak, how well they agree and how reliable they are.
          </Text>

          <Text style={[s.bold, { marginTop: 14, marginBottom: 3 }]}>Sources used</Text>
          {m.sources.map((x) => (
            <Text key={x.title}>
              {t(`• ${x.title}`)}
              <Text style={{ color: C.muted }}>{t(` · ${x.kind}${x.sentences !== undefined ? ` · ${x.sentences} sentences` : ""}`)}</Text>
            </Text>
          ))}

          <Text style={[s.small, { marginTop: 16 }]}>
            All documents, interviews and figures in this report are synthetic and labelled Illustrative. The AI in this proof of concept is a
            deterministic engine; no external model was called.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
