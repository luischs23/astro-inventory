"use client";

import React from "react";
import { Home, FileText, Store, Warehouse } from "lucide-react";
import { cn } from "../lib/utils"; // Asegúrate de que esta utilidad esté disponible o usa una alternativa
import { withPermission } from "./WithPermission";

interface CompanyNavbarProps {
  companyId?: string; // Añadimos companyId como prop explícita
  hasPermission?: (action: string) => boolean;
}

function CompanyNavbar({ companyId, hasPermission }: CompanyNavbarProps) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  const navItems = [
    { name: "Home", icon: Home, href: `/companies/${companyId}/home`, label: "Home" },
    { name: "Stores", icon: Store, href: `/companies/${companyId}/store`, label: "Stores" },
    { name: "Warehouses", icon: Warehouse, href: `/companies/${companyId}/warehouses`, label: "Warehouses" },
  ];

  if (hasPermission && ("create")) {
    navItems.push({ name: "Invoices", icon: FileText, href: `/companies/${companyId}/invoices`, label: "Invoices" });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white mt-10 dark:bg-gray-800 border-t shadow-lg md:top-0 md:left-0 md:h-screen md:w-16 md:border-r md:border-t-0">
      <div className="flex justify-around md:flex-col md:justify-start md:h-full md:p-4">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors",
              pathname === item.href ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-sm">{item.name}</span>
            <span className="sr-only">{item.label}</span>
          </a>
        ))}
      </div> 
    </nav>
  );
}

export default withPermission(CompanyNavbar, ["cus"]);