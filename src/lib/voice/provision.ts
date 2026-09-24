import "server-only";

import crypto from "node:crypto";
import { publicAppUrl } from "@/lib/app-url";
import { importElevenLabsSipNumber } from "@/lib/providers/elevenlabs";
import {
  buyPlivoNumber,
  createPlivoApplication,
  createPlivoOutboundTrunk,
  createPlivoSipCredential,
  retrievePlivoTrunk,
} from "@/lib/providers/plivo";

export type ProvisionablePhone = {
  id: string;
  e164: string;
  country: string;
  provider_metadata?: Record<string, unknown> | null;
};

export type VoiceEmployee = {
  id: string;
  name: string;
  external_agent_id: string;
};

export async function provisionApprovedPhone(
  phone: ProvisionablePhone,
  employee: VoiceEmployee,
) {
  const appUrl = publicAppUrl();
  const app = await createPlivoApplication({
    name: `ResolveX-${phone.id.slice(0, 8)}`,
    answerUrl: `${appUrl}/api/voice/webhooks/plivo/answer?phone=${phone.id}`,
    hangupUrl: `${appUrl}/api/voice/webhooks/plivo/status?phone=${phone.id}`,
  });

  const complianceApplicationId =
    typeof phone.provider_metadata?.compliance_application_id === "string"
      ? phone.provider_metadata.compliance_application_id
      : null;
  if (phone.country === "IN" && !complianceApplicationId) {
    throw new Error(
      "India activation requires an accepted Plivo compliance application ID.",
    );
  }

  await buyPlivoNumber({
    number: phone.e164,
    appId: app.app_id,
    complianceApplicationId,
  });

  const username = `rx${phone.id.replaceAll("-", "").slice(0, 18)}`;
  const password = `A${crypto.randomBytes(8).toString("hex")}!`;
  const credential = await createPlivoSipCredential({
    name: `ResolveX ${phone.id.slice(0, 8)}`,
    username,
    password,
  });
  const trunk = await createPlivoOutboundTrunk({
    name: `ResolveX ${phone.id.slice(0, 8)}`,
    credentialUuid: credential.credential_uuid,
  });
  const trunkId = trunk.trunk_id ?? trunk.trunk_uuid;
  if (!trunkId)
    throw new Error("Plivo created the trunk without returning its ID.");
  const retrieved = await retrievePlivoTrunk(trunkId);
  const outboundAddress =
    retrieved.object?.trunk_domain ?? retrieved.trunk_domain;
  if (!outboundAddress)
    throw new Error("Plivo created the trunk without a usable SIP address.");

  const eleven = await importElevenLabsSipNumber({
    phoneNumber: phone.e164.startsWith("+") ? phone.e164 : `+${phone.e164}`,
    label: `${employee.name} — ${phone.e164}`,
    agentId: employee.external_agent_id,
    outboundAddress,
    outboundUsername: username,
    outboundPassword: password,
  });

  return {
    plivo_application_id: app.app_id,
    plivo_trunk_id: trunkId,
    elevenlabs_phone_number_id: eleven.phone_number_id,
    routing_strategy:
      phone.country === "IN" ? "plivo_india_resident" : "plivo_elevenlabs_sip",
  };
}
