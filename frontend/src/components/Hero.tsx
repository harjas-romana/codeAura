import { useRef, useEffect, useState } from "react";

const Hero = () => {
  const heroRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // Clean up animation when component unmounts
    return () => setIsVisible(false);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col items-center justify-center bg-white text-black px-8 text-center overflow-hidden"
    >
      {/* Animated Background - Enhanced Techie Grid Pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Multi-layered Grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            animation: "gridMove 15s linear infinite",
          }}
        ></div>
        
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            animation: "gridMoveReverse 25s linear infinite",
          }}
        ></div>

        {/* Floating Binary Particles with infinite animation */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute text-black opacity-20 font-mono text-xs select-none"
            style={{
              left: `${Math.random() * 90}%`,
              top: `${Math.random() * 90}%`,
              animation: `floatBinary ${8 + (i % 7)}s ease-in-out infinite ${i * 0.3}s, pulse ${3 + (i % 4)}s ease-in-out infinite ${i * 0.2}s`,
            }}
          >
            {Math.random() > 0.5 ? "1" : "0"}
          </div>
        ))}

        {/* Animated Code Blocks with continuous movement */}
        <div className="absolute top-20 left-10 opacity-5 font-mono text-sm transform -rotate-12 animate-pulse" style={{animation: 'drift 30s linear infinite'}}>
          <div>{`const innovate = () => {`}</div>
          <div>&nbsp;&nbsp;return breakthrough;</div>
          <div>{`};`}</div>
        </div>

        <div className="absolute bottom-32 right-16 opacity-5 font-mono text-sm transform rotate-12" style={{animation: 'driftReverse 35s linear infinite'}}>
          <div>{`if (developer.isAwesome) {`}</div>
          <div>&nbsp;&nbsp;buildAmazingThings();</div>
          <div>{`}`}</div>
        </div>

        {/* Animated Circuit Lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          style={{ animation: "circuitPulse 6s ease-in-out infinite" }}
        >
          <path
            d="M100,200 Q300,100 500,200 T900,200"
            stroke="black"
            strokeWidth="1"
            fill="none"
            strokeDasharray="5,5"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;20;0"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M200,400 Q400,300 600,400 T1000,400"
            stroke="black"
            strokeWidth="1"
            fill="none"
            strokeDasharray="3,7"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="10;0;10"
              dur="4s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M50,500 Q250,350 700,550 T1200,500"
            stroke="black"
            strokeWidth="1"
            fill="none"
            strokeDasharray="4,6"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="5;15;5"
              dur="5s"
              repeatCount="indefinite"
            />
          </path>
        </svg>

        {/* Animated Terminal Cursor */}
        <div className="absolute bottom-10 right-10 opacity-30 font-mono text-lg" style={{animation: 'blink 1.5s steps(2, start) infinite'}}>
          ▋
        </div>
        
        {/* Pulsing Circles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full border border-black opacity-5" style={{animation: 'pulseCircle 8s ease-in-out infinite'}}></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full border border-black opacity-5" style={{animation: 'pulseCircle 12s ease-in-out infinite reverse'}}></div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
        
        @keyframes gridMoveReverse {
          0% { transform: translate(40px, 40px); }
          100% { transform: translate(0, 0); }
        }
        
        @keyframes floatBinary {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          25% { transform: translateY(-20px) rotate(90deg) scale(1.2); }
          50% { transform: translateY(-35px) rotate(180deg) scale(1); }
          75% { transform: translateY(-15px) rotate(270deg) scale(1.1); }
        }
        
        @keyframes circuitPulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.15; }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.3; }
        }
        
        @keyframes drift {
          0% { transform: translateX(0) translateY(0) rotate(-12deg); }
          33% { transform: translateX(30px) translateY(20px) rotate(-10deg); }
          66% { transform: translateX(-20px) translateY(40px) rotate(-14deg); }
          100% { transform: translateX(0) translateY(0) rotate(-12deg); }
        }
        
        @keyframes driftReverse {
          0% { transform: translateX(0) translateY(0) rotate(12deg); }
          33% { transform: translateX(-30px) translateY(-20px) rotate(10deg); }
          66% { transform: translateX(20px) translateY(-40px) rotate(14deg); }
          100% { transform: translateX(0) translateY(0) rotate(12deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes pulseCircle {
          0%, 100% { transform: scale(1); opacity: 0.03; }
          50% { transform: scale(1.2); opacity: 0.08; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-fade-in-scale {
          animation: fadeInScale 0.8s ease-out forwards;
        }
      `}</style>

      {/* Title with enhanced animation */}
      <h1 className={`text-6xl md:text-8xl font-bold mb-6 select-none relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-20'}`}>
        <span className="inline-block relative">
          <span className=" raleway-main relative z-10">CodeAura</span>
          <span className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent via-black opacity-10 w-0 animate-[pulseGlow_3s_ease-in-out_infinite]"></span>
        </span>
      </h1>

      {/* Subtitle */}
      <div className="overflow-hidden max-w-2xl mx-auto">
        <p className={`text-lg md:text-xl font-light mb-8 leading-relaxed relative z-10 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'}`}>
          A powerful CLI tool for semantic code search and exploration using AI-powered embeddings and GROQ's lightning-fast inference.
        </p>
      </div>

      {/* Badges with staggered animation */}
      <div className="flex flex-wrap justify-center gap-4 mb-12 relative z-10">
        {[
          "https://img.shields.io/badge/Code-Aura-black?style=for-the-badge&logo=ghost&logoColor=white",
          "https://img.shields.io/badge/Node.js-18+-black?style=for-the-badge&logo=nodedotjs",
          "https://img.shields.io/badge/GROQ-API-black?style=for-the-badge&logo=groq"
        ].map((src, index) => (
          <div 
            key={index}
            className={`transition-all duration-700 delay-${index * 200} ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'} hover:animate-pulse`}
          >
            <img
              src={src}
              alt="Badge"
              className="h-8 transition-transform duration-300 hover:scale-110"
            />
          </div>
        ))}
      </div>

      {/* Features with enhanced animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto text-left relative z-10">
        {[
          {
            title: "Semantic Code Search",
            description: "Find code using natural language queries.",
            animationDelay: 0
          },
          {
            title: "AI-Powered Explanations",
            description: "Get detailed explanations of code snippets.",
            animationDelay: 100
          },
          {
            title: "Visualization",
            description: "Generate HTML and image visualizations of search results.",
            animationDelay: 200
          },
          {
            title: "Multi-language Support",
            description: "Works with JavaScript, TypeScript, Python, Java, C++, and more.",
            animationDelay: 300
          },
          {
            title: "Smart Chunking",
            description: "Intelligent code splitting for better search results.",
            animationDelay: 400
          }
        ].map((feature, index) => (
          <div 
            key={index}
            className={`p-6 border border-gray-800 rounded-lg bg-white transition-all duration-500 delay-${feature.animationDelay} ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'} hover:scale-[1.02] hover:shadow-lg hover:border-black group`}
            style={{ animation: `pulseShadow 4s ease-in-out infinite ${index * 0.5}s` }}
          >
            <h3 className="text-lg font-semibold mb-2 group-hover:text-gray-800 transition-colors duration-300">{feature.title}</h3>
            <p className="text-sm text-gray-700 group-hover:text-gray-600 transition-colors duration-300">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Subtle animated divider */}
      <div className="w-48 h-px bg-gradient-to-r from-transparent via-black to-transparent my-12 animate-pulse"></div>
      
      {/* Additional style for continuous animations */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { width: 0; left: 0; }
          50% { width: 100%; left: 0; }
        }
        
        @keyframes pulseShadow {
          0%, 100% { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02); }
          50% { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03); }
        }
      `}</style>
    </section>
  );
};

export default Hero;