export type RouteJobStatus = 'queued' | 'running' | 'done' | 'failed';

export const ROUTE_JOB_STATUSES: readonly RouteJobStatus[] = ['queued', 'running', 'done', 'failed'];

export type UnassignedReason = 'no_zone' | 'no_vehicle' | 'over_capacity';

export const UNASSIGNED_REASONS: readonly UnassignedReason[] = ['no_zone', 'no_vehicle', 'over_capacity'];
