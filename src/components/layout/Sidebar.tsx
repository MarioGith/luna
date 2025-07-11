"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Headphones className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Luna</h1>
            <p className="text-xs text-gray-500">Audio Transcription</p>
          </div>
        </div>
      </div>
      
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      pathname === item.href
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-700 hover:text-indigo-700 hover:bg-gray-50",
                      "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                    )}
                  >
                    <item.icon
                      className={cn(
                        pathname === item.href
                          ? "text-indigo-700"
                          : "text-gray-400 group-hover:text-indigo-700",
                        "h-6 w-6 shrink-0"
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          
          {/* Knowledge submenu */}
          {pathname.startsWith("/knowledge") && (
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400">
                Knowledge Management
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {knowledgeSubnav.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        pathname === item.href
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-700 hover:text-indigo-700 hover:bg-gray-50",
                        "group flex gap-x-3 rounded-md p-2 pl-9 text-sm leading-6 font-semibold"
                      )}
                    >
                      <item.icon
                        className={cn(
                          pathname === item.href
                            ? "text-indigo-700"
                            : "text-gray-400 group-hover:text-indigo-700",
                          "h-6 w-6 shrink-0"
                        )}
                      />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
}
