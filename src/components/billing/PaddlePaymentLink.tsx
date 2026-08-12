"use client";

import { initializePaddle } from "@paddle/paddle-js";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function PaddlePaymentLink() {
  const [message, setMessage] = useState(() =>
    typeof window !== "undefined" &&
    (!new URLSearchParams(window.location.search).get("_ptxn") ||
      !process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN)
      ? "This payment link is incomplete. Return to Billing and try again."
      : "Preparing secure checkout…",
  );

  useEffect(() => {
    const transactionId = new URLSearchParams(window.location.search).get(
      "_ptxn",
    );
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const environment =
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
        ? "production"
        : "sandbox";
    if (!transactionId || !token) {
      return;
    }
    void initializePaddle({ token, environment }).then((paddle) => {
      if (!paddle) {
        setMessage("Secure checkout could not be loaded. Please retry.");
        return;
      }
      paddle.Checkout.open({
        transactionId,
        settings: {
          variant: "one-page",
          successUrl: `${window.location.origin}/app`,
        },
      });
    });
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#111214] px-6 text-white">
      <div className="text-center">
        <Loader2 className="mx-auto animate-spin text-[#d8ff70]" />
        <h1 className="mt-5 text-xl font-semibold">ResolveX secure checkout</h1>
        <p className="mt-2 text-sm text-white/55">{message}</p>
      </div>
    </main>
  );
}
