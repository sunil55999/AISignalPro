import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard,
  Radio,
  TrendingUp,
  Settings,
  Shield,
  Database,
  Brain,
  Activity,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userRole] = useState("admin"); // Mock user role - in real app would come from auth

  const userNavItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Overview and performance"
    },
    {
      title: "Live Signals",
      href: "/signals",
      icon: Radio,
      description: "Real-time signal feed",
      badge: "Live"
    },
    {
      title: "Trade History",
      href: "/trades",
      icon: TrendingUp,
      description: "Executed trades and P&L"
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      description: "Risk and preferences"
    }
  ];

  const adminNavItems = [
    {
      title: "Admin Panel",
      href: "/admin",
      icon: Shield,
      description: "System administration"
    },
    {
      title: "Parser Control",
      href: "/parser",
      icon: Brain,
      description: "AI model management"
    },
    {
      title: "System Logs",
      href: "/logs",
      icon: Activity,
      description: "Execution and audit logs"
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: Database,
      description: "Performance analytics"
    }
  ];

  const allNavItems = userRole === "admin" ? [...userNavItems, ...adminNavItems] : userNavItems;

  return (
    <div className={cn(
      "flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Signal Copier</h1>
              <p className="text-xs text-gray-400">AI Trading Assistant</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {allNavItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start h-auto p-3 text-left transition-all",
                  isActive 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-gray-300 hover:text-white hover:bg-gray-800",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("w-5 h-5", !collapsed && "mr-3")} />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-800 p-2">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin User</p>
                <p className="text-xs text-gray-400 truncate">admin@trading.com</p>
              </div>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          className={cn(
            "w-full text-gray-300 hover:text-white hover:bg-gray-800",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className={cn("w-4 h-4", !collapsed && "mr-3")} />
          {!collapsed && "Sign Out"}
        </Button>
      </div>

      {/* Status Indicator */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">System Operational</span>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-xs text-gray-400">Parser Active</span>
          </div>
        </div>
      )}
    </div>
  );
}