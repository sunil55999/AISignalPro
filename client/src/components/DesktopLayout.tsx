import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  Settings,
  BarChart3,
  MessageSquare,
  Users,
  FileText,
  LogOut,
  Zap,
  Target,
  Bell,
  Search,
  Plus,
  ChevronDown,
  Activity,
  Shield,
  Database,
  Globe
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';

interface DesktopLayoutProps {
  children: React.ReactNode;
}

export default function DesktopLayout({ children }: DesktopLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: Home,
      description: 'Overview and metrics'
    },
    { 
      name: 'Signal Parser', 
      href: '/signals', 
      icon: MessageSquare,
      description: 'Parse trading signals'
    },
    { 
      name: 'Parser Control', 
      href: '/parser', 
      icon: Zap,
      description: 'Configure parser settings'
    },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: BarChart3,
      description: 'Performance analytics'
    },
    { 
      name: 'Trade History', 
      href: '/trades', 
      icon: Target,
      description: 'Trading records'
    },
    { 
      name: 'Training Data', 
      href: '/training', 
      icon: FileText,
      description: 'ML training datasets'
    },
    ...(user?.isAdmin ? [
      { 
        name: 'Admin Panel', 
        href: '/admin', 
        icon: Users,
        description: 'System administration'
      },
    ] : []),
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      description: 'User preferences'
    },
  ];

  const quickActions = [
    { name: 'Parse Signal', icon: Plus, action: () => window.location.href = '/signals' },
    { name: 'Add Channel', icon: MessageSquare, action: () => window.location.href = '/admin' },
    { name: 'Generate Report', icon: FileText, action: () => console.log('Generate report') },
  ];

  const handleLogout = () => {
    logout();
  };

  const currentPage = navigation.find(nav => nav.href === location);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">AI Trading Parser</h1>
                  <p className="text-xs text-gray-400">Professional Edition</p>
                </div>
              </div>

              {/* Navigation Pills */}
              <nav className="hidden lg:flex items-center space-x-1">
                {navigation.slice(0, 6).map((item) => {
                  const isActive = location === item.href;
                  return (
                    <TooltipProvider key={item.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            <Button
                              variant={isActive ? "default" : "ghost"}
                              size="sm"
                              className={`${
                                isActive 
                                  ? "bg-blue-600 text-white shadow-lg" 
                                  : "text-gray-300 hover:text-white hover:bg-gray-700"
                              } transition-all duration-200`}
                            >
                              <item.icon className="h-4 w-4 mr-2" />
                              {item.name}
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </nav>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center space-x-4">
              {/* Global Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search signals, channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Quick Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Actions
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-gray-800 border-gray-700">
                  <DropdownMenuLabel className="text-gray-300">Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  {quickActions.map((action) => (
                    <DropdownMenuItem 
                      key={action.name}
                      onClick={action.action}
                      className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
                    >
                      <action.icon className="h-4 w-4 mr-2" />
                      {action.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative text-gray-300 hover:text-white">
                      <Bell className="h-5 w-5" />
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>3 new notifications</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-white">{user?.username}</p>
                      <p className="text-xs text-gray-400">
                        {user?.isAdmin ? "Administrator" : "User"}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700" align="end">
                  <DropdownMenuLabel className="text-gray-300">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Account</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem className="text-gray-300 hover:bg-gray-700 hover:text-white">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-gray-300 hover:bg-gray-700 hover:text-white">
                    <Activity className="h-4 w-4 mr-2" />
                    Activity Log
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Secondary Sidebar */}
        <aside className="hidden xl:block w-64 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700">
          <div className="p-6">
            {/* Current Page Info */}
            {currentPage && (
              <Card className="bg-gray-700/50 border-gray-600 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center">
                    <currentPage.icon className="h-5 w-5 mr-2" />
                    {currentPage.name}
                  </CardTitle>
                  <p className="text-gray-400 text-sm">{currentPage.description}</p>
                </CardHeader>
              </Card>
            )}

            {/* System Status */}
            <Card className="bg-gray-700/50 border-gray-600 mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Parser Engine</span>
                  <Badge className="bg-green-600 text-white">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Database</span>
                  <Badge className="bg-green-600 text-white">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">MT5 Bridge</span>
                  <Badge className="bg-blue-600 text-white">Ready</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Today's Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Signals Parsed</span>
                  <span className="text-white font-mono">247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Trades Executed</span>
                  <span className="text-white font-mono">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Success Rate</span>
                  <span className="text-green-400 font-mono">89.2%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-gray-400 text-sm">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Connected to 3 channels</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Last signal: 2 min ago</span>
            </div>
          </div>
          <div className="text-gray-400 text-sm">
            AI Trading Signal Parser v2.0 • Professional Edition
          </div>
        </div>
      </footer>
    </div>
  );
}