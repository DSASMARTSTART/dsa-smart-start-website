import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function UserMenu() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return <div className="text-sm">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm">{user.email}</span>
      <button
        onClick={() => signOut()}
        className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
      >
        Sign Out
      </button>
    </div>
  );
}
