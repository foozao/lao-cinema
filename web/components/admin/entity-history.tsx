'use client';

/**
 * Entity History Widget
 * 
 * Shows recent audit log entries for a specific entity (movie, person, etc.)
 * Displays in a collapsible card format for use on edit pages.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, History, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  getEntityAuditHistory,
  getActionLabel,
  getActionColor,
  type AuditLog,
  type AuditEntityType,
} from '@/lib/api/audit-logs';

interface EntityHistoryProps {
  entityType: AuditEntityType;
  entityId: string;
  limit?: number;
}

export function EntityHistory({ entityType, entityId, limit = 10 }: EntityHistoryProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  // Only admins can view audit logs
  const isAdmin = user?.role === 'admin';
  
  useEffect(() => {
    if (!isAdmin || !expanded) return;
    
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await getEntityAuditHistory(entityType, entityId, limit);
        setLogs(response.logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    
    loadHistory();
  }, [isAdmin, expanded, entityType, entityId, limit]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Don't render for non-admins
  if (!isAdmin) {
    return null;
  }
  
  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <CardTitle className="text-base">Change History</CardTitle>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              Loading history...
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500 text-sm">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              No change history found
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 text-sm border-l-2 border-gray-200 pl-3 py-1"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {log.userDisplayName || log.userEmail || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))}
              
              {logs.length >= limit && (
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    asChild
                  >
                    <a href={`/en/admin/audit-logs?entityType=${entityType}&entityId=${entityId}`}>
                      View all history →
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
