// Components/Sidebar.tsx
"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NavigationItem, getRoleDisplayName } from '@/lib/navigation-data';
import { SignOutButton } from "@clerk/nextjs";

export interface SidebarItem extends NavigationItem { }

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  items: SidebarItem[];
  role: "admin" | "hr" | "manager" | "employee";
  userName?: string;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  items,
  role,
  userName,
  userEmail,
}) => {
  const pathname = usePathname();

  const handleSignOut = () => {
    console.log("Sign out clicked");
    // Add your sign out logic here
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  console.log('🔍 Sidebar Debug:', {
    isOpen,
    itemsCount: items.length,
    currentPath: pathname,
    role
  });

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed lg:static inset-y-0 left-0 z-50
          bg-[#111111] border-r border-[#333333]
          transform transition-all duration-300 ease-in-out
          flex flex-col
          ${isOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Header */}
        <div
          className={`flex items-center ${isOpen ? "justify-between p-6" : "justify-center p-4"
            } border-b border-[#333333]`}
        >
          {isOpen ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#ff9d00] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">EMS</span>
              </div>
              <div>
                <div className="text-white font-semibold text-sm">
                  {getRoleDisplayName(role)}
                </div>
                <div className="text-gray-400 text-xs">
                  {userName || "User"}
                </div>
                {/* {userEmail && (
                  <div className="text-gray-500 text-xs truncate max-w-[160px]">
                    {userEmail}
                  </div>
                )} */}
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-[#ff9d00] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-base">E</span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            console.log(`🔗 ${item.title}: ${item.href} | Active: ${isActive}`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center ${isOpen
                    ? "space-x-3 px-3 justify-start"
                    : "justify-center px-2"
                  } 
                py-3 rounded-lg text-sm font-medium transition-colors group relative
                ${isActive
                    ? "bg-[#ff9d00] text-black"
                    : "text-gray-300 hover:bg-[#333333] hover:text-white"
                  }`}
                title={!isOpen ? item.title : undefined}
              >
                <Icon
                  className={`transition-all duration-300 ${isOpen ? "w-5 h-5" : "w-4 h-4"
                    }`}
                />
                {isOpen && <span className="text-[12px]">{item.title}</span>}

                {!isOpen && (
                  <div className="absolute hidden left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {item.title}
                  </div>
                )}

                {isOpen && item.external && (
                  <span className="ml-auto text-[12px] opacity-60">↗</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className={`p-4 border-t border-[#333333] ${!isOpen ? "flex justify-center" : ""
            }`}
        >
            {isOpen && <SignOutButton>
              <div
                className={`flex items-center ${isOpen ? "space-x-3 justify-start" : "justify-center"
                  } w-full rounded-lg px-4 py-3 cursor-pointer text-sm font-medium text-gray-300 
              hover:bg-[#333333] hover:text-white transition-colors`}
                title={!isOpen ? "Sign Out" : undefined}
              >
                {isOpen && 
                <div className="flex gap-3">
                  <LogOut
              className={`transition-all duration-300 ${
                isOpen ? "w-5 h-5" : "w-4 h-4"
              }`}
            /> <span>Sign Out</span> 
            </div>}
              </div>
            </SignOutButton>
            }
          </div>
      </div>
    </>
  );
};

export default Sidebar;