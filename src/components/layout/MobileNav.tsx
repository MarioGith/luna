"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  X, 
  Home, 
  Mic, 
  FileText, 
  Brain, 
  Users, 
  BarChart3, 
  Settings,
  Headphones,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Record", href: "/record", icon: Mic },
  { name: "Transcripts", href: "/transcripts", icon: FileText },
  { name: "Knowledge", href: "/knowledge", icon: Brain },
  { name: "Speakers", href: "/speakers", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const knowledgeSubnav = [
  { name: "Entities", href: "/knowledge/entities", icon: Database },
  { name: "Extractions", href: "/knowledge/extractions", icon: Brain },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  // Close menu when pathname changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">AudioKnowledge</h1>
                <p className="text-xs text-gray-500">Personal Audio System</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-700 hover:text-indigo-700 hover:bg-gray-50"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5",
                        pathname === item.href
                          ? "text-indigo-700"
                          : "text-gray-400"
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Knowledge submenu */}
            {pathname.startsWith("/knowledge") && (
              <div className="mt-6">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Knowledge Management
                </div>
                <ul className="mt-2 space-y-1">
                  {knowledgeSubnav.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors pl-6",
                          pathname === item.href
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-gray-700 hover:text-indigo-700 hover:bg-gray-50"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4",
                            pathname === item.href
                              ? "text-indigo-700"
                              : "text-gray-400"
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
