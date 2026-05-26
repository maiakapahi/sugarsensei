export function authedHomePath(): string {
  return "/";
}

export function authedMemberPath(memberId: string): string {
  return `/member/${memberId}`;
}

export function familyListPath(): string {
  return "/";
}

export function memberDashboardPath(memberId: string): string {
  return `/member/${memberId}`;
}
