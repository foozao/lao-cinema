'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { User, LogOut } from 'lucide-react';

export function AdminUserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };
  
  if (!isAuthenticated || !user) {
    return null;
  }
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 transition-colors"
        data-testid="admin-user-menu-trigger"
      >
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt={user.displayName || user.email}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full border-2 border-gray-400 flex items-center justify-center">
            <User className="h-5 w-5 text-gray-500" />
          </div>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-[100]">
          {/* User Info */}
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900">
              {user.displayName || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-1">{user.email}</p>
            <p className="text-xs text-gray-600 mt-2">
              Role: <span className="font-medium capitalize">{user.role}</span>
            </p>
          </div>
          
          {/* Logout */}
          <div className="border-t border-gray-200 py-1">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              data-testid="admin-logout-button"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
