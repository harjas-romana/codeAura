import { motion } from 'framer-motion';

const Contact = () => {
  return (
    <section id="contact" className="py-16 bg-white px-6">
      <div className="container mx-auto max-w-4xl">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Get in Touch</h2>
          <p className="text-gray-600 mb-8">Connect with us and contribute to the project</p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12.713l-11.985-9.713h23.97l-11.985 9.713zm0 2.574l-12-9.725v15.438h24v-15.438l-12 9.725z"/>
              </svg>
            </div>
            <a 
              href="mailto:harjas42@icloud.com" 
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
            >
              harjas42@icloud.com
            </a>
          </motion.div>

          {/* GitHub */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <a 
              href="https://github.com/harjas-romana/codeAura" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
            >
              GitHub Repository
            </a>
          </motion.div>

          {/* npm */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 p-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zm-12-4v1.333h-2.669v-1.333H10.668z"/>
              </svg>
            </div>
            <a 
              href="https://www.npmjs.com/package/code-aura" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-red-600 transition-colors font-medium"
            >
              npm Package
            </a>
          </motion.div>
        </div>

        {/* Contributions Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-600 italic text-lg">
            Contributions are welcome.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;