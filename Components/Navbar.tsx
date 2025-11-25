"use client"
import React from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import { PanelRight, PanelLeft, Bell } from 'lucide-react';
import Link from 'next/link';
import { getRoleDisplayName } from '@/lib/navigation-data';

interface NavbarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    userRole: 'admin' | 'hr' | 'manager' | 'employee';
}

const Navbar: React.FC<NavbarProps> = ({ 
    sidebarOpen, 
    setSidebarOpen, 
    userRole 
}) => {
    const { isLoaded, user } = useUser();
    
    const handleToggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <header className="bg-[#111111] border-b border-[#333333] p-4 lg:p-6">
            <div className="flex items-center justify-between">
                {/* Left Section - Only sidebar toggle */}
                <div className="flex items-center space-x-4">
                    {/* Sidebar Toggle Button */}
                    <button
                        onClick={handleToggleSidebar}
                        className="p-2 rounded-lg hover:bg-[#333333] transition-colors"
                        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        {sidebarOpen ? (
                            <PanelLeft className="w-5 h-5 text-white" />
                        ) : (
                            <PanelRight className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>

                {/* Right Section */}
                <div className="flex items-center space-x-4">
                    {/* User Profile */}
                    <div className="bg-black rounded-full p-1 pl-4 flex items-center space-x-2 shadow-inner shadow-gray-700/50">
                        <div className="text-sm font-medium text-white">
                            {getRoleDisplayName(userRole)}
                        </div>
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
        </header>
    );
};

export default Navbar;