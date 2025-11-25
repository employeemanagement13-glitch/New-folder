// components/AdminNavbar.tsx
"use client"
import React from 'react';
import { UserButton } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { PanelRight, Bell, Search } from 'lucide-react';
import Link from 'next/link';

interface AdminNavbarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    pageTitle?: string;
}

const AdminNavbar: React.FC<AdminNavbarProps> = ({ 
    sidebarOpen, 
    setSidebarOpen, 
    pageTitle = "HR Admin Dashboard" 
}) => {
    const { isLoaded, user } = useUser();
    
    return (
        <header className="bg-[#111111] border-b border-[#333333] p-4 lg:p-6">
            <div className="flex items-center justify-between">
                {/* Left Section */}
                <div className="flex items-center space-x-4">
                    {/* Sidebar Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg hover:bg-[#333333] transition-colors"
                        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                    >
                        <PanelRight className="w-5 h-5 text-white" />
                    </button>
                    
                    {/* Page Title */}
                    <div className="text-xl font-semibold text-white">
                        {pageTitle}
                    </div>
                </div>

                {/* Right Section */}
                <div className="flex items-center space-x-4">
                    {/* Notifications */}
                    <Link href={'/admin/notifications'} className="relative p-2 rounded-lg hover:bg-[#333333] transition-colors">
                        <Bell className="w-5 h-5 text-white" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            3
                        </span>
                    </Link>

                    {/* User Profile */}
                    <div className="bg-black rounded-full p-1 pl-4 flex items-center space-x-2 shadow-inner shadow-gray-700/50">
                        <div className="text-sm font-medium text-white">Admin</div>
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer">
                            <UserButton 
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-8 h-8",
                                        userButtonOuterIdentifier: "text-sm"
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Search Bar */}
            {/* <div className="md:hidden mt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-black text-white pl-10 pr-4 py-2 rounded-lg border border-[#333333] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div> */}
        </header>
    );
};

export default AdminNavbar;