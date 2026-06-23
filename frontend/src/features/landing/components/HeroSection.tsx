import { Link } from "react-router-dom";
import heroBannerImage from "@/assets/hero banner.png";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-[#030b25] via-[#08153e] to-[#02091d] p-4 shadow-[0_30px_80px_-35px_rgba(34,211,238,0.55)] sm:p-6 md:p-10"
      id="home"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="grid items-center gap-5 md:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="order-1 relative overflow-hidden rounded-xl border border-cyan-400/20 bg-[#020b24]/75 p-4 sm:p-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
          <div aria-hidden className="hero-mobile-portal hero-portal-scene lg:hidden">
            <div className="hero-portal-aura animate-pulse-soft absolute inset-0 rounded-xl bg-cyan-500/20 blur-2xl" />
            <img
              alt=""
              className="hero-mobile-portal-image hero-portal-image-main"
              src={heroBannerImage}
            />
            <div className="hero-mobile-portal-overlay" />
            <span className="hero-portal-particle hero-portal-particle-1" />
            <span className="hero-portal-particle hero-portal-particle-2" />
            <span className="hero-portal-particle hero-portal-particle-3" />
            <span className="hero-portal-particle hero-portal-particle-4" />
          </div>

          <div className="relative z-10">
            <h1 className="premium-hero-title hero-title-kinetic max-w-2xl text-[1.9rem] font-extrabold leading-[1.12] sm:text-4xl md:text-5xl">
              The Next Generation Asset Under Management Infrastructure Ecosystem{" "}
              <span className="premium-hero-accent bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                - Arbitrum
              </span>
            </h1>
            <p className="premium-body-copy hero-copy-kinetic mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:mt-4 md:text-base">
              Join a transparent and secure earning ecosystem built on Arbitrum blockchain infrastructure. Build, secure and automate digital asset solutions at scale. Monitor teams, monitor wallet flows and scale your earnings with confidence.
            </p>
            <div className="animate-fade-up-soft mt-5 flex flex-wrap items-center gap-2.5 [animation-delay:120ms] md:mt-6 md:gap-3">
              <Button asChild className="bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 hover:opacity-90">
                <Link to="/register">Get Started</Link>
              </Button>
              <Button
                asChild
                className="border border-cyan-300/40 bg-transparent text-cyan-100 hover:bg-cyan-300/10 hover:text-white"
                variant="outline"
              >
                <Link to="/login">Open Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="hero-portal-wrap hero-portal-scene hover-lift order-2 relative mx-auto hidden w-full max-w-[24rem] overflow-hidden lg:block lg:max-w-none lg:overflow-visible">
          <div className="hero-portal-aura animate-pulse-soft absolute inset-0 rounded-xl bg-cyan-500/20 blur-2xl" />
          <span className="hero-portal-particle hero-portal-particle-1" />
          <span className="hero-portal-particle hero-portal-particle-2" />
          <span className="hero-portal-particle hero-portal-particle-3" />
          <span className="hero-portal-particle hero-portal-particle-4" />
          <div className="relative overflow-hidden rounded-xl border border-cyan-400/30 bg-slate-950/70 p-1">
            <img
              alt="Arbitrum hero banner"
              className="hero-portal-image-main h-[220px] w-full rounded-lg object-cover sm:h-[310px] lg:h-[420px]"
              src={heroBannerImage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
