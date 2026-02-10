import { ipVersion, normalizeIp } from "@/lib/ip";

export function normalizePrefix(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  if (!raw.includes("/")) return null;
  const [addrRaw, maskRaw] = raw.split("/", 2);
  if (!addrRaw || !maskRaw) return null;

  const addr = normalizeIp(addrRaw);
  if (!addr) return null;

  const mask = Number(maskRaw);
  if (!Number.isInteger(mask)) return null;

  const v = ipVersion(addr);
  if (v === "ipv4" && (mask < 0 || mask > 32)) return null;
  if (v === "ipv6" && (mask < 0 || mask > 128)) return null;
  if (v === "unknown") return null;

  return `${addr}/${mask}`;
}

