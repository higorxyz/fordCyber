export function maskIpAddress(ip: string | null | undefined) {
  if (!ip) return "--";

  const value = ip.trim();
  if (!value) return "--";

  const ipv4 = value.match(/^(\d{1,3})(?:\.(\d{1,3})){3}$/);
  if (ipv4) {
    const parts = value.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }

  if (value.includes(":")) {
    const parts = value.split(":");
    const visible = parts.slice(0, 2).join(":");
    return `${visible}:****`;
  }

  if (value.length <= 4) return "****";
  return `${value.slice(0, 4)}****`;
}