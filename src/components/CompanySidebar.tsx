// src/components/CompanySidebar.tsx
"use client";

import React, { useState } from "react";
import { cn } from "../lib/utils"; // Asegúrate de que esta utilidad esté disponible
import { ThemeToggle } from "./ThemeToggle"; // Ajusta la ruta según tu estructura
import { Button } from "./ui/Button"; // Ajusta la ruta
import { ScrollArea } from "./ui/ScrollArea"; // Ajusta la ruta
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet/Sheet"; // Ajusta la ruta
import { Store, Warehouse, FileText, Users, User, Menu, Home, BookTemplate } from "lucide-react";
import { withPermission } from "./WithPermission";
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
  companyId?: string;
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
  const [open, setOpen] = useState(false);

  const filteredMenuItems = menuItems.filter((item) => hasPermission(item.requiredPermission));

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden fixed left-4 top-4 z-40">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SidebarContent companyId={companyId} pathname={pathname} menuItems={filteredMenuItems} />
        </SheetContent>
      </Sheet>

      <aside className="hidden md:flex flex-col w-64 bg-background border-r fixed h-screen top-0 left-0 z-50 shadow-lg">
        <SidebarContent companyId={companyId} pathname={pathname} menuItems={filteredMenuItems} />
      </aside>
    </>
  );
};

function SidebarContent({ companyId, pathname, menuItems }: { companyId: string; pathname: string; menuItems: MenuItem[] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Company Dashboard</h2>
      </div>
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-2 p-4">
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={`/companies/${companyId}${item.href}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === `/companies/${companyId}${item.href}`
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-secondary/80"
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
  );
}

export default withPermission(CompanySidebarInner, ["read"]) as React.FC<CompanySidebarProps>;