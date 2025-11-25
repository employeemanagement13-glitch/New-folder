'use client';

import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// type EmployeeWithRole = {
//   role_id: string | null;
//   roles?: { name: string }[];  // when joined
// };

interface AuthRoleContextType {
  role: string;
}

const AuthRoleContext = createContext<AuthRoleContextType>({ role: 'Employee' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const AuthRoleProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<string>('Employee');

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole('Employee');
        return;
      }

      const email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        '';

      const { data, error } = await supabase
        .from('employees')
        .select('role_id, roles(name)')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role:', error.message);
        setRole('Employee');
      } else {
        const roleName = data?.roles?.[0]?.name || 'Employee';
        setRole(roleName);
      }
    }

    if (isLoaded) {
      fetchRole();
    }
  }, [user, isLoaded]);

  return (
    <AuthRoleContext.Provider value={{ role }}>
      {children}
    </AuthRoleContext.Provider>
  );
};

export const useAuthRole = (): AuthRoleContextType => {
  const ctx = useContext(AuthRoleContext);
  if (!ctx) throw new Error('useAuthRole must be used within AuthRoleProvider');
  return ctx;
};
