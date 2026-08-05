"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronDown,
  FileText,
  GitCompareArrows,
  LifeBuoy,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { marketingNav } from "@/lib/brand";

const explore = [
  {
    label: "Intercom bill calculator",
    copy: "Estimate seats, AI resolutions, and annual savings.",
    href: "/pricing#calculator",
    icon: Calculator,
  },
  {
    label: "Product demo",
    copy: "Use the inbox, Arlo, knowledge, and reports.",
    href: "/demo",
    icon: Play,
  },
  {
    label: "Compare platforms",
    copy: "See the commercial and operational differences.",
    href: "/compare/intercom",
    icon: GitCompareArrows,
  },
];

const learn = [
  { label: "Resource library", href: "/resources", icon: BookOpen },
  { label: "Field notes", href: "/blog", icon: FileText },
  { label: "Use cases", href: "/use-cases", icon: Sparkles },
  { label: "Help center", href: "/help", icon: LifeBuoy },
  { label: "FAQ", href: "/faq", icon: FileText },
  { label: "Security", href: "/security", icon: ShieldCheck },
];

export function Header() {
  const { scrollY } = useScroll();
  const shellRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (value) => setScrolled(value > 28));

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node))
        setResourcesOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5"
    >
      <div ref={shellRef} className="relative mx-auto max-w-[1400px]">
        <motion.div
          initial={{ maxWidth: 1400 }}
          animate={{
            maxWidth: scrolled ? 1280 : 1400,
            boxShadow: scrolled
              ? "0 24px 70px rgba(18,22,33,.19)"
              : "0 14px 44px rgba(18,22,33,.13)",
            borderColor: scrolled ? "rgba(16,17,20,.17)" : "rgba(16,17,20,.11)",
          }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="glass relative z-20 mx-auto flex h-16 items-center justify-between rounded-[8px] border px-4 md:px-5"
        >
          <div className="flex items-center gap-2.5">
            <Logo />
            <a
              href="https://resolutexhq.com"
              target="_blank"
              rel="noreferrer"
              className="hidden border-l border-black/9 pl-2.5 text-[7px] font-medium tracking-[.02em] text-[#a0a3aa] transition hover:text-[#30333a] xl:block"
            >
              by ResoluteX
            </a>
          </div>
          <nav
            className="hidden items-center gap-6 lg:flex"
            aria-label="Primary navigation"
          >
            {marketingNav.slice(0, 4).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-[#505662] transition-colors hover:text-[#101114]"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setResourcesOpen((value) => !value)}
              className="flex items-center gap-1.5 text-sm font-medium text-[#505662] transition hover:text-[#101114]"
              aria-expanded={resourcesOpen}
            >
              Resources{" "}
              <ChevronDown
                size={14}
                className={
                  resourcesOpen ? "rotate-180 transition" : "transition"
                }
              />
            </button>
            <Link
              href="/about"
              className="text-sm font-medium text-[#505662] transition-colors hover:text-[#101114]"
            >
              About
            </Link>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="flex h-10 items-center px-4 text-sm font-semibold text-[#343944] hover:text-black"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="button-bright flex h-10 items-center gap-2 rounded-[6px] bg-[#ff5c35] px-4 text-sm font-semibold text-white"
            >
              Start free <ArrowRight size={15} />
            </Link>
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-[6px] border border-black/12 bg-white md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close navigation" : "Open navigation"}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </motion.div>

        <AnimatePresence>
          {resourcesOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 top-[72px] z-10 hidden w-[min(1040px,calc(100vw-3rem))] -translate-x-1/2 overflow-hidden rounded-[8px] border border-black/10 bg-white shadow-[0_32px_85px_rgba(25,30,42,.2)] lg:block"
            >
              <div className="grid grid-cols-[1.15fr_.85fr]">
                <div className="border-r border-black/8 p-7">
                  <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9398a2]">
                    Explore
                  </div>
                  <div className="mt-4 grid gap-2">
                    {explore.map(({ label, copy, href, icon: Icon }) => (
                      <Link
                        key={label}
                        href={href}
                        onClick={() => setResourcesOpen(false)}
                        className="group flex gap-4 rounded-[6px] p-3 transition hover:bg-[#f3f4f6]"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-[6px] bg-[#101114] text-[#d8ff70]">
                          <Icon size={18} />
                        </span>
                        <span>
                          <b className="block text-sm">{label}</b>
                          <span className="mt-1 block text-xs leading-relaxed text-[#767b85]">
                            {copy}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="p-7">
                  <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9398a2]">
                    Learn
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-1">
                    {learn.map(({ label, href, icon: Icon }) => (
                      <Link
                        key={label}
                        href={href}
                        onClick={() => setResourcesOpen(false)}
                        className="flex items-center gap-2 rounded-[5px] px-3 py-3 text-sm font-medium transition hover:bg-[#f3f4f6]"
                      >
                        <Icon size={15} className="text-[#ff5c35]" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                href="/resources#ai-resolution"
                onClick={() => setResourcesOpen(false)}
                className="flex items-center justify-between border-t border-black/8 bg-[#f6f5f1] px-7 py-4 text-xs font-semibold"
              >
                <span>
                  <b className="mr-3 text-[#ff5c35]">From the guide</b> How AI
                  resolution pricing actually works
                </span>
                <ArrowRight size={15} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glass mx-auto mt-2 max-w-[1400px] rounded-[8px] border border-black/10 p-3 shadow-xl md:hidden"
          >
            {[
              ...marketingNav,
              { label: "Resources", href: "/resources" },
              { label: "Field notes", href: "/blog" },
              { label: "FAQ", href: "/faq" },
            ]
              .filter(
                (item, index, list) =>
                  list.findIndex(
                    (candidate) => candidate.label === item.label,
                  ) === index,
              )
              .map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-black/7 px-3 py-3 text-sm font-medium"
                >
                  {item.label}
                </Link>
              ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                className="grid h-11 place-items-center rounded-[6px] border border-black/12 text-sm font-semibold"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="grid h-11 place-items-center rounded-[6px] bg-[#ff5c35] text-sm font-semibold text-white"
              >
                Start free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
