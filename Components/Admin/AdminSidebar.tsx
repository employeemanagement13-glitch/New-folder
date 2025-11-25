// components/AdminSidebar.tsx
"use client"
import React from 'react';
import Sidebar from '../Sidebar';
import { SidebarItem } from '../Sidebar';
import { 
    LayoutDashboard, 
    Users, 
    Building, 
    Calendar, 
    FileText, 
    ExternalLink
} from 'lucide-react';

interface AdminSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    userName?: string;
    userEmail?: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ 
    isOpen, 
    setIsOpen, 
    userName,
    userEmail 
}) => {
    // Admin navigation items based on your employee management structure
    const adminItems: SidebarItem[] = [
    {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard
    },
    {
        title: 'Employee Management',
        href: '/admin/employee-management',
        icon: Users
    },
    {
        title: 'Department Management',
        href: '/admin/departments',
        icon: Building
    },
    {
        title: 'Attendance',
        href: '/admin/attendance',
        icon: Calendar
    },
    {
        title: 'Leave Management',
        href: '/admin/leaves',
        icon: FileText
    },
    {
        title: 'Payroll Management',
        href: '/admin/paroll',
        icon: ExternalLink,
        // external: true
    },
    {
        title: 'Notifications Management',
        href: '/admin/notifications',
        icon: ExternalLink,
        // external: true
    },
    {
        title: 'Role Management',
        href: '/admin/rolemanagement',
        icon: ExternalLink,
        // external: true
    },
    // ... other simple links
];

    return (
        <Sidebar
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            items={adminItems}
            role="admin"
            userName={userName}
            userEmail={userEmail}
        />
    );
};

export default AdminSidebar;