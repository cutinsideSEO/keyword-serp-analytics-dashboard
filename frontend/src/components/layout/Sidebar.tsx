/**
 * Modern sidebar navigation with glassmorphism effect
 */

import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Shield,
  TrendingUp,
  Users,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  currentPage?: string;
}

const navigationItems = [
  { id: 'market-overview', label: 'Market Overview', icon: Globe, href: '/market-overview', active: true },
  { id: 'brand-protection', label: 'Brand Protection', icon: Shield, href: '/brand-protection', active: true },
  { id: 'category-opportunities', label: 'Category Opportunities', icon: Layers, href: '/category-opportunities', active: true },
  { id: 'config', label: 'Configuration', icon: Settings, href: '/config', active: true },
  { id: 'categories', label: 'Categories', icon: LayoutDashboard, comingSoon: true },
  { id: 'competitors', label: 'Competitors', icon: Users, comingSoon: true },
  { id: 'trends', label: 'Trends', icon: TrendingUp, comingSoon: true },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
];

export function Sidebar({ currentPage }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current page from location if not provided
  const activePage = currentPage || location.pathname.split('/')[1] || 'market-overview';

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0, width: isCollapsed ? '80px' : '280px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0A1628 0%, #1A2B4A 100%)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
        zIndex: 50,
      }}
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center justify-between">
        <motion.div
          animate={{ opacity: isCollapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">BrandGuard</h1>
              <p className="text-blue-300 text-xs font-medium">Analytics Suite</p>
            </div>
          )}
        </motion.div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.id === activePage;

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => item.href && !item.comingSoon && navigate(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-blue-200 hover:bg-white/5 hover:text-white'
              }`}
              disabled={item.comingSoon}
              style={{
                cursor: item.comingSoon ? 'not-allowed' : 'pointer',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                  style={{
                    background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />

              {!isCollapsed && (
                <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
              )}

              {!isCollapsed && item.comingSoon && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  SOON
                </span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-navy-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                  {item.comingSoon && (
                    <span className="ml-2 text-xs text-amber-300">(Coming Soon)</span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 space-y-1 border-t border-white/10">
        {bottomItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-200 hover:bg-white/5 hover:text-white transition-all group relative"
            >
              <Icon className="w-5 h-5 flex-shrink-0" />

              {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-navy-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}

        {/* User Profile */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">John Doe</p>
                <p className="text-blue-300 text-xs truncate">john@company.com</p>
              </div>
            </div>
          </motion.div>
        )}

        {isCollapsed && (
          <div className="flex justify-center pt-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              JD
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

export default Sidebar;
