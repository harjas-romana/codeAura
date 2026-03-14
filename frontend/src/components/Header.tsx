import { useState, useEffect } from "react";
import logo from "../assets/logo.png";
const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full transition-all duration-300"
      style={{
        background: scrolled ? "#000" : "transparent",
        borderBottom: scrolled ? "1px solid #1a1a1a" : "1px solid transparent",
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <img
            src={logo}
            alt="CodeAura Logo"
            style={{ height: 36 }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'IMG';
            }}
          />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {["Home", "Tool", "About"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-semibold tracking-widest uppercase transition-colors duration-200 hover:text-green-400"
              style={{
                color: scrolled ? "#888" : "#444",
                letterSpacing: "0.1em",
              }}
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://github.com/harjas-romana/codeAura"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold px-4 py-2 border transition-all duration-200 hover:bg-white hover:text-black"
            style={{
              borderColor: scrolled ? "#444" : "#999",
              color: scrolled ? "#888" : "#444",
            }}
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/code-aura"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-black px-4 py-2 transition-all duration-200 hover:opacity-80"
            style={{ background: "#00ff88", color: "#000" }}
          >
            npm install
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className="w-6 h-0.5 block transition-all duration-300"
            style={{
              background: scrolled ? "#fff" : "#000",
              transform: menuOpen ? "rotate(45deg) translate(3px, 3px)" : "",
            }}
          />
          <span
            className="w-6 h-0.5 block transition-all duration-300"
            style={{
              background: scrolled ? "#fff" : "#000",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="w-6 h-0.5 block transition-all duration-300"
            style={{
              background: scrolled ? "#fff" : "#000",
              transform: menuOpen ? "rotate(-45deg) translate(3px, -3px)" : "",
            }}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-6 py-6 space-y-4"
          style={{ background: "#000", borderColor: "#1a1a1a" }}
        >
          {["Home", "Tool", "About"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="block text-sm font-bold tracking-widest uppercase text-gray-400 hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <a
            href="https://www.npmjs.com/package/code-aura"
            className="block text-sm font-black px-4 py-2 text-center mt-4"
            style={{ background: "#00ff88", color: "#000" }}
          >
            npm install
          </a>
        </div>
      )}
    </header>
  );
};

export default Header;