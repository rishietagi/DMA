/**
 * The exported PDF (react-pdf): a consulting-style report rendered from ReportModel, following the
 * approach deck's indicative outputs. Loaded only when the user clicks Export PDF. Uses the built-in
 * Helvetica, so text is limited to WinAnsi — `t()` maps the few characters outside it.
 */
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Phase } from "@/lib/engine";
import { LEVEL_HEX, ladderHex, type ReportModel } from "@/lib/report/report-data";

const C = {
  ink: "#18181b",
  muted: "#71717a",
  faint: "#a1a1aa",
  line: "#e4e4e7",
  soft: "#f4f4f5",
  navy: LEVEL_HEX[3].strong,
  teal: LEVEL_HEX[4].strong,
  orange: LEVEL_HEX[2].strong,
  green: LEVEL_HEX[5].strong,
  red: LEVEL_HEX[1].strong,
  ai: "#6d28d9",
  aiSoft: "#f5f3ff",
  self: "#a78bfa",
};

// whole words only: no mid-word hyphenation in a client report
Font.registerHyphenationCallback((word) => [word]);

/** Characters Helvetica (WinAnsi) can't draw, mapped to ones it can. */
const t = (s: string) =>
  s
    .replace(/→/g, "to")
    .replace(/−/g, "-")
    .replace(/₹/g, "INR ")
    .replace(/[≥]/g, ">=")
    .replace(/[≤]/g, "<=")
    .replace(/[×]/g, "x")
    .replace(/[^\u0000-ÿ–—‘’“”•…€]/g, "");
const n1 = (v: number | null) => (v === null ? "—" : v.toFixed(1));

const PHASES: Phase[] = ["Now", "Next", "Later"];
const PHASE_HEAD: Record<Phase, { label: string; color: string }> = {
  Now: { label: "NOW | 0–6 months", color: C.navy },
  Next: { label: "NEXT | 6–18 months", color: C.ai },
  Later: { label: "BEYOND | 18–36 months", color: C.green },
};
const ROW_COLORS = [C.navy, C.teal, C.ai, C.orange];

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 52, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9, color: C.ink, lineHeight: 1.35 },
  header: { position: "absolute", top: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted, borderBottomWidth: 0.5, borderBottomColor: C.line, paddingBottom: 6 },
  footer: { position: "absolute", top: 806, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.faint },
  eyebrow: { fontSize: 8, color: C.navy, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, textTransform: "uppercase" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 6, lineHeight: 1.15 },
  meta: { fontSize: 9, color: C.muted, marginTop: 6 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  lead: { fontSize: 8.5, color: C.muted, marginBottom: 9 },
  section: { marginTop: 18 },
  bold: { fontFamily: "Helvetica-Bold" },
  small: { fontSize: 7.5, color: C.muted },
  row: { flexDirection: "row" },
  th: { fontSize: 7.5, color: C.muted },
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

function Heading({ title, lead }: { title: string; lead?: string }) {
  return (
    <View wrap={false}>
      <Text style={s.h2}>{t(title)}</Text>
      {lead && <Text style={s.lead}>{t(lead)}</Text>}
    </View>
  );
}

function StatBox({ value, label, color }: { value: string; label: string; color: string }) {
  // long values (a value range) stack above their label instead of squeezing it
  const stack = value.length > 6;
  return (
    <View
      style={{
        flex: 1,
        flexDirection: stack ? "column" : "row",
        alignItems: stack ? "flex-start" : "center",
        borderWidth: 1,
        borderColor: color,
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 9,
        marginRight: 6,
      }}
    >
      <Text style={{ fontSize: stack ? 14 : 17, fontFamily: "Helvetica-Bold", color, marginRight: stack ? 0 : 7, lineHeight: 1.1 }}>{t(value)}</Text>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", flex: stack ? undefined : 1, marginTop: stack ? 2 : 0 }}>{label}</Text>
    </View>
  );
}

/** Current to target on a 1–5 track. */
function Slider({ current, target }: { current: number | null; target: number }) {
  const pct = (v: number) => `${((Math.min(5, Math.max(1, v)) - 1) / 4) * 100}%`;
  const now = current ?? 1;
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ height: 22, position: "relative" }}>
        <View style={{ position: "absolute", top: 8, left: 0, right: 0, height: 5, borderRadius: 3, backgroundColor: C.soft }} />
        <View style={{ position: "absolute", top: 8, left: pct(Math.min(now, target)), width: pct(1 + Math.abs(target - now)), height: 5, borderRadius: 3, backgroundColor: "#c4b5fd" }} />
        <View style={{ position: "absolute", top: 4, left: pct(now), marginLeft: -6, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.ai, backgroundColor: "#ffffff" }} />
        <View style={{ position: "absolute", top: 2, left: pct(target), marginLeft: -1, width: 2, height: 17, backgroundColor: C.ink }} />
      </View>
      <View style={{ position: "relative", height: 10 }}>
        {[1, 2, 3, 4, 5].map((l) => (
          <Text key={l} style={{ position: "absolute", left: pct(l), marginLeft: l === 5 ? -6 : l === 1 ? 0 : -3, fontSize: 7, color: C.faint }}>
            {l}
          </Text>
        ))}
      </View>
      <View style={[s.row, { justifyContent: "space-between", marginTop: 3 }]}>
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

