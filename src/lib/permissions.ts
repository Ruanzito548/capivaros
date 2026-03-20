// cargos do sistema
export type Role =
  | "recruit"
  | "member"
  | "vip"
  | "editor"
  | "admin";

// verificar admin
export const isAdmin = (role: string | null) => {
  return role === "admin";
};

// pode criar notícias
export const canCreateNews = (role: string | null) => {
  return role === "editor" || role === "admin";
};

// pode comentar
export const canComment = (role: string | null) => {
  return (
    role === "member" ||
    role === "vip" ||
    role === "editor" ||
    role === "admin"
  );
};

// aprovar membros
export const canApproveMembers = (role: string | null) => {
  return role === "admin";
};

// aprovar personagens
export const canApproveCharacters = (role: string | null) => {
  return role === "admin";
};

// gerenciar cargos
export const canManageRoles = (role: string | null) => {
  return role === "admin";
};