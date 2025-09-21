import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// arquivo de log NA RAIZ (sem pastas)
const JSONL = path.join(__dirname, "events.jsonl");

// garante o arquivo de log
if (!fs.existsSync(JSONL)) fs.writeFileSync(JSONL, "");

// middlewares
app.use(cors());
app.use(express.json({ limit: "200kb" }));

// static: serve TUDO da raiz (quiz.html, dashboard.html, etc.)
app.use(express.static(__dirname));

// endpoint de tracking
app.post("/track", (req, res) => {
  const d = req.body || {};
  const row = {
    ts: d.ts || new Date().toISOString(),
    lead_id: d.lead_id || "",
    event: d.event || "",
    step_index: d.step_index ?? "",
    question: d.question || "",
    choice: d.choice || "",
    score: d.score ?? "",
    score_pct: d.score_pct ?? "",
    score_tag: d.score_tag || "",
    elapsed_ms: d.elapsed_ms ?? "",
    href: d.href || "",
    ua: d.ua || req.headers["user-agent"] || ""
  };
  try {
    fs.appendFileSync(JSONL, JSON.stringify(row) + "\n");
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "write_failed" });
  }
});

// relatório JSON (dashboard consome)
app.get("/report.json", (req, res) => {
  try {
    const text = fs.readFileSync(JSONL, "utf8").trim();
    if (!text) return res.json([]);
    const rows = text
      .split("\n")
      .filter(Boolean)
      .map(l => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean)
      .sort((a,b)=> new Date(b.ts) - new Date(a.ts));
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

// relatório CSV (pra baixar)
app.get("/report.csv", (req, res) => {
  try {
    const text = fs.readFileSync(JSONL, "utf8").trim();
    const lines = text ? text.split("\n").filter(Boolean) : [];
    const rows = lines.map(l => JSON.parse(l));
    const header = ["ts","lead_id","event","step_index","question","choice","score","score_pct","score_tag","elapsed_ms","href","ua"];
    const csv = [
      header.join(","),
      ...rows.map(r => header.map(h => {
        const v = r[h] ?? "";
        return String(v).replaceAll(/[\r\n,]/g, " ");
      }).join(","))
    ].join("\n");
    res.setHeader("Content-Type","text/csv; charset=utf-8");
    res.send(csv);
  } catch (e) {
    console.error(e);
    res.status(500).send("error");
  }
});

app.listen(PORT, () => console.log(`ON http://localhost:${PORT}`));
