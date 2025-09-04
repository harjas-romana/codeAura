import { useEffect, useState, useRef } from "react";

const Hero = () => {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onScroll = () => {
      const scrollPosition = window.scrollY;
      setScrollY(scrollPosition);
    };
    
    const onMouseMove = (e: { clientX: number; clientY: number; }) => {
      setMousePosition({ 
        x: (e.clientX - window.innerWidth / 2) / 25,
        y: (e.clientY - window.innerHeight / 2) / 25
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);


  const scale = Math.max(1 - scrollY / 1000, 0.7);
  const opacity = Math.max(1 - scrollY / 600, 0);
  const translateY = scrollY * 0.5;
  const codeAuraTranslateY = scrollY * 0.3;
  const featureTranslateY = scrollY * 0.4;

  return (
    <section
      ref={heroRef}
      className="relative h-screen flex flex-col items-center justify-center bg-white text-gray-900 px-8 text-center overflow-hidden"
    >
      <div 
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-5 bg-gray-900"
        style={{ 
          transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5 + translateY * 0.2}px)` 
        }}
      ></div>
      <div 
        className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full opacity-5 bg-gray-900"
        style={{ 
          transform: `translate(${-mousePosition.x * 0.3}px, ${-mousePosition.y * 0.3 + translateY * 0.15}px)` 
        }}
      ></div>
      
      <div
        className="max-w-5xl transition-transform duration-75 ease-out"
        style={{ 
          transform: `scale(${scale}) translateY(${translateY}px)`,
          opacity 
        }}
      >
        <h1 
          className="outfit-main text-7xl md:text-8xl mb-6 leading-tight select-none"
          style={{ transform: `translateY(${-codeAuraTranslateY}px)` }}
        >
          CodeAura
        </h1>
        
        <p className="text-2xl font-light mb-8 max-w-3xl mx-auto leading-relaxed">
          The complete developer ecosystem that transforms how you code, collaborate, and create.
        </p>
        
        <div 
          className="flex flex-col sm:flex-row justify-center gap-6 max-w-md mx-auto mb-12"
          style={{ transform: `translateY(${-featureTranslateY}px)` }}
        >
          <a
            href="#features"
            className="inline-block bg-gray-900 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:bg-gray-800 transition select-none"
          >
            Explore Features
          </a>
          <a
            href="#get-started"
            className="inline-block border-2 border-gray-900 text-gray-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition select-none"
          >
            Get Started
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-16">
          <div 
            className="p-6 rounded-lg border border-gray-100 shadow-sm"
            style={{ transform: `translateY(${-translateY * 0.2}px)` }}
          >
            <h3 className="text-lg font-semibold mb-2">Intelligent Code Assist</h3>
            <p className="text-sm text-gray-600">AI-powered suggestions that understand your codebase and style.</p>
          </div>
          <div 
            className="p-6 rounded-lg border border-gray-100 shadow-sm"
            style={{ transform: `translateY(${-translateY * 0.15}px)` }}
          >
            <h3 className="text-lg font-semibold mb-2">Seamless Collaboration</h3>
            <p className="text-sm text-gray-600">Real-time code sharing and review tools for distributed teams.</p>
          </div>
          <div 
            className="p-6 rounded-lg border border-gray-100 shadow-sm"
            style={{ transform: `translateY(${-translateY * 0.1}px)` }}
          >
            <h3 className="text-lg font-semibold mb-2">Performance Analytics</h3>
            <p className="text-sm text-gray-600">Track and optimize your code performance with detailed insights.</p>
          </div>
        </div>
        
        <p className="mt-16 text-sm font-light text-gray-600 max-w-2xl mx-auto">
          Trusted by developers at Google, Microsoft, and innovative startups worldwide to accelerate development cycles and deliver exceptional code.
        </p>
      </div>
      
      <div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
        style={{ opacity: Math.max(1 - scrollY / 200, 0) }}
      >
        <span className="text-xs text-gray-500 mb-2">Scroll to explore</span>
        <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-bounce"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;