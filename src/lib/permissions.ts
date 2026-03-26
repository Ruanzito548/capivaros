export type Role =
  | "visitor"
  | "recruit"
  | "member"
  | "vip"
  | "streamer"
  | "officer tbc"
  | "fundador";

function normalizeRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() ?? "";
}

export const isFounder = (role: string | null) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "fundador" || normalizedRole === "admin";
};

export const isOfficerTBC = (role: string | null) => {
  const normalizedRole = normalizeRole(role);
  return (
    normalizedRole === "officer tbc" ||
    normalizedRole === "officer" ||
    normalizedRole === "officer_tbc"
  );
};

export const isStreamer = (role: string | null) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "streamer" || normalizedRole === "editor";
};

export const isAdmin = (role: string | null) => {
  return isFounder(role) || isOfficerTBC(role) || isStreamer(role);
};

export const canAccessWowAdmin = (role: string | null) => {
  return isFounder(role) || isOfficerTBC(role);
};

export const canAccessLolAdmin = (role: string | null) => {
  return isFounder(role);
};

export const canCreateNews = (role: string | null) => {
  return isFounder(role) || isOfficerTBC(role) || isStreamer(role);
};

export const canComment = (role: string | null) => {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === "member" ||
    normalizedRole === "vip" ||
    isStreamer(role) ||
    isOfficerTBC(role) ||
    isFounder(role)
  );
};

export const canApproveMembers = (role: string | null) => {
  return isFounder(role) || isOfficerTBC(role);
};

export const canApproveCharacters = (role: string | null) => {
  return isFounder(role) || isOfficerTBC(role);
};

export const canManageRoles = (role: string | null) => {
  return isFounder(role);
};

export const getRoleLabel = (role: string | null | undefined) => {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case "fundador":
    case "admin":
      return "Fundador";
    case "officer tbc":
    case "officer":
    case "officer_tbc":
      return "Officer";
    case "streamer":
    case "editor":
      return "Streamer";
    case "vip":
      return "VIP";
    case "member":
      return "Member";
    case "recruit":
      return "Recruit";
    case "visitor":
      return "Visitor";
    default:
      return role || "Sem cargo";
  }
};
