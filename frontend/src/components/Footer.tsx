import React from "react";
import logo from "../assets/logo.png";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  const links = [
    { label: "GitHub_Repo", href: "https://github.com/harjas-romana/codeAura" },
    { label: "npm_Package", href: "https://www.npmjs.com/package/code-aura" },
    { label: "Creator_Profile", href: "https://www.linkedin.com/in/harjas04" },
    { label: "Report_Issue", href: "https://github.com/harjas-romana/codeAura/issues" },
  ];

  const highlights = [
    "Hybrid BM25 + Semantic RRF",
    "Parent-Document Retrieval",
    "Parallel Incremental Indexing",
    "Chart.js Web Dashboard",
    "Codebase Chat Mode",
    "Watch Mode (hot-reload)",
  ];

  return (
    <footer className="bg-black border-t border-white/20 font-mono">
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

          {/* Brand - Takes up more space to mimic LangChain's wide layout */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <img
              src={logo}
              alt="CodeAura Logo"
              style={{ height: 100, width: 300 }}
              />
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-6 max-w-sm">
              Developer velocity engine. Hybrid semantic search for codebases of any size. Built for speed, precision, and local execution.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1.5 border border-white/20 text-white/40">
              <span className="w-2 h-2 rounded-full bg-white/40"></span>
              MIT Licensed
            </div>
          </div>

          {/* Empty spacer for grid alignment */}
          <div className="hidden md:block md:col-span-1"></div>

          {/* Links */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-bold tracking-widest uppercase mb-6 text-white">
              <span className="text-[#00ff88] mr-2">/</span>Directory
            </h3>
            <ul className="space-y-4">
              {links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors duration-200"
                  >
                    <span className="text-[#00ff88] opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200">
                      &gt;
                    </span>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* What's new */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-bold tracking-widest uppercase mb-6 text-white">
              <span className="text-[#00ff88] mr-2">/</span>v3_Sys_Log
            </h3>
            <ul className="space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/50">
                  <span className="text-[#00ff88] font-bold mt-[-1px]">
                    [x]
                  </span>
                  <span className="leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="border-t border-white/10 px-6 py-6 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Copyright */}
          <span className="text-xs text-white/40">
            © {year} Code Aura — Built by{" "}
            <a
              href="https://www.linkedin.com/in/harjas04"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-[#00ff88] transition-colors border-b border-white/20 hover:border-[#00ff88] pb-0.5"
            >
              Harjas Singh
            </a>
          </span>

          {/* System Status / Version */}
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/harjas-romana/codeAura"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.26.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 5.765-1.589 11.199-6.086 11.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              harjas-romana
            </a>
            
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]"></span>
              </span>
              SYS_ONLINE
            </div>

            <span className="text-xs font-bold text-white/20 bg-white/5 px-2 py-1">
              v3.1.0
            </span>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;