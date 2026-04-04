export const businessUserRoleOptions = [
  {
    value: "owner",
    label: "Owner"
  },
  {
    value: "dispatcher",
    label: "Dispatcher"
  },
  {
    value: "staff",
    label: "Staff"
  }
] as const;

export type BusinessUserRole = (typeof businessUserRoleOptions)[number]["value"];

export function normalizeBusinessUserRole(input?: string | null): BusinessUserRole {
  const normalized = input?.trim().toLowerCase();

  if (normalized === "owner") {
    return "owner";
  }

  if (normalized === "dispatcher" || normalized === "manager") {
    return "dispatcher";
  }

  return "staff";
}

export function formatBusinessUserRole(input?: string | null) {
  const role = normalizeBusinessUserRole(input);
  return businessUserRoleOptions.find((option) => option.value === role)?.label ?? "Staff";
}