function Numbered({ n, color, children }: { n: number; color: string; children: React.ReactNode }) {
  return (
    <View style={[s.row, { marginBottom: 6, alignItems: "flex-start" }]} wrap={false}>
      <View style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: color, alignItems: "center", justifyContent: "center", marginRight: 7 }}>
        <Text style={{ color: "#ffffff", fontSize: 8, fontFamily: "Helvetica-Bold" }}>{n}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 9, paddingTop: 2 }}>{children}</Text>
    </View>
  );
}

function MaturityBars({ m }: { m: ReportModel }) {
  const pct = (v: number) => `${(Math.min(5, Math.max(0, v)) / 5) * 100}%`;
  return (
    <View>
      {m.diagnostic.map((r) => (
        <View key={r.name} style={[s.row, { alignItems: "center", marginBottom: 5 }]} wrap={false}>
          <Text style={{ width: "34%", fontSize: 8, paddingRight: 4 }}>{t(r.name)}</Text>
          <View style={{ flex: 1, height: 8, backgroundColor: C.soft, borderRadius: 2, position: "relative" }}>
            {r.overall !== null && <View style={{ width: pct(r.overall), height: 8, borderRadius: 2, backgroundColor: LEVEL_HEX[Math.min(5, Math.max(1, Math.round(r.overall))) as 1].strong }} />}
            <View style={{ position: "absolute", left: pct(r.target), top: -2, width: 1.5, height: 12, backgroundColor: C.ink }} />
          </View>
          <Text style={{ width: 34, textAlign: "right", fontSize: 7.5, color: C.muted }}>
            {n1(r.overall)} / {r.target}
          </Text>
        </View>
      ))}
      <Text style={[s.small, { fontSize: 7 }]}>Bar = current (colour = stage); line = target.</Text>
    </View>
  );
}

function Cell({ v, w, bold }: { v: number | null; w: string; bold?: boolean }) {
  const c = ladderHex(v);
  return (
    <View style={{ width: w, padding: 1.5 }}>
      <View style={{ backgroundColor: c.fill, borderRadius: 3, paddingVertical: 5, alignItems: "center" }}>
        <Text style={{ color: c.text, fontFamily: bold ? "Helvetica-Bold" : "Helvetica" }}>{n1(v)}</Text>
      </View>
    </View>
  );
}

