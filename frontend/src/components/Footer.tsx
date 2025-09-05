import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white text-gray-800 py-6 text-center font-light text-sm">
      <div>
        © {new Date().getFullYear()} Code Aura. All rights reserved.
      </div>
      <div className="mt-1">
        {/* <a
          href="https://github.com/harjas-romana/codeAura"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          GitHub Repository
        </a>{' '}
        |{' '}
        <a
          href="https://www.npmjs.com/package/code-aura"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          npm Package
        </a> */}
      </div>
      <div className="mt-1 font-extrabold text-gray-500">
        MIT Licensed
      </div>
    </footer>
  );
};

export default Footer;
