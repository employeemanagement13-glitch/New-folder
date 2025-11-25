// app/dashboard/layout.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/Components/Sidebar';
import Navbar from '@/Components/Navbar';
import { useNavigationData, getDefaultRoute } from '@/lib/navigation-data';
import { getUserRoleData } from '@/lib/auth-utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'hr' | 'manager' | 'employee'>('employee');
  const [userData, setUserData] = useState<{ name?: string; email?: string }>({});
  const [loading, setLoading] = useState(true);
  
  const { isLoaded, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Use the navigation hook
  const { navigationItems, userId } = useNavigationData(userRole);

  useEffect(() => {
    if (isLoaded && user) {
      loadUserData();
    }
  }, [isLoaded, user]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get user role and data from database
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      if (!userEmail) {
        console.error('❌ No email found for user');
        return;
      }
      // console.log(user.id)

      const roleData = await getUserRoleData(user.id, userEmail);
      
      setUserRole(roleData.role);
      setUserData({
        name: roleData.name || user?.fullName || 'User',
        email: roleData.email || userEmail
      });

      console.log('👤 User data loaded:', { 
        role: roleData.role, 
        name: roleData.name,
        email: userEmail 
      });

      // Redirect to role-specific dashboard if on root dashboard
      if (pathname === '/dashboard' || pathname === '/') {
        const basePath = getDefaultRoute(roleData.role);
        console.log('🔄 Redirecting to:', basePath);
        router.push(basePath);
      }

    } catch (error) {
      console.error('❌ Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#171717] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        items={navigationItems}
        role={userRole}
        userName={userData.name}
        userEmail={userData.email}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userRole={userRole}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#171717]">
          {children}
        </main>
      </div>
    </div>
  );
}