import "server-only";
import {
  Environment,
  LogLevel,
  Paddle,
  type PaddleOptions,
} from "@paddle/paddle-node-sdk";
import { paddleConfiguration } from "@/lib/billing/provider";

let instance: Paddle | null = null;

export function getPaddle() {
  const config = paddleConfiguration();
  if (!config.apiKey) throw new Error("Paddle API credentials are incomplete.");
  if (!instance) {
    const options: PaddleOptions = {
      environment:
        config.environment === "production"
          ? Environment.production
          : Environment.sandbox,
      logLevel: LogLevel.error,
    };
    instance = new Paddle(config.apiKey, options);
  }
  return instance;
}
