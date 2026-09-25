"use client";

import { useEffect, useState } from "react";
import { Check, Settings2, ShieldCheck, X } from "lucide-react";

const STORAGE_KEY = "resolvex-cookie-consent-v1";

type Preferences = {
  necessary: true;
  analytics: boolean;
  preferences: boolean;
};

const defaultPreferences: Preferences = {
  necessary: true,
  analytics: false,
  preferences: false,
};

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
          setVisible(true);
        }
      } else {
        setVisible(true);
      }
    }, 0);

    const open = () => {
      setCustomizing(true);
      setVisible(true);
    };
    window.addEventListener("resolvex:open-consent", open);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resolvex:open-consent", open);
    };
  }, []);

  function save(next: Preferences) {
    setPreferences(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    document.cookie = `resolvex_consent=${encodeURIComponent(JSON.stringify(next))}; Max-Age=31536000; Path=/; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent("resolvex:consent", { detail: next }));
    setVisible(false);
    setCustomizing(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] sm:left-5 sm:right-auto sm:w-[540px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie preferences"
        className="overflow-hidden rounded-[8px] border border-black/12 bg-white shadow-[0_28px_90px_rgba(13,17,27,.28)]"
      >
        <div className="flex items-start gap-4 border-b border-black/8 p-5 sm:p-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-[6px] bg-[#101114] text-[#d8ff70]">
            <ShieldCheck size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Your data, your choice.</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#666970]">
              Necessary storage keeps ResolveX working. Optional analytics and
              preferences run only when you allow them.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close cookie preferences"
            onClick={() => setVisible(false)}
            className="grid size-8 shrink-0 place-items-center rounded-[5px] text-[#737780] hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        {customizing && (
          <div className="divide-y divide-black/8 px-5 sm:px-6">
            <ConsentRow
              title="Necessary"
              copy="Authentication, security, billing state, and your consent choice."
              checked
              disabled
              onChange={() => undefined}
            />
            <ConsentRow
              title="Analytics"
              copy="Helps us understand product performance and improve reliability."
              checked={preferences.analytics}
              onChange={(analytics) =>
                setPreferences((current) => ({ ...current, analytics }))
              }
            />
            <ConsentRow
              title="Preferences"
              copy="Remembers optional interface and communication choices."
              checked={preferences.preferences}
              onChange={(value) =>
                setPreferences((current) => ({
                  ...current,
                  preferences: value,
                }))
              }
            />
          </div>
        )}

        <div className="grid gap-2 bg-[#f6f6f3] p-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => save(defaultPreferences)}
            className="h-11 rounded-[6px] border border-black/12 bg-white text-xs font-semibold hover:bg-[#efefeb]"
          >
            Necessary only
          </button>
          {customizing ? (
            <button
              type="button"
              onClick={() => save(preferences)}
              className="flex h-11 items-center justify-center gap-2 rounded-[6px] border border-black/12 bg-white text-xs font-semibold hover:bg-[#efefeb]"
            >
              <Check size={14} /> Save choices
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-[6px] border border-black/12 bg-white text-xs font-semibold hover:bg-[#efefeb]"
            >
              <Settings2 size={14} /> Customize
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              save({ necessary: true, analytics: true, preferences: true })
            }
            className="h-11 rounded-[6px] bg-[#101114] text-xs font-semibold text-white hover:bg-[#ff5c35]"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  title,
  copy,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  copy: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 py-4">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-[#737780]">
          {copy}
        </span>
      </span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-[#d9dbe0] transition-colors peer-checked:bg-[#101114] peer-disabled:opacity-55 after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}
