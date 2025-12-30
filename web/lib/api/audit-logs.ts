/**
 * Audit Logs API Client
 * 
 * Fetches audit logs from the backend API.
 * Requires admin authentication.
 */

import { API_BASE_URL } from '@/lib/config';

// =============================================================================
// TYPES
// =============================================================================

export type AuditAction = 
  | 'create' | 'update' | 'delete'
  | 'add_cast' | 'remove_cast' | 'update_cast'
  | 'add_crew' | 'remove_crew' | 'update_crew'
  | 'add_image' | 'remove_image' | 'set_primary_image'
  | 'add_video' | 'remove_video' | 'update_video'
  | 'add_genre' | 'remove_genre'
  | 'add_production_company' | 'remove_production_company'
  | 'add_platform' | 'remove_platform' | 'update_platform'
  | 'feature_movie' | 'unfeature_movie'
  | 'merge_people' | 'update_person';

export type AuditEntityType = 
  | 'movie' | 'person' | 'genre' | 'production_company' | 'user' | 'settings';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
  userRole: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string | null;
  changes: Record<string, { before: any; after: any }> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

/**
 * Make authenticated API request
 * Uses HttpOnly cookies for authentication
 */
async function authFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Send HttpOnly cookies for auth
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Not authorized to view audit logs');
    }
    if (response.status === 403) {
      throw new Error('Admin access required');
    }
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || 'Failed to fetch audit logs');
  }
  
  return response.json();
}

/**
 * Get all audit logs with pagination
 */
export async function getAuditLogs(params: {
  limit?: number;
  offset?: number;
} = {}): Promise<AuditLogsResponse> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());
  
  const query = searchParams.toString();
  return authFetch<AuditLogsResponse>(`/audit-logs${query ? `?${query}` : ''}`);
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditHistory(
  entityType: AuditEntityType,
  entityId: string,
  limit = 50
): Promise<{ logs: AuditLog[] }> {
  return authFetch<{ logs: AuditLog[] }>(
    `/audit-logs/${entityType}/${entityId}?limit=${limit}`
  );
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditHistory(
  userId: string,
  limit = 100
): Promise<{ logs: AuditLog[] }> {
  return authFetch<{ logs: AuditLog[] }>(
    `/audit-logs/user/${userId}?limit=${limit}`
  );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get human-readable action label
 */
export function getActionLabel(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    add_cast: 'Added cast',
    remove_cast: 'Removed cast',
    update_cast: 'Updated cast',
    add_crew: 'Added crew',
    remove_crew: 'Removed crew',
    update_crew: 'Updated crew',
    add_image: 'Added image',
    remove_image: 'Removed image',
    set_primary_image: 'Set primary image',
    add_video: 'Added video',
    remove_video: 'Removed video',
    update_video: 'Updated video',
    add_genre: 'Added genre',
    remove_genre: 'Removed genre',
    add_production_company: 'Added company',
    remove_production_company: 'Removed company',
    add_platform: 'Added platform',
    remove_platform: 'Removed platform',
    update_platform: 'Updated platform',
    feature_movie: 'Featured movie',
    unfeature_movie: 'Unfeatured movie',
    merge_people: 'Merged people',
    update_person: 'Updated person',
  };
  return labels[action] || action;
}

/**
 * Get action color for styling
 */
export function getActionColor(action: AuditAction): string {
  if (action === 'create' || action.startsWith('add_') || action === 'feature_movie') {
    return 'text-green-600 bg-green-50';
  }
  if (action === 'delete' || action.startsWith('remove_') || action === 'unfeature_movie') {
    return 'text-red-600 bg-red-50';
  }
  return 'text-blue-600 bg-blue-50';
}

/**
 * Get entity type label
 */
export function getEntityTypeLabel(entityType: AuditEntityType): string {
  const labels: Record<AuditEntityType, string> = {
    movie: 'Movie',
    person: 'Person',
    genre: 'Genre',
    production_company: 'Production Company',
    user: 'User',
    settings: 'Settings',
  };
  return labels[entityType] || entityType;
}

/**
 * Export logs to CSV
 */
export function exportToCSV(logs: AuditLog[]): string {
  const headers = ['Date', 'User', 'Action', 'Entity Type', 'Entity', 'IP Address'];
  const rows = logs.map(log => [
    new Date(log.createdAt).toISOString(),
    log.userEmail || log.userId,
    getActionLabel(log.action),
    getEntityTypeLabel(log.entityType),
    log.entityName || log.entityId,
    log.ipAddress || '',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return csvContent;
}
