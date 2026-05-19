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

export function maskEmailAddress(email: string | null | undefined) {
  if (!email) return "--";

  const value = email.trim();
  if (!value) return "--";

  const atIndex = value.indexOf("@");
  if (atIndex <= 0 || atIndex === value.length - 1) {
    return value.length <= 3 ? "***" : `${value.slice(0, value.length - 3)}***`;
  }

  const localPart = value.slice(0, atIndex);
  const domainPart = value.slice(atIndex);
  const visibleLength = Math.max(0, localPart.length - 3);
  const visible = localPart.slice(0, visibleLength);
  const hidden = "*".repeat(localPart.length - visibleLength);
  return `${visible}${hidden}${domainPart}`;
}