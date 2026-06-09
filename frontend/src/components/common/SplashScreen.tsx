import { useEffect, useState } from "react";
import arbitrumIcon from "@/assets/arbitrum-mark-hex.png";

type SplashScreenProps = {
  appName?: string;
  onFinish: () => void;
};

export function SplashScreen({ appName = "ARBITRUM", onFinish }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit transition after 2.8s
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2800);

    // Call onFinish after 3.3s (exit transition takes 500ms)
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3300);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <>
      <style>{`
        /* CSS Animations  Splash Screen */
        
        .splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, #091535 0%, #020716 100%);
          overflow: hidden;
          transition: opacity 500ms cubic-bezier(0.25, 1, 0.5, 1), transform 500ms cubic-bezier(0.25, 1, 0.5, 1), filter 500ms ease;
        }

        .splash-overlay.exiting {
          opacity: 0;
          transform: scale(1.06);
          filter: blur(8px);
          pointer-events: none;
        }

        /* Cinematic Background Particles */
        .ambient-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(40px);
          animation: pulseGlow 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 0.4; }
        }

        /* Logo badge container */
        .logo-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 140px;
          height: 140px;
          margin-bottom: 24px;
          animation: logoSpring 1000ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }

        @keyframes logoSpring {
          0% {
            transform: scale(0.3) rotate(-15deg);
            opacity: 0;
          }
          70% {
            transform: scale(1.15) rotate(5deg);
            opacity: 0.9;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        /* Inner rotating scanner (sweep gradient effect) */
        .circle-scanner {
          position: absolute;
          width: 102px;
          height: 102px;
          border-radius: 26px;
          background: conic-gradient(from 0deg, transparent 30%, rgba(34, 211, 238, 0.2) 60%, rgba(34, 211, 238, 0.8) 90%, #22d3ee 100%);
          z-index: 8;
          animation: rotateScanner 2.2s linear infinite, scannerEntrance 1000ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
          filter: blur(6px);
        }

        /* Outer rotating scanner (reverse direction) */
        .circle-scanner-outer {
          position: absolute;
          width: 112px;
          height: 112px;
          border-radius: 29px;
          background: conic-gradient(from 180deg, transparent 40%, rgba(59, 130, 246, 0.1) 70%, rgba(59, 130, 246, 0.6) 95%, #3b82f6 100%);
          z-index: 7;
          animation: rotateScannerReverse 3s linear infinite, scannerEntrance 1000ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
          filter: blur(12px);
        }

        @keyframes rotateScanner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes rotateScannerReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes scannerEntrance {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* Inner logo circle */
        .logo-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 90px;
          height: 90px;
          border-radius: 22px;
          background: linear-gradient(135deg, #051949 0%, #030e28 100%);
          border: 2px solid rgba(34, 211, 238, 0.4);
          box-shadow: 
            0 0 20px rgba(34, 211, 238, 0.35),
            0 0 40px rgba(59, 130, 246, 0.2),
            inset 0 0 12px rgba(34, 211, 238, 0.2);
          z-index: 10;
          position: relative;
        }

        .logo-img {
          width: 72%;
          height: 72%;
          object-fit: contain;
          filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6));
          animation: logoShine 2.5s ease-in-out infinite;
        }

        @keyframes logoShine {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.5)) brightness(1); }
          50% { filter: drop-shadow(0 0 18px rgba(34, 211, 238, 0.8)) brightness(1.2); }
        }

        /* Brand text container */
        .brand-text-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 10px;
          opacity: 0;
          transform: translateY(12px);
          animation: textReveal 1000ms cubic-bezier(0.22, 1, 0.36, 1) 1200ms forwards;
        }

        @keyframes textReveal {
          0% {
            opacity: 0;
            transform: translateY(12px);
            letter-spacing: 0.1em;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: 0.38em;
          }
        }

        /* Shiny Metallic Text style */
        .brand-text {
          font-size: 2.2rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #ffffff;
          background: linear-gradient(
            to right,
            #ffffff 20%,
            #22d3ee 40%,
            #3b82f6 60%,
            #ffffff 80%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shineText 3s linear infinite;
          text-shadow: 0 4px 15px rgba(34, 211, 238, 0.2);
        }

        @keyframes shineText {
          to { background-position: 200% center; }
        }

        /* Subtitle style */
        .brand-subtitle {
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.55em;
          color: rgba(148, 163, 184, 0.7);
          text-transform: uppercase;
          margin-top: 6px;
          text-indent: 0.55em;
        }
      `}</style>

      <div className={`splash-overlay ${isExiting ? "exiting" : ""}`}>
        <div className="ambient-glow" />
        
        {/* Center Logo Group */}
        <div className="logo-container">
          {/* Rotating sweep scanners (circle backgrounds rotating) */}
          <div className="circle-scanner" />
          <div className="circle-scanner-outer" />

          {/* Actual Badge */}
          <div className="logo-badge">
            <img
              alt="Logo"
              className="logo-img"
              src={arbitrumIcon}
            />
          </div>
        </div>

        {/* Brand Text Group */}
        <div className="brand-text-container">
          <h1 className="brand-text">{appName}</h1>
          <span className="brand-subtitle">Decentralized Platform</span>
        </div>
      </div>
    </>
  );
}
