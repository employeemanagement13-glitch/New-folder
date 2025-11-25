// src/utils/useRole.ts
'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export type Role = 'admin' | 'hr' | 'manager' | 'employee';

export function useRole(): Role | undefined {
  const { user } = useUser();
  const [role, setRole] = useState<Role | undefined>(undefined);

  useEffect(() => {
    if (user) {
      const r = user.publicMetadata.role as Role | undefined;
      setRole(r);
    } else {
      setRole(undefined);
    }
  }, [user]);

  return role;
}
