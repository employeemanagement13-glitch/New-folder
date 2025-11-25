// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from './lib/supabaseAdmin';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/admin(.*)',
  '/dashboard(.*)',
  '/team-lead(.*)',
  '/profile(.*)',
  '/attendance(.*)',
  '/leaves(.*)',
  '/payroll(.*)',
  '/hr(.*)',
  '/manager(.*)',
  '/employee(.*)',
  '/department-manager(.*)'
]);

// Function to get user role and data with email-based verification
async function getUserRoleAndData(clerkUserId: string, userEmail: string) {
  try {
    console.log('🔍 Checking role for:', { clerkUserId, userEmail });

    // 1. First check admins table by email
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();

    if (adminError) {
      console.error('Admin check error:', adminError);
    }

    if (adminData) {
      console.log('✅ User is Admin');
      // Update admin record with clerk_user_id if not set
      if (!adminData.clerk_user_id) {
        await supabaseAdmin
          .from('admins')
          .update({ clerk_user_id: clerkUserId })
          .eq('id', adminData.id);
      }

      return {
        role: 'admin',
        data: { ...adminData, clerk_user_id: clerkUserId },
        redirect: '/admin/dashboard'
      };
    }

    // 2. Check hrs table by email - SIMPLIFIED LOGIC
    const { data: hrData, error: hrError } = await supabaseAdmin
      .from('hrs')
      .select('*')
      .eq('email', userEmail)
      .maybeSingle();

    if (hrError) {
      console.error('HR check error:', hrError);
    }

    if (hrData) {
      console.log('✅ User is HR (from hrs table)');
      // Update HR record with clerk_user_id if not set
      // if (!hrData.clerk_user_id) {
      //   await supabaseAdmin
      //     .from('hrs')
      //     .update({ clerk_user_id: clerkUserId })
      //     .eq('id', hrData.id);
      // }

      return {
        role: 'HR',
        data: hrData,
        redirect: '/hr/dashboard/dashboard' // Direct to /hr/dashboard for hrs table users
      };
    }

    

    // 3. Check employees table by email
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('email', userEmail)
      .eq('status', 'active')
      .maybeSingle();

    if (employeeError) {
      console.error('Employee check error:', employeeError);
      throw employeeError;
    }

    if (employeeData) {
      console.log('✅ User found in employees table:', employeeData.id);
      
      // Update employee record with clerk_user_id if not set
      if (!employeeData.clerk_user_id) {
        await supabaseAdmin
          .from('employees')
          .update({ clerk_user_id: clerkUserId })
          .eq('id', employeeData.id);
      }

      // Now get the role name from roles table using the role_id
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('role_name')
        .eq('id', employeeData.role_id)
        .maybeSingle();

      if (roleError) {
        console.error('Role lookup error:', roleError);
        throw roleError;
      }

      const roleName = roleData?.role_name?.toLowerCase() || '';
      const employeeId = employeeData.id;
      
      console.log('🎯 Employee role determined:', roleName);
      
      // Determine redirect based on actual role name from roles table
      if (roleName.includes('department manager')) {
        return {
          role: 'manager',
          data: employeeData,
          redirect: `/manager/${employeeId}/dashboard`
        };
      } else if (roleName.includes('hr manager')) {
        return {
          role: 'hr',
          data: employeeData,
          redirect: `/hr/${employeeId}/dashboard` // HR Manager from employees table
        };
      } else if (roleName.includes('team lead') || roleName.includes('teamlead')) {
        return {
          role: 'team_lead',
          data: employeeData,
          redirect: `/team-lead/${employeeId}/dashboard`
        };
      } else {
        // Regular employee
        return {
          role: 'employee',
          data: employeeData,
          redirect: `/employee/${employeeId}/dashboard`
        };
      }
    }

    // User not found in any role table
    console.log('❌ User not found in any role table');
    return {
      role: 'unauthorized',
      data: null,
      redirect: '/unauthorized'
    };

  } catch (error) {
    console.error('❌ Error fetching user role:', error);
    return {
      role: 'error',
      data: null,
      redirect: '/error'
    };
  }
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (pathname === '/unauthorized' || pathname === '/error') {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth();
    
    if (!userId) {
      return redirectToSignIn();
    }

    try {
      // Get user email from Clerk
      const clerkUser = await fetch(
        `https://api.clerk.com/v1/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          },
        }
      );

      if (!clerkUser.ok) {
        console.error('❌ Failed to fetch user from Clerk');
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      const clerkUserData = await clerkUser.json();
      const userEmail = clerkUserData.primary_email_address_id ? 
        clerkUserData.email_addresses.find(
          (email: any) => email.id === clerkUserData.primary_email_address_id
        )?.email_address : clerkUserData.email_addresses[0]?.email_address;

      if (!userEmail) {
        console.error('❌ No email found for user');
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      console.log('📧 User email:', userEmail);

      // Get user role and data
      const userInfo = await getUserRoleAndData(userId, userEmail);

      // Redirect unauthorized users
      if (userInfo.role === 'unauthorized') {
        console.log('🚫 Unauthorized user, redirecting to /unauthorized');
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      if (userInfo.role === 'error') {
        console.log('💥 Error in role detection, redirecting to /error');
        return NextResponse.redirect(new URL('/error', req.url));
      }

      console.log('🎯 User role detected:', userInfo.role, 'Redirecting to:', userInfo.redirect);

      // 🎯 SIMPLIFIED REDIRECT LOGIC - No complex path matching
      const shouldRedirectToDashboard = 
        pathname === '/' || 
        pathname === '/dashboard' ||
        (userInfo.role === 'hr' && userInfo.redirect === '/hr/dashboard/dashboard' && !pathname.startsWith('/hr')) ||
        (userInfo.role === 'hr' && userInfo.redirect.includes('/hr/') && !pathname.startsWith('/hr')) ||
        (userInfo.role === 'manager' && !pathname.startsWith('/manager')) ||
        (userInfo.role === 'employee' && !pathname.startsWith('/employee')) ||
        (userInfo.role === 'admin' && !pathname.startsWith('/admin')) ||
        (userInfo.role === 'team_lead' && !pathname.startsWith('/team-lead'));

      if (shouldRedirectToDashboard) {
        console.log(`🔄 Redirecting ${userInfo.role} from ${pathname} to: ${userInfo.redirect}`);
        return NextResponse.redirect(new URL(userInfo.redirect, req.url));
      }

      // Role-based route protection with hierarchy
      const userRole = userInfo.role;
      
      // Admin can access everything
      if (userRole === 'admin') {
        // Add user info to headers
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-role', userRole);
        requestHeaders.set('x-user-id', userId);
        
        if (userInfo.data?.id) {
          requestHeaders.set('x-employee-id', userInfo.data.id);
        }

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }

      // HR can access HR routes and below
      if (userRole === 'hr') {
        if (pathname.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
      }

      // Manager can access manager routes and below
      if (userRole === 'manager') {
        if (pathname.startsWith('/admin') || pathname.startsWith('/hr')) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
      }

      // Team Lead can access team-lead routes and below
      if (userRole === 'team_lead') {
        if (pathname.startsWith('/admin') || pathname.startsWith('/hr') || pathname.startsWith('/manager')) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
      }

      // Employee can only access employee routes
      if (userRole === 'employee') {
        if (!pathname.startsWith('/employee')) {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
      }

      // Add user info to headers for API routes to use
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-role', userRole);
      requestHeaders.set('x-user-id', userId);
      
      if (userInfo.data?.id) {
        requestHeaders.set('x-employee-id', userInfo.data.id);
      }

      if (userInfo.data?.department_id) {
        requestHeaders.set('x-department-id', userInfo.data.department_id);
      }

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      console.error('❌ Middleware error:', error);
      return NextResponse.redirect(new URL('/error', req.url));
    }
  }

  // Public routes
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};