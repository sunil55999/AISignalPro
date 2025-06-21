import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Menu,
  Home,
  Settings,
  BarChart3,
  MessageSquare,
  Users,
  FileText,
  LogOut,
  Zap,
  Target
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface MobileAuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function MobileAuthenticatedLayout({ children }: MobileAuthenticatedLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Signal Parser', href: '/signals', icon: MessageSquare },
    { name: 'Parser Control', href: '/parser', icon: Zap },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Trade History', href: '/trades', icon: Target },
    { name: 'Training Data', href: '/training', icon: FileText },
    ...(user?.isAdmin ? [
      { name: 'Admin Panel', href: '/admin', icon: Users },
    ] : []),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-gray-800 border-gray-700">
                <SheetHeader>
                  <SheetTitle className="text-white">Navigation</SheetTitle>
                  <SheetDescription className="text-gray-400">
                    AI Trading Signal Parser
                  </SheetDescription>
                </SheetHeader>
                
                {/* User Info */}
                <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{user?.username}</p>
                      <Badge variant={user?.isAdmin ? "default" : "secondary"} className="text-xs">
                        {user?.isAdmin ? "Admin" : "User"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="mt-6 space-y-2">
                  {navigation.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.name} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={`w-full justify-start text-left ${
                            isActive 
                              ? "bg-blue-600 text-white" 
                              : "text-gray-300 hover:text-white hover:bg-gray-700"
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          {item.name}
                        </Button>
                      </Link>
                    );
                  })}
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-gray-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            
            <h1 className="text-white font-bold text-lg">AI Parser</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-green-400 border-green-400">
              Online
            </Badge>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-gray-800 border-r border-gray-700">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 bg-gray-900">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">AI Parser</span>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{user?.username}</p>
                    <Badge variant={user?.isAdmin ? "default" : "secondary"} className="text-xs">
                      {user?.isAdmin ? "Administrator" : "User"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 pb-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start ${
                      isActive 
                        ? "bg-blue-600 text-white" 
                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                    }`}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-gray-700"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}