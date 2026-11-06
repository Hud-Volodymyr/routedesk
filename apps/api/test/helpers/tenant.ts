export function tenantHeader(tenantId: string): Record<string, string> {
  return { 'X-Tenant-Id': tenantId };
}
