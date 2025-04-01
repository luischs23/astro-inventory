// src/components/CompanySidebar.tsx
"use client";

import React from "react";
import { cn } from "../lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { ScrollArea } from "./ui/ScrollArea";
import { Store, Warehouse, FileText, Users, User, Home, BookTemplate } from "lucide-react";
import { withPermission } from "../components/WithPermission";
import type { LucideIcon } from "lucide-react";

interface MenuItem {
  name: string;
  icon: LucideIcon;
  href: string;
  requiredPermission: string;
}

interface CompanySidebarInnerProps {
  companyId: string;
  hasPermission: (action: string) => boolean;
}

interface CompanySidebarProps {
  companyId: string;
}

const menuItems: MenuItem[] = [
  { name: "Home", icon: Home, href: "/home", requiredPermission: "read" },
  { name: "Stores", icon: Store, href: "/store", requiredPermission: "read" },
  { name: "Warehouses", icon: Warehouse, href: "/warehouses", requiredPermission: "read" },
  { name: "Invoices", icon: FileText, href: "/invoices", requiredPermission: "create" },
  { name: "Templates", icon: BookTemplate, href: "/templates", requiredPermission: "create" },
  { name: "Users", icon: Users, href: "/users", requiredPermission: "create" },
  { name: "Profile", icon: User, href: "/profile", requiredPermission: "read" },
];

const CompanySidebarInner: React.FC<CompanySidebarInnerProps> = ({ companyId, hasPermission }) => {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const filteredMenuItems = menuItems.filter((item) => hasPermission(item.requiredPermission));

  return (
    <aside className="flex flex-col w-64 bg-white dark:bg-gray-800 border-r h-screen shadow-lg">
      <div className="flex flex-col h-full">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Company Dashboard</h2>
        </div>
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-2 p-4">
            {filteredMenuItems.map((item) => (
              <a
                key={item.href}
                href={`/companies/${companyId}${item.href}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  pathname === `/companies/${companyId}${item.href}`
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </a>
            ))}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
};

export default withPermission(CompanySidebarInner, ["read"]) as React.FC<CompanySidebarProps>;