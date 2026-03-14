import { useEffect, useState } from "react";

const TERMINAL_LINES = [
  { delay: 0,    type: "cmd",     text: "codeaura setup ./my-project --force" },
  { delay: 900,  type: "ok",      text: "✓ Found 1,247 files via fast-glob" },
  { delay: 1400, type: "ok",      text: "✓ Incremental index: 38 changed, 0 deleted" },
  { delay: 1900, type: "info",    text: "⚡ Parallel indexing [██████████] 100%  38/38 files" },
  { delay: 2500, type: "ok",      text: "✓ Embedded 284 child chunks (batch HF)" },
  { delay: 3000, type: "ok",      text: "✓ Index ready in 2.14s" },
  { delay: 3800, type: "cmd",     text: 'codeaura search "JWT authentication middleware"' },
  { delay: 4600, type: "info",    text: "↳ Expanded: JWT token auth bearer middleware express verify" },
  { delay: 5100, type: "result",  text: "#1 src/middleware/auth.ts  [RRF 94.2] ████████████████████" },
  { delay: 5500, type: "result",  text: "#2 src/utils/tokenHelper.ts [RRF 87.1] ████████████████░░░░" },
  { delay: 5900, type: "result",  text: "#3 src/routes/protected.ts [RRF 79.5] ██████████████░░░░░░" },
];

const TerminalLine = ({ line, visible }: { line: typeof TERMINAL_LINES[0]; visible: boolean }) => {
  const colors: Record<string, string> = {
    cmd:    "#00ff88",
    ok:     "#ffffff",
    info:   "#888888",
    result: "#a78bfa",
  };
  const prefixes: Record<string, string> = {
    cmd:    "$ ",
    ok:     "  ",
    info:   "  ",
    result: "  ",
  };

  return (
    <div
      className="font-mono text-xs leading-relaxed transition-all duration-500"
      style={{
        color: colors[line.type],
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-8px)",
      }}
    >
      <span style={{ color: "#555" }}>{prefixes[line.type]}</span>
      {line.text}
    </div>
  );
};

const Hero = () => {
  const [isVisible, setIsVisible]     = useState(false);
  const [shownLines, setShownLines]   = useState<number[]>([]);

  useEffect(() => {
    setIsVisible(true);
    TERMINAL_LINES.forEach((line, i) => {
      setTimeout(() => setShownLines((prev) => [...prev, i]), line.delay + 600);
    });
  }, []);

  const statItems = [
    { val: "5×",      label: "faster indexing" },
    { val: "BM25",    label: "+ semantic RRF" },
    { val: "384-d",   label: "embeddings" },
    { val: "∞",       label: "incremental cache" },
  ];

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col justify-center bg-white text-black overflow-hidden"
      style={{ paddingTop: "6rem" }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Green accent blob */}
        <div
          className="absolute top-1/4 right-0 w-96 h-96 rounded-full -z-10 opacity-10 blur-3xl"
          style={{ background: "#00ff88" }}
        />
        {/* Corner label */}
        <div
          className="absolute top-8 right-8 font-mono text-xs tracking-widest opacity-20"
          style={{ writingMode: "vertical-rl" }}
        >
          DEVELOPER VELOCITY ENGINE
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Left ── */}
          <div>
            {/* Version pill */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-xs font-black tracking-widest uppercase"
              style={{
                background: "#000",
                color: "#00ff88",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 0.6s",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#00ff88", boxShadow: "0 0 6px #00ff88" }}
              />
              Version 3.1 — Now Shipped
            </div>

            {/* Headline */}
            <h1
              className="font-black leading-none mb-6 select-none"
              style={{
                fontSize: "clamp(3.5rem, 8vw, 7rem)",
                letterSpacing: "-0.03em",
                fontFamily: "'Courier New', monospace",
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(32px)",
                transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              Code
              <br />
              <span style={{ color: "#000", WebkitTextStroke: "2px #000" }}>Aura</span>
              <span
                className="inline-block ml-3 align-middle text-4xl"
                style={{ color: "#00ff88" }}
              >
                ⚡
              </span>
            </h1>

            {/* Tagline */}
            <p
              className="text-lg font-medium leading-relaxed mb-8 max-w-md"
              style={{
                color: "#444",
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.8s 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              Hybrid BM25 + semantic code search with parent-document retrieval,
              parallel indexing, and AI-powered explanations. Built for developer
              velocity at scale.
            </p>

            {/* CTA row */}
            <div
              className="flex flex-wrap gap-4 mb-12"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(16px)",
                transition: "all 0.8s 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <a
                href="https://www.npmjs.com/package/code-aura"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 font-black text-sm transition-all duration-200 hover:scale-105 hover:opacity-90"
                style={{ background: "#00ff88", color: "#000" }}
              >
                <span>npm install -g code-aura</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="https://github.com/harjas-romana/codeAura"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 font-black text-sm border-2 border-black transition-all duration-200 hover:bg-black hover:text-white"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>

            {/* Stats strip */}
            <div
              className="grid grid-cols-4 border-t-2 border-black pt-6 gap-6"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: "opacity 0.8s 0.5s",
              }}
            >
              {statItems.map((s) => (
                <div key={s.val}>
                  <div
                    className="font-black text-2xl"
                    style={{ fontFamily: "'Courier New', monospace", color: "#00ff88",
                      textShadow: "0 0 20px rgba(0,255,136,0.3)" }}
                  >
                    {s.val}
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Terminal ── */}
          <div
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
              transition: "all 0.9s 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              className="rounded-none border-2 border-black overflow-hidden shadow-2xl"
              style={{ background: "#0a0a0a" }}
            >
              {/* Terminal chrome */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "#1a1a1a", background: "#111" }}
              >
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
                </div>
                <span className="font-mono text-xs" style={{ color: "#555" }}>
                  code-aura v3
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5"
                  style={{ background: "#00ff88", color: "#000" }}
                >
                  LIVE
                </span>
              </div>

              {/* Terminal body */}
              <div className="p-5 space-y-1.5 min-h-64">
                {TERMINAL_LINES.map((line, i) => (
                  <TerminalLine key={i} line={line} visible={shownLines.includes(i)} />
                ))}
                {/* Blinking cursor */}
                <div
                  className="font-mono text-xs"
                  style={{
                    color: "#00ff88",
                    animation: "blink 1s steps(2, start) infinite",
                    opacity: shownLines.length === TERMINAL_LINES.length ? 1 : 0,
                  }}
                >
                  $ ▌
                </div>
              </div>
            </div>

            {/* Below terminal: badge row */}
            <div className="flex flex-wrap gap-2 mt-4">
              {["Hybrid Search","Parent-Doc Retrieval","Parallel Index","BM25+RRF","Watch Mode","Chat Mode"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-bold px-3 py-1 border border-black"
                  style={{ fontFamily: "'Courier New', monospace" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
};

export default Hero;