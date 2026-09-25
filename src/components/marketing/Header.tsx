"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import {
  ArrowRight,
  Blocks,
  BookOpen,
  Bot,
  Calculator,
  ChevronDown,
  FileText,
  GitCompareArrows,
  LifeBuoy,
  Menu,
  MessageCircle,
  PhoneCall,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { competitors } from "@/lib/competitors";

const productMenu = [
  {
    title: "AI workforce",
    items: [
      {
        label: "AI employees",
        copy: "Support, receptionist, sales and success roles that work 24/7.",
        href: "/#employees",
        icon: Bot,
      },
      {
        label: "Approvals & guardrails",
        copy: "Spend limits, confidence thresholds and a full audit log.",
        href: "/#guardrails",
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: "Channels",
    items: [
      {
        label: "Chat & website voice",
        copy: "A branded messenger visitors can type or talk to.",
        href: "/#widget",
        icon: MessageCircle,
      },
      {
        label: "AI phone agents",
        copy: "Answer calls on the number you already own.",
        href: "/#widget",
        icon: PhoneCall,
      },
      {
        label: "Knowledge & help center",
        copy: "Learn from your site and docs; publish on your domain.",
        href: "/#knowledge",
        icon: LifeBuoy,
      },
    ],
  },
  {
    title: "Revenue & operations",
    items: [
      {
        label: "Sales CRM",
        copy: "Pipeline, scoring, sequences and territories.",
        href: "/#crm",
        icon: Target,
      },
      {
        label: "Attention brief",
        copy: "Gmail, Slack and meetings triaged every morning.",
        href: "/#attention",
        icon: Sparkles,
      },
      {
        label: "Integrations",
        copy: "40+ apps with secure OAuth and approvals.",
        href: "/#integrations",
        icon: Blocks,
      },
    ],
  },
];

const learn = [
  { label: "Live demo", href: "/demo", icon: Play },
  { label: "Resource library", href: "/resources", icon: BookOpen },
  { label: "Field notes", href: "/blog", icon: FileText },
  { label: "Use cases", href: "/use-cases", icon: Sparkles },
  { label: "Help center", href: "/help", icon: LifeBuoy },
  { label: "FAQ", href: "/faq", icon: FileText },
  { label: "Security", href: "/security", icon: ShieldCheck },
  { label: "Bill calculator", href: "/pricing#calculator", icon: Calculator },
];

type Menu = "product" | "compare" | "resources";

export function Header() {
  const { scrollY } = useScroll();
  const shellRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenuState] = useState<Menu | null>(null);
  const menuScroll = useRef(0);
  const setMenu = (next: Menu | null) => {
    menuScroll.current = scrollY.get();
    setMenuState(next);
  };
  const closeMenu = () => setMenu(null);

  useMotionValueEvent(scrollY, "change", (value) => {
    setScrolled(value > 28);
    if (menu && Math.abs(value - menuScroll.current) > 80) setMenu(null);
  });

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) setMenuState(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuState(null);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
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
            {(
              [
                ["product", "Product"],
                ["compare", "Compare"],
              ] as const
            ).map(([key, label]) => (
              <MenuButton
                key={key}
                label={label}
                open={menu === key}
                onClick={() => setMenu(menu === key ? null : key)}
              />
            ))}
            <Link
              href="/pricing"
              className="text-sm font-medium text-[#505662] transition-colors hover:text-[#101114]"
            >
              Pricing
            </Link>
            <MenuButton
              label="Resources"
              open={menu === "resources"}
              onClick={() => setMenu(menu === "resources" ? null : "resources")}
            />
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
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
            className="grid size-10 place-items-center rounded-[6px] border border-black/12 bg-white lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close navigation" : "Open navigation"}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </motion.div>

        <AnimatePresence>
          {menu && (
            <motion.div
              key={menu}
              initial={{ opacity: 0, y: -10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 top-[72px] z-10 hidden w-[min(1080px,calc(100vw-3rem))] -translate-x-1/2 overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_32px_85px_rgba(25,30,42,.2)] lg:block"
            >
              {menu === "product" && (
                <div className="grid grid-cols-3 gap-2 p-5">
                  {productMenu.map((group) => (
                    <div key={group.title}>
                      <div className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[.14em] text-[#9398a2]">
                        {group.title}
                      </div>
                      {group.items.map(({ label, copy, href, icon: Icon }) => (
                        <Link
                          key={label}
                          href={href}
                          onClick={closeMenu}
                          className="group flex gap-3 rounded-[8px] p-3 transition hover:bg-[#f3f4f6]"
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[#101114] text-[#d8ff70]">
                            <Icon size={17} />
                          </span>
                          <span>
                            <b className="block text-sm">{label}</b>
                            <span className="mt-0.5 block text-[13px] leading-snug text-[#767b85]">
                              {copy}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {menu === "compare" && (
                <div className="grid grid-cols-[1fr_1fr_.8fr]">
                  {(["helpdesk", "chat", "crm", "voice"] as const)
                    .reduce<Array<Array<(typeof competitors)[number]>>>(
                      (columns, category, index) => {
                        const column = index < 2 ? 0 : 1;
                        columns[column].push(
                          ...competitors
                            .filter(
                              (item) =>
                                item.category === category && item.popular,
                            )
                            .slice(0, 4),
                        );
                        return columns;
                      },
                      [[], []],
                    )
                    .map((column, index) => (
                      <div key={index} className="p-5">
                        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#9398a2]">
                          {index === 0 ? "Help desks & chat" : "CRM & voice AI"}
                        </div>
                        {column.map((item) => (
                          <Link
                            key={item.slug}
                            href={`/compare/${item.slug}`}
                            onClick={closeMenu}
                            className="flex items-center justify-between rounded-[8px] px-3 py-2.5 text-sm font-medium transition hover:bg-[#f3f4f6]"
                          >
                            ResolveX vs {item.name}
                            <ArrowRight size={13} className="text-[#b0b3b9]" />
                          </Link>
                        ))}
                      </div>
                    ))}
                  <Link
                    href="/compare"
                    onClick={closeMenu}
                    className="flex flex-col justify-between bg-[#101114] p-6 text-white"
                  >
                    <GitCompareArrows className="text-[#d8ff70]" size={22} />
                    <span>
                      <b className="block text-lg">
                        {competitors.length} honest comparisons
                      </b>
                      <span className="mt-1 block text-[13px] leading-snug text-white/55">
                        Help desks, live chat, AI agents, CRMs and voice
                        platforms — including when they fit better.
                      </span>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#d8ff70]">
                        See all <ArrowRight size={14} />
                      </span>
                    </span>
                  </Link>
                </div>
              )}
              {menu === "resources" && (
                <div className="grid grid-cols-4 gap-1 p-5">
                  {learn.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 rounded-[8px] px-3 py-3 text-sm font-medium transition hover:bg-[#f3f4f6]"
                    >
                      <Icon size={16} className="text-[#ff5c35]" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
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
            className="glass mx-auto mt-2 max-h-[calc(100svh-6rem)] max-w-[1400px] overflow-y-auto rounded-[8px] border border-black/10 p-3 shadow-xl lg:hidden"
          >
            {[
              {
                title: "Product",
                links: productMenu.flatMap((group) =>
                  group.items.map(({ label, href }) => ({ label, href })),
                ),
              },
              {
                title: "More",
                links: [
                  { label: "Pricing", href: "/pricing" },
                  { label: "Compare", href: "/compare" },
                  { label: "Live demo", href: "/demo" },
                  { label: "Resources", href: "/resources" },
                  { label: "About", href: "/about" },
                ],
              },
            ].map((section) => (
              <div key={section.title} className="py-1">
                <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#9398a2]">
                  {section.title}
                </div>
                <div className="grid grid-cols-2">
                  {section.links.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-[6px] px-3 py-2.5 text-sm font-medium hover:bg-black/[.04]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
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

function MenuButton({
  label,
  open,
  onClick,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="flex items-center gap-1.5 text-sm font-medium text-[#505662] transition hover:text-[#101114]"
    >
      {label}
      <ChevronDown
        size={14}
        className={open ? "rotate-180 transition" : "transition"}
      />
    </button>
  );
}
