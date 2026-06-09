import { Link } from "react-router-dom";
import arbitrumIcon from "@/assets/arbitrum-mark-hex.png";
import type { PublicNavItem } from "./PublicNavbar";

type PublicFooterProps = {
  navItems: PublicNavItem[];
  onNavClick: (sectionId: string) => void;
};

export function PublicFooter({ navItems, onNavClick }: PublicFooterProps) {
  return (
    <footer className="border-t border-slate-800 bg-[#020817]">
      <div className="container py-8">
        <div className="grid items-start gap-8 md:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_minmax(220px,1fr)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-[#0a1631]">
              <img alt="Arbitrum icon" className="h-[70%] w-[70%] object-contain" src={arbitrumIcon} />
            </span>
            <p className="text-lg font-bold tracking-wide text-slate-100">ARBITRUM</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-100">Quick Links</p>
            <ul className="mt-2.5 space-y-1.5 text-sm">
              {navItems.map((item) => (
                <li key={item.id}>
                  <button
                    className="text-left text-slate-300 transition-colors hover:text-white"
                    onClick={() => onNavClick(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-100">More</p>
            <ul className="mt-2.5 space-y-1.5 text-sm">
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" to="/contact-us">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" to="/help-center">
                  Help Center
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" to="/privacy-policy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="text-slate-300 transition-colors hover:text-white" to="/terms-and-conditions">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container py-3 text-center text-xs text-slate-400">
          Copyright {new Date().getFullYear()} ARBITRUM. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
