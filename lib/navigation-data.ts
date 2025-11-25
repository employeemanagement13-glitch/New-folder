// @ts-nocheck
'use client';

import { 
  LayoutDashboard, 
  Users, 
  Building, 
  Calendar, 
  FileText, 
  Megaphone,
  User
} from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { useMemo } from 'react';

export interface NavigationItem {
  title: string;
  href: string;
  icon: any;
  external?: boolean;
  roles?: ('admin' | 'hr' | 'manager' | 'employee')[];
}

// Define base navigation items without dynamic paths
export const baseNavigationItems: NavigationItem[] = [
  // ==================== DASHBOARD ====================
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'hr', 'manager', 'employee']
  },

  // ==================== ADMIN EXCLUSIVE ====================
  {
    title: 'Employee Management',
    href: '/employee-management',
    icon: Users,
    roles: ['admin']
  },
  {
    title: 'Department Management',
    href: '/departments',
    icon: Building,
    roles: ['admin']
  },

  // ==================== HR MANAGEMENT ====================
  {
    title: 'Employee Management',
    href: '/employees',
    icon: Users,
    roles: ['hr']
  },
  // {
  //   title: 'Department Overview',
  //   href: '/departments',
  //   icon: Building,
  //   roles: ['hr']
  // },
  // {
  //   title: 'HR Analytics',
  //   href: '/analytics',
  //   icon: BarChart3,
  //   roles: ['hr']
  // },
  {
    title: 'Announcements',
    href: '/announcements',
    icon: Megaphone,
    roles: ['hr', 'admin']
  },

  // ==================== MANAGER FEATURES ====================
   {
    title: 'Announcements',
    href: '/announcements',
    icon: Megaphone,
    roles: ['manager', 'employee']
  },
   {
    title: 'Profile',
    href: '/profile',
    icon: User,
    roles: ['employee']
  },

  // ==================== EMPLOYEE FEATURES ====================

  // ==================== COMMON FOR ALL ROLES ====================
  {
    title: 'Attendance',
    href: '/attendance',
    icon: Calendar,
    roles: ['admin', 'manager', 'employee', 'hr']
  },
  {
    title: 'Leave Management',
    href: '/leaves',
    icon: FileText,
    roles: ['admin', 'manager', 'employee', 'hr']
  }
];

// React hook to get navigation items with proper userId
export function useNavigationData(role: 'admin' | 'hr' | 'manager' | 'employee') {
  const params = useParams();
  const pathname = usePathname();

  // Extract userId from params or pathname
  const userId = useMemo(() => {
    console.log('🔍 Extracting userId from:', { params, pathname });
    
    // Try to get from URL params first (for dynamic routes like /manager/[empId]/...)
    if (params.empId) {
      return params.id as string;
    }
    
    // Fallback: extract from pathname
    const pathSegments = pathname.split('/').filter(segment => segment);
    console.log('📁 Path segments:', pathSegments);
    
    // For routes like /manager/123/dashboard, the userId is the second segment
    if (pathSegments.length >= 2 && (pathSegments[0] === 'manager' || pathSegments[0] === 'employee' || pathSegments[0] === 'hr')) {
      const extractedId = pathSegments[1];
      console.log('✅ Extracted userId:', extractedId);
      return extractedId;
    }
    
    console.log('❌ No userId found in path');
    return null;
  }, [params.id, pathname]);

  // Get navigation items with proper base paths
  const navigationItems = useMemo(() => {
    console.log('🔄 Generating navigation items for role:', role, 'userId:', userId);
    
    const filteredItems = baseNavigationItems.filter(item => item.roles.includes(role));
    
    const itemsWithPaths = filteredItems.map(item => {
      let basePath = '';
      
      switch (role) {
        case 'admin':
          basePath = '/admin';
          break;
        case 'hr':
          // Check if current path has userId pattern
          if (userId && pathname.includes(`/hr/${userId}`)) {
            basePath = `/hr/${userId}`;
          } else {
            basePath = '/hr';
          }
          break;
        case 'manager':
          basePath = userId ? `/manager/${userId}` : '/manager';
          break;
        case 'employee':
          basePath = userId ? `/employee/${userId}` : '/employee';
          break;
        default:
          basePath = '';
      }

      const fullPath = `${basePath}${item.href}`;
      console.log(`   ${item.title}: ${fullPath}`);
      
      return {
        ...item,
        href: fullPath
      };
    });

    console.log('🎯 Final navigation items:', itemsWithPaths.length);
    return itemsWithPaths;
  }, [role, userId, pathname]);

  return {
    navigationItems,
    userId,
    currentPath: pathname
  };
}

// Get user display name based on role
export function getRoleDisplayName(role: string): string {
  const roleMap: { [key: string]: string } = {
    'admin': 'Administrator',
    'hr': 'HR Manager', 
    'manager': 'Department Manager',
    'employee': 'Employee'
  };
  return roleMap[role] || 'User';
}

// Get the default route for a role
export function getDefaultRoute(role: string, userId?: string | null): string {
  const basePaths: { [key: string]: string } = {
    'admin': '/admin/dashboard',
    'hr': '/hr/dashboard', // HR from hrs table
    'manager': userId ? `/manager/${userId}/dashboard` : '/manager/dashboard',
    'employee': userId ? `/employee/${userId}/dashboard` : '/employee/dashboard'
  };
  
  return basePaths[role] || '/';
}