function DiagnosticTable({ m }: { m: ReportModel }) {
  const W = { name: "22%", crit: "10%", num: "10.8%", gap: "14%" };
  const heads: [string, string, "left" | "center"][] = [
    ["Process", W.name, "left"],
    ["Criticality", W.crit, "center"],
    ["Process", W.num, "center"],
    ["Data", W.num, "center"],
    ["Tech & AI", W.num, "center"],
    ["People", W.num, "center"],
    ["Overall", W.num, "center"],
    ["Gap to target", W.gap, "center"],
  ];
  return (
    <View>
      <View style={[s.row, { backgroundColor: C.navy, borderRadius: 3, paddingVertical: 5 }]}>
        {heads.map(([h, w, a], i) => (
          <Text key={i} style={{ width: w, textAlign: a, fontSize: 7.5, color: "#ffffff", fontFamily: "Helvetica-Bold", paddingLeft: a === "left" ? 5 : 0 }}>
            {t(h)}
          </Text>
        ))}
      </View>
      {m.diagnostic.map((r) => {
        const g = r.gapLevels;
        const tone = g === null ? { bg: C.soft, fg: C.muted } : g === 0 ? LEVEL_HEX[5] : g === 1 ? LEVEL_HEX[2] : LEVEL_HEX[1];
        const bg = "soft" in tone ? tone.soft : tone.bg;
        const fg = "ink" in tone ? tone.ink : tone.fg;
        return (
          <View key={r.name} style={[s.row, { alignItems: "center", marginTop: 1.5 }]} wrap={false}>
            <Text style={{ width: W.name, paddingRight: 4, paddingLeft: 5, fontFamily: "Helvetica-Bold", fontSize: 8.5 }}>{t(r.name)}</Text>
            <Text style={{ width: W.crit, textAlign: "center", fontSize: 8 }}>{r.criticality ?? "—"}</Text>
            <Cell v={r.process} w={W.num} />
            <Cell v={r.data} w={W.num} />
            <Cell v={r.ai} w={W.num} />
            <Cell v={r.people} w={W.num} />
            <Cell v={r.overall} w={W.num} bold />
            <View style={{ width: W.gap, padding: 1.5 }}>
              <View style={{ backgroundColor: bg, borderRadius: 3, paddingVertical: r.nothingPlanned ? 2 : 5, alignItems: "center" }}>
                <Text style={{ color: fg, fontFamily: "Helvetica-Bold" }}>{r.gap}</Text>
                {r.nothingPlanned && <Text style={{ color: fg, fontSize: 6.5 }}>nothing planned</Text>}
              </View>
            </View>
          </View>
        );
      })}
      <Text style={[s.small, { marginTop: 5 }]}>
        Stage colours: 1 Initiated · 2 Tested · 3 Scaled · 4 Optimized · 5 Intelligent. Gap is measured against each process&apos;s own target.
      </Text>
    </View>
  );
}

const RESPONSES = [
  { r: "Transform now", note: "High criticality / lower maturity", color: C.orange },
  { r: "Sustain & differentiate", note: "High criticality / higher maturity", color: C.green },
  { r: "Rationalize / monitor", note: "Lower criticality / lower maturity", color: C.muted },
  { r: "Scale selectively", note: "Lower criticality / higher maturity", color: C.ai },
] as const;

