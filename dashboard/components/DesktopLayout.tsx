import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserMode } from '@/contexts/UserModeContext';
import ModeToggle, { ModeAware } from '@/components/ModeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Link, useLocation } from 'wouter';
import {
  Home,
  MessageSquare,
  TrendingUp,
  BarChart3,
  History,
  Settings,
  Shield,
  Brain,
  Database,
  Cog,
  Users,
  Target,
  FileText,
  Plus,
  Search,
  Bell,
  User,
  LogOut,
  Zap,
  Bot,
  Globe,
  GraduationCap,
  Lightbulb
} from 'lucide-react';

interface DesktopLayoutProps {
  children: React.ReactNode;
}

export default function DesktopLayout({ children }: DesktopLayoutProps) {
  const { user, logout } = useAuth();
  const { isBeginnerMode, isProMode } = useUserMode();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const beginnerNavigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: Home,
      description: 'Overview and quick stats'
    },
    { 
      name: 'Setup Wizard', 
      href: '/setup', 
      icon: GraduationCap,
      description: 'Guided setup process'
    },
    { 
      name: 'Telegram', 
      href: '/connect/telegram', 
      icon: MessageSquare,
      description: 'Connect signal channels'
    },
    { 
      name: 'MT5 Trading', 
      href: '/connect/mt5', 
      icon: TrendingUp,
      description: 'Connect trading terminal'
    },
    { 
      name: 'Performance', 
      href: '/analytics', 
      icon: BarChart3,
      description: 'Trading performance'
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      description: 'Account preferences'
    }
  ];

  const proNavigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: Home,
      description: 'System overview'
    },
    { 
      name: 'Signal Parser', 
      href: '/signals', 
      icon: Brain,
      description: 'Parse and test signals'
    },
    { 
      name: 'Trade History', 
      href: '/trades', 
      icon: Target,
      description: 'Trading records'
    },
    { 
      name: 'Telegram', 
      href: '/connect/telegram', 
      icon: Bot,
      description: 'Channel management'
    },
    { 
      name: 'MT5 Integration', 
      href: '/connect/mt5', 
      icon: Globe,
      description: 'Terminal management'
    },
    { 
      name: 'Analytics', 
      href: '/analytics', 
      icon: BarChart3,
      description: 'Advanced analytics'
    },
    { 
      name: 'History', 
      href: '/history', 
      icon: History,
      description: 'Complete history'
    },
    { 
      name: 'Training Data', 
      href: '/training', 
      icon: Database,
      description: 'ML training datasets'
    },
    ...(user?.isAdmin ? [
      { 
        name: 'Admin Panel', 
        href: '/admin', 
        icon: Shield,
        description: 'System administration'
      },
      { 
        name: 'Parser Control', 
        href: '/parser', 
        icon: Cog,
        description: 'Parser configuration'
      },
      { 
        name: 'Rule Engine', 
        href: '/rules', 
        icon: FileText,
        description: 'Custom parsing rules'
      }
    ] : []),
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings,
      description: 'User preferences'
    }
  ];

  const navigation = isBeginnerMode ? beginnerNavigation : proNavigation;

  const quickActions = isBeginnerMode ? [
    { name: 'Start Setup', icon: GraduationCap, action: () => window.location.href = '/setup' },
    { name: 'Connect Telegram', icon: MessageSquare, action: () => window.location.href = '/connect/telegram' },
    { name: 'Add MT5', icon: TrendingUp, action: () => window.location.href = '/connect/mt5' }
  ] : [
    { name: 'Parse Signal', icon: Plus, action: () => window.location.href = '/signals' },
    { name: 'Add Channel', icon: MessageSquare, action: () => window.location.href = '/connect/telegram' },
    { name: 'View Analytics', icon: BarChart3, action: () => window.location.href = '/analytics' }
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
                  <p className="text-xs text-gray-400">
                    {isBeginnerMode ? 'Beginner Mode' : 'Professional Edition'}
                  </p>
                </div>
              </div>

              {/* Navigation Pills */}
              <nav className="hidden lg:flex items-center space-x-1">
                {navigation.slice(0, isBeginnerMode ? 4 : 6).map((item) => {
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
                                  ? 'bg-blue-600 text-white shadow-lg' 
                                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
                              } transition-all duration-200 relative`}
                            >
                              <item.icon className="h-4 w-4 mr-2" />
                              {item.name}
                              {isActive && (
                                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                              )}
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-700 border-gray-600">
                          <p>{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </nav>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-4">
              {/* Mode Toggle */}
              <ModeToggle />

              {/* Search */}
              <ModeAware proOnly>
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search signals, trades..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                  />
                </div>
              </ModeAware>

              {/* Quick Actions Dropdown */}
              <div className="flex items-center space-x-2">
                {quickActions.slice(0, 2).map((action, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={action.action}
                          className="text-gray-300 hover:text-white hover:bg-gray-700"
                        >
                          <action.icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-700 border-gray-600">
                        <p>{action.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>

              {/* Notifications */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-700 relative">
                      <Bell className="h-4 w-4" />
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-xs">
                        3
                      </Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-700 border-gray-600">
                    <p>3 new notifications</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* User Menu */}
              <div className="flex items-center space-x-3 border-l border-gray-600 pl-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{user?.username}</p>
                  <p className="text-xs text-gray-400">
                    {user?.isAdmin ? 'Administrator' : 'Trader'}
                  </p>
                </div>
                
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-400 hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-700 border-gray-600">
                      <p>Logout</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb for Beginner Mode */}
      <ModeAware beginnerOnly>
        {currentPage && (
          <div className="bg-gray-800/50 border-b border-gray-700 px-6 py-2">
            <div className="flex items-center space-x-2 text-sm">
              <Home className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">/</span>
              <span className="text-blue-400">{currentPage.name}</span>
              <span className="text-gray-500 ml-4">•</span>
              <span className="text-gray-400">{currentPage.description}</span>
            </div>
          </div>
        )}
      </ModeAware>

      {/* Page Content */}
      <main className="flex-1">
        <div className="px-6 py-6">
          {children}
        </div>
      </main>

      {/* Beginner Mode Helper */}
      <ModeAware beginnerOnly>
        <div className="fixed bottom-6 right-6 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => window.location.href = '/setup'}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  size="lg"
                >
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Need Help?
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-700 border-gray-600">
                <p>Run the setup wizard again</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </ModeAware>
    </div>
  );
}