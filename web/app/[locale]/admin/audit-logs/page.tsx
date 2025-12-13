'use client';

/**
 * Admin Audit Logs Page
 * 
 * Displays audit log history for admin users.
 * Includes filtering, pagination, and export functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Download, 
  RefreshCw,
  User,
  Film,
  Users,
  Settings,
  Building2,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  getAuditLogs,
  getActionLabel,
  getActionColor,
  getEntityTypeLabel,
  exportToCSV,
  type AuditLog,
  type AuditAction,
  type AuditEntityType,
} from '@/lib/api/audit-logs';

const ITEMS_PER_PAGE = 50;

// Component to display changes for a single log entry
function ChangesDisplay({ changes }: { changes: Record<string, { before: any; after: any }> | null }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!changes) return null;
  
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;
  
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') {
      // Handle LocalizedText objects
      if (value.en || value.lo) {
        const parts = [];
        if (value.en) parts.push(`EN: ${value.en}`);
        if (value.lo) parts.push(`LO: ${value.lo}`);
        return parts.join(' | ');
      }
      return JSON.stringify(value);
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };
  
  const displayEntries = expanded ? entries : entries.slice(0, 3);
  
  return (
    <div className="mt-2 space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {entries.length} field{entries.length !== 1 ? 's' : ''} changed
      </button>
      
      {(expanded || entries.length <= 3) && (
        <div className="bg-white border rounded-md p-2 text-xs space-y-2">
          {displayEntries.map(([key, value]) => (
            <div key={key} className="border-b last:border-b-0 pb-2 last:pb-0">
              <div className="font-medium text-gray-700 mb-1">{key}</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">Before</span>
                  <div className="text-red-600 bg-red-50 p-1 rounded break-words">
                    {formatValue(value.before)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase">After</span>
                  <div className="text-green-600 bg-green-50 p-1 rounded break-words">
                    {formatValue(value.after)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!expanded && entries.length > 3 && (
            <div className="text-gray-400 text-center">
              +{entries.length - 3} more changes
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const t = useTranslations('admin');
  const { user } = useAuth();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
  const [filterAction, setFilterAction] = useState<AuditAction | ''>('');
  const [filterEntityType, setFilterEntityType] = useState<AuditEntityType | ''>('');
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  const loadLogs = useCallback(async () => {
    if (!isAdmin) {
      setError('Admin access required to view audit logs');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getAuditLogs({
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
      });
      
      // Apply client-side filters (TODO: move to backend)
      let filteredLogs = response.logs;
      if (filterAction) {
        filteredLogs = filteredLogs.filter(log => log.action === filterAction);
      }
      if (filterEntityType) {
        filteredLogs = filteredLogs.filter(log => log.entityType === filterEntityType);
      }
      
      setLogs(filteredLogs);
      setHasMore(response.logs.length === ITEMS_PER_PAGE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, filterAction, filterEntityType]);
  
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);
  
  const handleExport = () => {
    const csv = exportToCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const getEntityIcon = (entityType: AuditEntityType) => {
    switch (entityType) {
      case 'movie': return <Film className="w-4 h-4" />;
      case 'person': return <Users className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'production_company': return <Building2 className="w-4 h-4" />;
      case 'genre': return <Tag className="w-4 h-4" />;
      case 'settings': return <Settings className="w-4 h-4" />;
      default: return null;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  
  // Action options for filter
  const actionOptions: AuditAction[] = [
    'create', 'update', 'delete',
    'add_cast', 'remove_cast', 'update_cast',
    'add_crew', 'remove_crew', 'update_crew',
    'add_image', 'remove_image', 'set_primary_image',
    'add_video', 'remove_video', 'update_video',
    'add_genre', 'remove_genre',
    'feature_movie', 'unfeature_movie',
  ];
  
  // Entity type options for filter
  const entityTypeOptions: AuditEntityType[] = [
    'movie', 'person', 'genre', 'production_company',
  ];
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              Only administrators can view audit logs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Audit Logs</h2>
        <p className="text-gray-600">Track all content changes made by editors and admins</p>
      </div>
      
      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => {
                    setFilterAction(e.target.value as AuditAction | '');
                    setPage(0);
                  }}
                  className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">All actions</option>
                  {actionOptions.map(action => (
                    <option key={action} value={action}>
                      {getActionLabel(action)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Entity Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity Type
                </label>
                <select
                  value={filterEntityType}
                  onChange={(e) => {
                    setFilterEntityType(e.target.value as AuditEntityType | '');
                    setPage(0);
                  }}
                  className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">All types</option>
                  {entityTypeOptions.map(type => (
                    <option key={type} value={type}>
                      {getEntityTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLogs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={logs.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Error State */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {logs.length} entries {page > 0 && `(page ${page + 1})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {/* Entity Icon */}
                  <div className="flex-shrink-0 mt-1 text-gray-400">
                    {getEntityIcon(log.entityType)}
                  </div>
                  
                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Action Badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      
                      {/* Entity Info */}
                      <span className="text-sm text-gray-900">
                        {getEntityTypeLabel(log.entityType)}
                        {log.entityName && (
                          <span className="font-medium ml-1">"{log.entityName}"</span>
                        )}
                      </span>
                    </div>
                    
                    {/* Changes Preview */}
                    <ChangesDisplay changes={log.changes} />
                    
                    {/* Meta Info */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.userDisplayName || log.userEmail || 'Unknown user'}
                        {log.userRole && (
                          <span className="text-gray-400">({log.userRole})</span>
                        )}
                      </span>
                      <span>{formatDate(log.createdAt)}</span>
                      {log.ipAddress && (
                        <span className="text-gray-400">{log.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm text-gray-500">
              Page {page + 1}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
