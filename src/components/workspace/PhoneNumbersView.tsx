"use client";

import { CheckCircle2, Loader2, Phone, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { countryOptions } from "@/lib/countries";

type StoredNumber = {
  id: string;
  e164: string;
  country: string;
  status: string;
};

type VoiceEmployee = { id: string; name: string };

function statusText(status: string) {
  if (status === "pending_authorization") return "Waiting for owner approval";
  if (status === "provisioning") return "Configuring call routing";
  if (status === "active") return "Connected · Ready for calls";
  if (status === "failed") return "Connection failed · Review the approval";
  return "Disconnected";
}

export function PhoneNumbersView({
  onNavigate,
}: {
  onNavigate: (view: "approvals") => void;
}) {
  const countries = useMemo(() => countryOptions(), []);
  const [numbers, setNumbers] = useState<StoredNumber[]>([]);
  const [employees, setEmployees] = useState<VoiceEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState({
    country: "US",
    provider: "twilio",
    number: "",
    gatewayAddress: "",
    port: 5060,
    authType: "userpass" as "userpass" | "ip-based",
    authUsername: "",
    authPassword: "",
    ipIdentifiers: "",
  });

  useEffect(() => {
    fetch("/api/phone-numbers", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!response.ok) return toast.error(data.error);
        setNumbers(data.numbers ?? []);
        setEmployees(data.voiceEmployees ?? []);
        setEmployeeId(data.voiceEmployees?.[0]?.id ?? "");
        setConfigured(Boolean(data.configured));
      })
      .catch(() =>
        toast.error("Could not load phone numbers. Check your connection."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function connectNumber(event: FormEvent) {
    event.preventDefault();
    if (!employeeId)
      return toast.error("Activate a telephone-enabled AI employee first.");
    setConnecting(true);
    try {
      const response = await fetch("/api/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect_sip",
          number: connection.number,
          country: connection.country,
          provider: connection.provider,
          employeeId,
          gatewayAddress: connection.gatewayAddress,
          port: connection.port,
          authType: connection.authType,
          authUsername:
            connection.authType === "userpass"
              ? connection.authUsername
              : undefined,
          authPassword:
            connection.authType === "userpass"
              ? connection.authPassword
              : undefined,
          ipIdentifiers:
            connection.authType === "ip-based"
              ? connection.ipIdentifiers
                  .split(/[\n,]/)
                  .map((value) => value.trim())
                  .filter(Boolean)
              : undefined,
          confirmation: "REQUEST ACTIVATION",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNumbers((rows) => [
        data.number,
        ...rows.filter((row) => row.id !== data.number.id),
      ]);
      toast.success(data.message);
      onNavigate("approvals");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not connect the number.",
      );
    } finally {
      setConnecting(false);
    }
  }

  if (loading)
    return (
      <div className="grid min-h-0 flex-1 place-items-center bg-[#f1f5ef]">
        <Loader2 className="animate-spin text-[#355cff]" />
      </div>
    );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f1f5ef] p-4 text-[#15171b] md:p-7">
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#6f747d]">
          Business · Telephony
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-.045em] md:text-4xl">
          Connect your phone number
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#717680]">
          Purchase and verify your number directly with any SIP-compatible
          carrier, then connect it to a ResolveX AI employee. ResolveX does not
          sell phone numbers or add number-rental charges.
        </p>

        <div className="mt-7 rounded-[10px] border border-[#c9d8ff] bg-[#eef4ff] p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
              <ShieldCheck size={18} className="text-[#355cff]" />
            </span>
            <div>
              <b className="text-sm">Your carrier remains the number owner</b>
              <p className="mt-1 text-xs leading-5 text-[#667085]">
                KYC, number availability, rental, taxes, porting, and regulatory
                compliance stay between you and your carrier. ResolveX only
                configures the SIP connection and AI routing after your
                approval.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={connectNumber}
          className="mt-5 grid gap-4 rounded-[10px] border border-black/10 bg-white p-5 md:grid-cols-2"
        >
          <label className="text-xs font-semibold">
            Country or region
            <select
              value={connection.country}
              onChange={(event) =>
                setConnection((value) => ({
                  ...value,
                  country: event.target.value,
                }))
              }
              className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm font-normal"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Carrier
            <select
              value={connection.provider}
              onChange={(event) =>
                setConnection((value) => ({
                  ...value,
                  provider: event.target.value,
                }))
              }
              className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm font-normal"
            >
              <option value="twilio">Twilio</option>
              <option value="plivo">Plivo</option>
              <option value="exotel">Exotel</option>
              <option value="vobiz">Vobiz</option>
              <option value="vonage">Vonage</option>
              <option value="custom">Other SIP carrier</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            Phone number
            <input
              required
              value={connection.number}
              onChange={(event) =>
                setConnection((value) => ({
                  ...value,
                  number: event.target.value,
                }))
              }
              placeholder="E.164 format, e.g. +14155550123"
              className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 px-3 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            Route to AI employee
            <select
              required
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm font-normal"
            >
              {!employees.length && (
                <option value="">No active telephone employee</option>
              )}
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold md:col-span-2">
            SIP gateway or termination URI
            <input
              required
              value={connection.gatewayAddress}
              onChange={(event) =>
                setConnection((value) => ({
                  ...value,
                  gatewayAddress: event.target.value,
                }))
              }
              placeholder="sip.example-carrier.com"
              className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 px-3 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            SIP port
            <input
              required
              type="number"
              min={1}
              max={65535}
              value={connection.port}
              onChange={(event) =>
                setConnection((value) => ({
                  ...value,
                  port: Number(event.target.value),
                }))
              }
              className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 px-3 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            Authentication
            <select
              value={connection.authType}
              onChange={(event) =>
                setConnection((value) => ({
                  ...value,
                  authType: event.target.value as "userpass" | "ip-based",
                }))
              }
              className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 bg-white px-3 text-sm font-normal"
            >
              <option value="userpass">Username and password</option>
              <option value="ip-based">IP allowlist</option>
            </select>
          </label>
          {connection.authType === "userpass" ? (
            <>
              <label className="text-xs font-semibold">
                SIP username
                <input
                  required
                  autoComplete="off"
                  value={connection.authUsername}
                  onChange={(event) =>
                    setConnection((value) => ({
                      ...value,
                      authUsername: event.target.value,
                    }))
                  }
                  className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 px-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold">
                SIP password
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  value={connection.authPassword}
                  onChange={(event) =>
                    setConnection((value) => ({
                      ...value,
                      authPassword: event.target.value,
                    }))
                  }
                  className="mt-2 block h-11 w-full rounded-[6px] border border-black/10 px-3 text-sm font-normal"
                />
              </label>
            </>
          ) : (
            <label className="text-xs font-semibold md:col-span-2">
              Allowed SIP IP addresses or CIDRs
              <textarea
                required
                value={connection.ipIdentifiers}
                onChange={(event) =>
                  setConnection((value) => ({
                    ...value,
                    ipIdentifiers: event.target.value,
                  }))
                }
                placeholder="One per line, e.g. 203.0.113.10 or 203.0.113.0/24"
                className="mt-2 block min-h-24 w-full rounded-[6px] border border-black/10 p-3 text-sm font-normal"
              />
            </label>
          )}
          <button
            disabled={connecting || !configured || !employeeId}
            className="flex h-11 items-center justify-center gap-2 rounded-[6px] bg-[#355cff] text-sm font-semibold text-white disabled:opacity-50 md:col-span-2"
          >
            {connecting && <Loader2 size={16} className="animate-spin" />}
            {connecting ? "Creating secure connection…" : "Review connection"}
          </button>
          {!configured && (
            <p className="text-xs text-[#9a554a] md:col-span-2">
              Telephone routing is not configured for this ResolveX deployment.
            </p>
          )}
        </form>

        <section className="mt-6">
          <h3 className="text-sm font-semibold">Connected workspace numbers</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {numbers.map((number) => (
              <div
                key={number.id}
                className="flex items-center gap-3 rounded-[10px] border border-black/10 bg-white p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e9fbd0]">
                  {number.status === "active" ? (
                    <CheckCircle2 size={17} className="text-[#4c7c24]" />
                  ) : (
                    <Phone size={16} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="text-sm">{number.e164}</b>
                  <p className="mt-1 text-xs text-[#747982]">
                    {statusText(number.status)} · {number.country}
                  </p>
                </div>
                {new Set(["pending_authorization", "failed"]).has(
                  number.status,
                ) && (
                  <button
                    type="button"
                    onClick={() => onNavigate("approvals")}
                    className="h-9 shrink-0 rounded-[6px] border border-black/10 px-3 text-xs font-semibold"
                  >
                    Review
                  </button>
                )}
              </div>
            ))}
            {!numbers.length && (
              <div className="rounded-[10px] border border-dashed border-black/15 bg-white/65 p-8 text-center md:col-span-2">
                <Phone className="mx-auto text-[#8a9099]" size={22} />
                <h4 className="mt-3 text-sm font-semibold">
                  No connected numbers
                </h4>
                <p className="mt-1 text-xs text-[#747982]">
                  Buy and verify a number with your carrier, then enter its SIP
                  connection details above.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
