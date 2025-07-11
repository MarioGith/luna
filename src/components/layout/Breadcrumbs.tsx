"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const pathname = usePathname();
  
  // Generate breadcrumb items from the current path
  const pathSegments = pathname.split("/").filter(Boolean);
  
  const breadcrumbs = [
    { name: "Home", href: "/", icon: Home },
    ...pathSegments.map((segment, index) => {
      const href = "/" + pathSegments.slice(0, index + 1).join("/");
      const name = segment.charAt(0).toUpperCase() + segment.slice(1);
      return { name, href, icon: undefined };
    }),
  ];

  // Don't show breadcrumbs on home page
  if (pathname === "/") {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />}
          
          {index === 0 ? (
            <Link
              href={item.href}
              className="flex items-center hover:text-gray-900 transition-colors"
            >
              {item.icon && <item.icon className="h-4 w-4 mr-1" />}
              <span className="hidden sm:inline">{item.name}</span>
            </Link>
          ) : index === breadcrumbs.length - 1 ? (
            <span className="text-gray-900 font-medium">{item.name}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-gray-900 transition-colors"
            >
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