function Quadrants({ m }: { m: ReportModel }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {RESPONSES.map((q) => {
        const here = m.portfolio.filter((p) => p.response === q.r);
        return (
          <View key={q.r} style={{ width: "50%", padding: 3 }} wrap={false}>
            <View style={{ borderLeftWidth: 3, borderLeftColor: q.color, backgroundColor: C.soft, borderRadius: 3, padding: 8, minHeight: 62 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: q.color, fontSize: 9 }}>{q.r.toUpperCase()}</Text>
              <Text style={[s.small, { marginBottom: 3 }]}>{q.note}</Text>
              {here.length ? (
                here.map((p) => (
                  <Text key={p.name} style={{ fontSize: 8.5 }}>
                    {t(`• ${p.name}`)} <Text style={{ color: C.muted }}>{t(`· ${p.criticality} · ${p.maturity.toFixed(1)}`)}</Text>
                  </Text>
                ))
              ) : (
                <Text style={s.small}>—</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SelfVsTodayBars({ m }: { m: ReportModel }) {
  const pct = (v: number) => `${(v / 5) * 100}%`;
  return (
    <View>
      {m.selfVsToday.map((r) => (
        <View key={r.name} style={[s.row, { alignItems: "center", marginBottom: 5 }]} wrap={false}>
          <Text style={{ width: "28%", paddingRight: 6 }}>{t(r.name)}</Text>
          <View style={{ flex: 1 }}>
            {(
              [
                [r.self, C.self, "2025"],
                [r.today, C.navy, "Today"],
              ] as const
            ).map(([v, color, label]) => (
              <View key={label} style={[s.row, { alignItems: "center", marginVertical: 1 }]}>
                <View style={{ flex: 1, height: 6, backgroundColor: C.soft, borderRadius: 2 }}>
                  {v !== null && <View style={{ width: pct(v), height: 6, backgroundColor: color, borderRadius: 2 }} />}
                </View>
                <Text style={{ width: 52, textAlign: "right", fontSize: 7.5, color: C.muted }}>
                  {label} {v === null ? "none" : v.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ProcessBlock({ p }: { p: ReportModel["processes"][number] }) {
  const c = ladderHex(p.score);
  return (
    <View style={{ borderWidth: 0.5, borderColor: p.validated ? "#86c06c" : C.line, borderRadius: 4, padding: 8, marginBottom: 6 }} wrap={false}>
      <View style={[s.row, { alignItems: "center" }]}>
        <View style={{ backgroundColor: c.fill, borderRadius: 3, paddingVertical: 3, paddingHorizontal: 6, marginRight: 8 }}>
          <Text style={{ color: c.text, fontFamily: "Helvetica-Bold" }}>{p.stage}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>{t(p.name)}</Text>
          <Text style={s.small}>
            {t(p.stageName)}
            {p.score !== null ? ` · exact score ${p.score.toFixed(2)}` : ""} · target Stage {p.target}
            {p.criticality ? ` · ${p.criticality} criticality` : ""}
          </Text>
        </View>
        <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: p.validated ? C.green : C.ai }}>{t(p.status)}</Text>
      </View>
      {p.sources.length > 0 && (
        <Text style={{ marginTop: 4, fontSize: 8 }}>
          {p.sources.map((x, i) => (
            <Text key={x.source}>
              {i > 0 ? "   |   " : ""}
              <Text style={{ color: C.muted }}>{x.source} </Text>
              <Text style={s.bold}>{x.stages}</Text>
            </Text>
          ))}
        </Text>
      )}
      {p.rationale && <Text style={{ marginTop: 3, fontSize: 8 }}>{t(`Consultant: ${p.rationale}`)}</Text>}
      {p.quotes.map((q) => (
        <View key={q.text} style={{ marginTop: 3, paddingLeft: 7, borderLeftWidth: 1.5, borderLeftColor: C.line }}>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Oblique" }}>{t(`“${q.text}”`)}</Text>
          <Text style={[s.small, { fontSize: 7 }]}>{t(q.source)}</Text>
        </View>
      ))}
    </View>
  );
}

const CRITERIA = [
  ["Business value", "Revenue, margin, service, productivity", "30%"],
  ["Strategic alignment", "Growth priorities and target experiences", "25%"],
  ["Feasibility", "Data, technology, process and skills readiness", "20%"],
  ["Risk & obligation", "Cyber, compliance, continuity and control", "15%"],
  ["Dependencies", "Platforms, master data, ownership and change capacity", "10%"],
] as const;

function IdeasTable({ m }: { m: ReportModel }) {
  const W = ["32%", "17%", "8%", "8%", "8%", "8%", "8%", "11%"];
  const heads = ["Initiative", "Process", "Value", "Align.", "Feas.", "Risk", "Deps", "Priority"];
  return (
    <View>
      {PHASES.map((ph) =>
        m.ideas[ph].length ? (
          <View key={ph} style={{ marginBottom: 8 }}>
            <View style={{ backgroundColor: PHASE_HEAD[ph].color, borderRadius: 3, paddingVertical: 3, paddingHorizontal: 6, marginBottom: 2 }}>
              <Text style={{ color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 8 }}>{t(PHASE_HEAD[ph].label)}</Text>
            </View>
            <View style={[s.row, { borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 2 }]}>
              {heads.map((h, i) => (
                <Text key={h} style={{ width: W[i], fontSize: 7.5, color: C.muted, textAlign: i >= 2 ? "center" : "left" }}>
                  {h}
                </Text>
              ))}
            </View>
            {m.ideas[ph].map((i) => (
              <View key={i.title} style={[s.row, { paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.soft }]} wrap={false}>
                <View style={{ width: W[0], paddingRight: 5 }}>
                  <Text style={s.bold}>{t(i.title)}</Text>
                  <Text style={[s.small, { fontSize: 7 }]}>{t(`${i.quadrant}${i.dependsOn.length ? ` · after ${i.dependsOn.join(", ")}` : ""}`)}</Text>
                </View>
                <Text style={{ width: W[1], paddingRight: 4, fontSize: 8 }}>{t(i.processName)}</Text>
                {[i.value, i.alignment, i.feasibility, i.risk, i.dependencies].map((v, k) => (
                  <Text key={k} style={{ width: W[k + 2], textAlign: "center" }}>
                    {v}
                  </Text>
                ))}
                <Text style={{ width: W[7], textAlign: "center", fontFamily: "Helvetica-Bold" }}>{i.priority}</Text>
              </View>
            ))}
          </View>
        ) : null,
      )}
    </View>
  );
}

function PhaseGrid({ rows, label }: { rows: { name: string; cells: Record<Phase, string[]> }[]; label: string }) {
  return (
    <View>
      <View style={s.row}>
        <View style={{ width: "22%" }}>
          <Text style={s.th}>{label}</Text>
        </View>
        {PHASES.map((p) => (
          <View key={p} style={{ flex: 1, backgroundColor: PHASE_HEAD[p].color, borderRadius: 3, paddingVertical: 4, marginLeft: 4, alignItems: "center" }}>
            <Text style={{ color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 7.5 }}>{t(PHASE_HEAD[p].label)}</Text>
          </View>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={r.name} style={[s.row, { marginTop: 4 }]} wrap={false}>
          <View style={{ width: "22%", backgroundColor: ROW_COLORS[ri % 4], borderRadius: 3, padding: 6, justifyContent: "center" }}>
            <Text style={{ color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 8 }}>{t(r.name)}</Text>
          </View>
          {PHASES.map((p) => (
            <View key={p} style={{ flex: 1, marginLeft: 4, borderWidth: 0.5, borderColor: PHASE_HEAD[p].color, borderRadius: 3, padding: 5, minHeight: 28 }}>
              {r.cells[p].length ? (
                r.cells[p].map((x) => (
                  <Text key={x} style={{ fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                    {t(x)}
                  </Text>
                ))
              ) : (
                <Text style={[s.small, { textAlign: "center" }]}>—</Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function CharterBox({ title, color, children, full }: { title: string; color: string; children: React.ReactNode; full?: boolean }) {
  return (
    <View style={{ width: full ? "100%" : "50%", padding: 3 }} wrap={false}>
      <View style={[s.row, { borderWidth: 1, borderColor: color, borderRadius: 4, padding: 8, minHeight: full ? 0 : 58 }]}>
        <Text style={{ width: 78, fontFamily: "Helvetica-Bold", color, fontSize: 8.5 }}>{title}</Text>
        <Text style={{ flex: 1, fontSize: 8.5 }}>{children}</Text>
      </View>
    </View>
  );
}

const RAG = { green: { c: C.green, l: "On track" }, amber: { c: C.orange, l: "Watch" }, red: { c: C.red, l: "At risk" } } as const;
const PHASE_SHORT: Record<Phase, string> = { Now: "Now", Next: "Next", Later: "Beyond" };

export function ResultsReport({ m }: { m: ReportModel }) {
  const h = m.headline;
  const g = m.governance;
  const anyIdeas = m.ideas.Now.length + m.ideas.Next.length + m.ideas.Later.length > 0;
  return (
    <Document title={t(m.title)} author="KPMG (illustrative POC)" subject="Digital maturity assessment" creator="Himalaya DMA workbench">
      {/* 1 · Executive maturity story */}
      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        <Text style={s.eyebrow}>Digital maturity assessment</Text>
        <Text style={s.title}>{t(m.functionName)}</Text>
        <Text style={s.meta}>{t(`${m.client} · ${m.date} · ${h.reviewed} of ${h.total} levels validated by the consultant · Illustrative`)}</Text>

        <View style={s.section}>
          <Heading title="Executive maturity story" lead="Leadership summary of current maturity, target ambition and the most material gaps." />
          <View style={s.row}>
            <StatBox value={n1(h.current)} label="Current maturity" color={C.navy} />
            <StatBox value={h.target.toFixed(1)} label="Target maturity" color={C.green} />
            <StatBox value={n1(h.ambitionGap)} label="Ambition gap" color={C.orange} />
            <StatBox value={String(h.themes)} label="Priority themes" color={C.ink} />
          </View>
          <Slider current={h.current} target={h.target} />
        </View>

        <View style={[s.section, s.row]}>
          <View style={{ width: "52%", paddingRight: 12 }}>
            <Text style={[s.bold, { fontSize: 10, marginBottom: 6 }]}>Maturity by process</Text>
            <MaturityBars m={m} />
          </View>
          <View style={{ width: "48%", borderWidth: 1, borderColor: C.navy, borderRadius: 4, padding: 10 }} wrap={false}>
            <Text style={[s.bold, { fontSize: 10, color: C.navy, marginBottom: 6 }]}>Leadership narrative</Text>
            {m.narrative.map((l, i) => (
              <Numbered key={l} n={i + 1} color={ROW_COLORS[i % 4]!}>
                {t(l)}
              </Numbered>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Heading title="Portfolio heatmap: criticality × maturity" lead="Business criticality versus current digital maturity, translated into four portfolio responses." />
          <Quadrants m={m} />
        </View>
      </Page>

      {/* 2 · Detailed heatmap, baseline, process by process */}
      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        <Heading title="Detailed maturity heatmap" lead="Evidence-backed scoring by process and dimension, on the 1–5 scale." />
        <DiagnosticTable m={m} />
        <View style={s.section}>
          <Heading title="2025 self assessment compared with our findings" lead="Processes with no 2025 bar had no matching capability in the self-assessment." />
          <SelfVsTodayBars m={m} />
        </View>
        <View style={s.section}>
          <Heading title="Process by process" lead="Each stage traces to its sources: interview, questionnaire, documents and the 2025 baseline." />
          {m.processes.map((p) => (
            <ProcessBlock key={p.name} p={p} />
          ))}
        </View>
      </Page>

      {/* 3 · Prioritization */}
      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        <Heading title="From opportunities to a value-backed portfolio" lead="A common prioritization logic: business value against strategic alignment, with feasibility, risk and dependencies completing the 0–100 priority." />
        <View style={[s.row, { flexWrap: "wrap", marginBottom: 10 }]}>
          {CRITERIA.map(([c, note, w], i) => (
            <View key={c} style={{ width: "20%", padding: 2 }}>
              <View style={{ borderWidth: 0.5, borderColor: C.line, borderRadius: 3, padding: 5, minHeight: 50 }}>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, color: ROW_COLORS[i % 4] }}>
                  {i + 1}. {t(c)} <Text style={{ color: C.muted, fontFamily: "Helvetica" }}>{w}</Text>
                </Text>
                <Text style={[s.small, { fontSize: 7 }]}>{t(note)}</Text>
              </View>
            </View>
          ))}
        </View>
        {anyIdeas ? <IdeasTable m={m} /> : <Text>No gaps to close at these targets.</Text>}
        {m.nothingPlanned.length > 0 && (
          <View style={[s.section, { backgroundColor: LEVEL_HEX[1].soft, borderRadius: 4, padding: 9 }]} wrap={false}>
            <Text style={[s.bold, { color: LEVEL_HEX[1].ink, marginBottom: 3 }]}>Gaps with nothing on the 2026-27 roadmap</Text>
            {m.nothingPlanned.map((x) => (
              <Text key={x.name}>{t(`• ${x.name}: ${x.gap} ${x.gap === 1 ? "level" : "levels"} below target`)}</Text>
            ))}
          </View>
        )}
      </Page>

      {/* 4 · Portfolio and roadmap */}
      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        <Heading title="Digital opportunity portfolio" lead="Initiatives connected to maturity gaps, value pools, foundations and delivery horizons." />
        <PhaseGrid rows={m.themes.map((x) => ({ name: x.theme, cells: x.cells }))} label="Theme" />
        {m.foundations.length > 0 && (
          <View style={{ marginTop: 6, backgroundColor: C.navy, borderRadius: 3, padding: 6 }}>
            <Text style={{ color: "#ffffff", fontSize: 8 }}>
              <Text style={s.bold}>Foundations: </Text>
              {t(m.foundations.join(" • "))}
            </Text>
          </View>
        )}
        <View style={s.section}>
          <Heading title="Prioritized transformation roadmap" lead="Sequencing of business outcomes, enabling platforms and organizational capacity." />
          <PhaseGrid rows={m.layers.map((x) => ({ name: x.layer, cells: x.cells }))} label="Layer" />
        </View>
      </Page>

      {/* 5 · Charter and activation */}
      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        {m.charter && (
          <View>
            <Heading title="Initiative charter" lead="One-page definition to enable sponsorship, funding and mobilization (the highest-priority initiative)." />
            <View style={[s.row, { backgroundColor: C.ink, borderRadius: 4, padding: 9, alignItems: "center", marginBottom: 5 }]}>
              <Text style={{ flex: 1, color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 12 }}>{t(m.charter.title)}</Text>
              <Text style={{ color: "#ffffff", backgroundColor: C.ai, borderRadius: 3, paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, fontFamily: "Helvetica-Bold" }}>
                HORIZON: {m.charter.horizon.toUpperCase()}
              </Text>
            </View>
            <View style={[s.row, { flexWrap: "wrap" }]}>
              <CharterBox title="Business problem" color={C.navy}>
                {t(m.charter.problem)}
              </CharterBox>
              <CharterBox title="Target outcome" color={C.teal}>
                {t(m.charter.outcome)}
              </CharterBox>
              <CharterBox title="Scope" color={C.navy}>
                {t(m.charter.scope.join(" • "))}
              </CharterBox>
              <CharterBox title="Value hypothesis" color={C.orange}>
                {t(m.charter.valueHypothesis)}
              </CharterBox>
              <CharterBox title="Dependencies" color={C.green}>
                {t(m.charter.dependencies.length ? m.charter.dependencies.join(" • ") : "None identified")}
              </CharterBox>
              <CharterBox title="Success measures" color={C.red}>
                {t(m.charter.successMeasures.join(" • "))}
              </CharterBox>
              <CharterBox title="First 90 days" color={C.navy} full>
                {t(m.charter.first90.join(" | "))}
              </CharterBox>
            </View>
          </View>
        )}

        <View style={s.section}>
          <Heading title="Activation and value governance" lead="Portfolio health, outcome realization and decisions requiring leadership action." />
          <View style={s.row}>
            <StatBox value={String(g.initiatives)} label="Initiatives" color={C.navy} />
            <StatBox value={String(g.inDelivery)} label="In delivery" color={C.green} />
            <StatBox value={String(g.atRisk)} label="At risk" color={C.red} />
            <StatBox value={`INR ${g.valueCr[0]}–${g.valueCr[1]} Cr`} label="Value potential" color={C.teal} />
          </View>
          <View style={[s.row, { marginTop: 8 }]}>
            <View style={{ width: "62%", paddingRight: 8 }}>
              <View style={[s.row, { borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 2 }]}>
                {["Initiative", "Horizon", "Status", "Next decision"].map((x, i) => (
                  <Text key={x} style={{ width: ["40%", "15%", "18%", "27%"][i], fontSize: 7.5, color: C.muted }}>
                    {x}
                  </Text>
                ))}
              </View>
              {g.health.map((r) => (
                <View key={r.id} style={[s.row, { paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.soft, alignItems: "center" }]} wrap={false}>
                  <Text style={{ width: "40%", fontSize: 8, fontFamily: "Helvetica-Bold", paddingRight: 4 }}>{t(r.title)}</Text>
                  <Text style={{ width: "15%", fontSize: 8 }}>{PHASE_SHORT[r.phase]}</Text>
                  <View style={[s.row, { width: "18%", alignItems: "center" }]}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: RAG[r.rag].c, marginRight: 4 }} />
                    <Text style={{ fontSize: 8 }}>{RAG[r.rag].l}</Text>
                  </View>
                  <Text style={{ width: "27%", fontSize: 8 }}>{t(r.nextDecision)}</Text>
                </View>
              ))}
            </View>
            <View style={{ width: "38%", borderWidth: 1, borderColor: C.orange, backgroundColor: LEVEL_HEX[2].soft, borderRadius: 4, padding: 8 }} wrap={false}>
              <Text style={[s.bold, { color: LEVEL_HEX[2].ink, marginBottom: 5 }]}>Decisions required</Text>
              {g.decisions.map((d, i) => (
                <Numbered key={d} n={i + 1} color={C.orange}>
                  {t(d)}
                </Numbered>
              ))}
            </View>
          </View>
          <Text style={[s.small, { marginTop: 6 }]}>Status is derived from the assessment until delivery data is connected. Value ranges are Illustrative.</Text>
        </View>
      </Page>

      {/* 6 · Method and sources */}
      <Page size="A4" style={s.page}>
        <Header m={m} />
        <Footer />
        <Heading title="Digital maturity levels" lead="A common five-level scale describes the journey within every process." />
        <View style={s.row}>
          {m.ladder.map((l) => {
            const c = LEVEL_HEX[l.level];
            return (
              <View key={l.stage} style={{ flex: 1, marginRight: l.level < 5 ? 5 : 0, borderWidth: 1, borderColor: c.strong, borderRadius: 4, padding: 6, alignItems: "center", backgroundColor: l.level === 5 ? c.soft : "#ffffff" }} wrap={false}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.strong, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                  <Text style={{ color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 10 }}>{l.level}</Text>
                </View>
                <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>{t(l.name)}</Text>
                <Text style={{ fontSize: 7.5, textAlign: "center", marginTop: 3 }}>{t(l.headline)}</Text>
                <View style={{ width: "60%", height: 1, backgroundColor: c.strong, marginVertical: 4 }} />
                <Text style={{ fontSize: 7, textAlign: "center", color: C.muted }}>{t(l.meaning)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 8 }}>
          Scoring principle: current maturity is evidence-based; targets are differentiated by strategic importance and value, rather than Stage 5 for every process.
        </Text>

        <Text style={[s.bold, { marginTop: 16, marginBottom: 3 }]}>How a level is calculated</Text>
        <Text>
          Each process is scored from four kinds of signal: the overall interview answer (quick check), questionnaire answers including the consultant&apos;s
          own questions, sentences in the documents and interviews that the AI places on the process, and the 2025 self-assessment of the capabilities it
          owns. Each signal is weighted by its importance and the reliability of its source; the weighted average is the AI-suggested score, rounded to a
          stage. A consultant confirms or changes every level, and every change carries a recorded reason. Each process&apos;s target is the function&apos;s
          ambition, raised for High and lowered for Low business criticality, unless the consultant set it.
        </Text>

        <Text style={[s.bold, { marginTop: 14, marginBottom: 3 }]}>Sources used</Text>
        {m.sources.map((x) => (
          <Text key={x.title}>
            {t(`• ${x.title}`)}
            <Text style={{ color: C.muted }}>{t(` · ${x.kind}${x.sentences !== undefined ? ` · ${x.sentences} sentences` : ""}`)}</Text>
          </Text>
        ))}

        <Text style={[s.small, { marginTop: 16 }]}>
          All documents, interviews and figures in this report are synthetic and labelled Illustrative. The AI in this proof of concept is a deterministic
          engine; no external model was called.
        </Text>
      </Page>
    </Document>
  );
}
