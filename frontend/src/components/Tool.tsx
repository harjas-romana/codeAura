import { motion } from 'framer-motion';

const Tool = () => {
  const features = [
    {
      title: "Semantic Understanding",
      description: "Go beyond keywords with AI-powered code comprehension using GROQ's lightning-fast inference",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      title: "Multi-Language Support",
      description: "Works with JavaScript, TypeScript, Python, Java, C++, Ruby, Go, Rust, PHP, and C#",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      title: "CLI Power",
      description: "Command-line interface for seamless integration into your development workflow",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Visual Exploration",
      description: "Generate HTML and image visualizations of your search results",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      )
    },
    {
      title: "Natural Language Queries",
      description: "Ask questions about your codebase in plain English and get AI explanations",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    },
    {
      title: "Open Source",
      description: "Free to use, modify, and contribute to on GitHub",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    }
  ];

  return (
    <section id="download" className="py-20 bg-white px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Get Started with Code Aura</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            The powerful CLI tool for semantic code search and exploration
          </p>
          
          {/* Download Links */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <motion.a
              href="https://www.npmjs.com/package/code-aura"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0H1.763zm.862 2.707h19.75c.08 0 .145.064.145.143v3.32c0 .08-.065.144-.145.144H2.625a.144.144 0 01-.145-.144v-3.32c0-.079.065-.143.145-.143zm-.145 5.45v13.693c0 .08.065.144.145.144h19.75c.08 0 .145-.064.145-.144V8.157c0-.08-.065-.144-.145-.144H2.625a.144.144 0 00-.145.144zm5.012 2.502c0-.08.064-.144.144-.144h9.278c.08 0 .144.064.144.144v1.281c0 .08-.064.144-.144.144H7.596a.144.144 0 01-.144-.144v-1.281zm0 3.188c0-.08.064-.144.144-.144h9.278c.08 0 .144.064.144.144v1.281c0 .08-.064.144-.144.144H7.596a.144.144 0 01-.144-.144v-1.281z"/>
              </svg>
              Install via npm
            </motion.a>
            
            <motion.a
              href="https://github.com/harjas-romana/codeAura"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              View on GitHub
            </motion.a>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Quick Start</h3>
            <div className="text-left font-mono text-sm text-blue-700">
              <p className="mb-1"># Install globally via npm</p>
              <p className="mb-1">$ npm install -g code-aura</p>
              <p className="mb-1"># Or use with npx</p>
              <p className="mb-1">$ npx code-aura@latest setup ./your-project</p>
              <p>$ code-aura search</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-12">
          <motion.div 
            className="md:w-1/2"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <div className="bg-white rounded-2xl p-6 border border-gray-700 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Try It Out</h3>
              
              <div className="space-y-6">
  {/* Terminal Visualization */}
  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-hidden">
    <div className="flex items-center mb-4">
      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      <span className="ml-2 text-gray-400">terminal</span>
    </div>
    
    {/* Animated command lines */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="space-y-2"
    >
      <div className="flex items-center">
        <span className="text-blue-400">$ </span>
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: "auto" }}
          transition={{ duration: 1, delay: 1}}
          className="overflow-hidden whitespace-nowrap"
        >
          code-aura setup ./my-project
        </motion.span>
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.5, delay: 2 }}
          className="w-2 h-4 bg-green-400 ml-1"
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="text-gray-300"
      >
        ✓ Processed 142 code snippets from 23 files.
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
        className="flex items-center mt-4"
      >
        <span className="text-blue-400">$ </span>
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: "auto" }}
          transition={{ duration: 1, delay: 4 }}
          className="overflow-hidden whitespace-nowrap"
        >
          code-aura search
        </motion.span>
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, delay: 5 }}
          className="w-2 h-4 bg-green-400 ml-1"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 6 }}
        className="text-gray-300"
      >
        🔍 Enter your search query:
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 7 }}
        className="flex items-center"
      >
        <span className="text-blue-400"> </span>
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: "auto" }}
          transition={{ duration: 1.5, delay: 7.5 }}
          className="overflow-hidden whitespace-nowrap text-yellow-300"
        >
          "how to handle user authentication"
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 9 }}
        className="text-gray-300"
      >
        ✓ Found 5 relevant code snippets
      </motion.div>
    </motion.div>
  </div>

  {/* Feature Icons Grid */}
  <div className="grid grid-cols-2 gap-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 10 }}
      className="bg-gray-50 p-3 rounded-lg text-center"
    >
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <span className="text-xs text-gray-600">CLI Interface</span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 10.2 }}
      className="bg-gray-50 p-3 rounded-lg text-center"
    >
      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <span className="text-xs text-gray-600">AI Powered</span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 10.4 }}
      className="bg-gray-50 p-3 rounded-lg text-center"
    >
      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <span className="text-xs text-gray-600">Code Analysis</span>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 10.6 }}
      className="bg-gray-50 p-3 rounded-lg text-center"
    >
      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      </div>
      <span className="text-xs text-gray-600">Visualization</span>
    </motion.div>
  </div>

  {/* Quick Commands */}
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 11 }}
    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
  >
    <h4 className="font-semibold text-blue-800 mb-3 text-sm">Try These Commands:</h4>
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">code-aura setup ./project</code>
        <span className="text-blue-600">Process codebase</span>
      </div>
      <div className="flex items-center justify-between">
        <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">code-aura search</code>
        <span className="text-blue-600">Interactive search</span>
      </div>
      <div className="flex items-center justify-between">
        <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">code-aura explain file.js</code>
        <span className="text-blue-600">Get explanations</span>
      </div>
      <div className="flex items-center justify-between">
        <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded">code-aura html "query"</code>
        <span className="text-blue-600">Generate visuals</span>
      </div>
    </div>
  </motion.div>
</div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">CLI Commands</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-mono text-indigo-600">code-aura setup</span> - Process a codebase</p>
                  <p><span className="font-mono text-indigo-600">code-aura search</span> - Interactive search</p>
                  <p><span className="font-mono text-indigo-600">code-aura explain</span> - Get code explanations</p>
                  <p><span className="font-mono text-indigo-600">code-aura html</span> - Generate visualizations</p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="md:w-1/2"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Key Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex items-start mb-3">
                    <div className="bg-black bg-opacity-10 p-2 rounded-lg mr-3 text-black">
                      {feature.icon}
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">{feature.title}</h4>
                  </div>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Open Source & Free</h4>
              <p className="text-green-700 text-sm">
                Code Aura is completely free to use, modify, and contribute to. 
                Join our growing community of developers on GitHub!
              </p>
              <a
                href="https://github.com/harjas-romana/codeAura"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-green-600 hover:text-green-800 text-sm font-medium"
              >
                → Star us on GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Tool;