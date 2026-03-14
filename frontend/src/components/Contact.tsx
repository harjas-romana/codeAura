import { motion } from 'framer-motion';
import { Envelope, GithubLogo, Package, ArrowRight } from '@phosphor-icons/react';

const CONTACTS = [
  {
    id: 'email',
    channel: 'email',
    label: 'DIRECT MAIL',
    value: 'harjas42@icloud.com',
    href: 'mailto:harjas42@icloud.com',
    external: false,
    icon: <Envelope weight="duotone" className="w-6 h-6" />,
    meta: 'response &lt; 48h',
  },
  {
    id: 'github',
    channel: 'github',
    label: 'SOURCE REPO',
    value: 'harjas-romana/codeAura',
    href: 'https://github.com/harjas-romana/codeAura',
    external: true,
    icon: <GithubLogo weight="duotone" className="w-6 h-6" />,
    meta: 'PRs welcome',
  },
  {
    id: 'npm',
    channel: 'npm',
    label: 'PACKAGE REGISTRY',
    value: 'code-aura',
    href: 'https://www.npmjs.com/package/code-aura',
    external: true,
    icon: <Package weight="duotone" className="w-6 h-6" />,
    meta: 'v3.1.0 live',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const Contact = () => {
  return (
    <section
      id="contact"
      className="relative bg-black py-24 px-6 overflow-hidden border-t border-white/10"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* Subtle scan-line grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 23px, #00ff88 24px)',
        }}
      />
      
      <div className="relative container mx-auto max-w-5xl">
        {/* ── Section Header ── */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
        >
          {/* Terminal prompt label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#00ff88] text-xs tracking-[0.25em] uppercase">
              $ connect --open
            </span>
            <span
              className="inline-block w-2 h-4 bg-[#00ff88]"
              style={{ animation: 'blink 1.1s step-end infinite' }}
            />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-none">
            Get in Touch
          </h2>
          <div className="mt-3 h-px w-16 bg-[#00ff88]" />
          <p className="mt-4 text-white/40 text-sm tracking-widest uppercase">
            Reach out · Contribute · Collaborate
          </p>
        </motion.div>

        {/* ── Contact Cards ── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {CONTACTS.map((contact) => (
            <motion.div key={contact.id} variants={cardVariants} className="bg-black">
              <a
                href={contact.href}
                target={contact.external ? '_blank' : undefined}
                rel={contact.external ? 'noopener noreferrer' : undefined}
                className="group relative flex flex-col gap-5 p-8 h-full transition-colors duration-300 hover:bg-[#00ff88]"
              >
                {/* Channel tag */}
                <div className="flex items-center justify-between">
                  <span className="text-[14px] tracking-[0.3em] text-white/30 group-hover:text-black/60 transition-colors duration-300">
                    {`// ${contact.channel}`}
                  </span>
                  {/* Arrow indicator */}
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-black -translate-x-1 group-hover:translate-x-0 transition-all duration-300" />
                </div>
                
                {/* Icon */}
                <div className="w-12 h-12 flex items-center justify-center border border-white/20 group-hover:border-black rounded text-white group-hover:text-black transition-colors duration-300">
                  {contact.icon}
                </div>
                
                {/* Label + value */}
                <div>
                  <p className="text-[15px] tracking-[0.3em] text-white/40 group-hover:text-black/70 transition-colors duration-300">
                    {contact.label}
                  </p>
                  <p className="text-white group-hover:text-black font-bold text-sm break-all transition-colors duration-300">
                    {contact.value}
                  </p>
                </div>
                
                {/* Meta tag */}
                <div className="mt-auto pt-4 border-t border-white/10 group-hover:border-black/20 transition-colors duration-300">
                  <span
                    className="text-[13px] tracking-widest text-[#00ff88] group-hover:text-black transition-colors duration-300"
                    dangerouslySetInnerHTML={{ __html: contact.meta }}
                  />
                </div>
              </a>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Contributions Banner ── */}
        <motion.div
          className="mt-px bg-white/10 p-px"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="bg-black px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Pulsing green dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff88] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff88]" />
              </span>
              <p className="text-white/60 text-xs tracking-widest uppercase">
                Contributions are welcome — fork, improve, ship.
              </p>
            </div>
            
            <a
              href="https://github.com/harjas-romana/codeAura/fork"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 border border-white/20 px-6 py-3 text-white text-xs tracking-widest uppercase hover:bg-[#00ff88] hover:text-black hover:border-[#00ff88] transition-all duration-300"
            >
              Fork Repo
              <ArrowRight className="w-4 h-4 -translate-x-1 group-hover:translate-x-0 transition-transform duration-300" />
            </a>
          </div>
        </motion.div>
      </div>

      {/* Blink keyframe */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
};

export default Contact;