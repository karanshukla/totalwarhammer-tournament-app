const DELETED_PATTERN = /^deleted_[a-f0-9]{8}$/i;

export const displayName = (name: string | undefined | null): string => {
  if (!name) return "Unknown";
  if (DELETED_PATTERN.test(name.trim())) return "Deleted User";
  return name;
};
