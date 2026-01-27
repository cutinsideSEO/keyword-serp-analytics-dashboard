/**
 * Clean minimal sidebar navigation with white background
 */

import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Shield,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface SidebarProps {
  currentPage?: string;
}

const navigationItems = [
  { id: '', label: 'Home', icon: Home, href: '/', active: true, section: 'main' },
  { id: 'protect', label: 'Protect', icon: Shield, href: '/protect', active: true, section: 'main', description: 'Brand defense' },
  { id: 'discover', label: 'Discover', icon: Search, href: '/discover', active: true, section: 'main', description: 'Opportunities' },
  { id: 'analyze', label: 'Analyze', icon: BarChart3, href: '/analyze', active: true, section: 'main', description: 'Market intel' },
  { id: 'config', label: 'Configure', icon: Settings, href: '/config', active: true, section: 'settings' },
];

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
];

export function Sidebar({ currentPage }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentMarketId, availableMarkets, setCurrentMarket } = useMarketConfig();

  // Determine current page from location if not provided
  const activePage = currentPage || location.pathname.split('/')[1] || '';

  // Get current market name for display
  const currentMarket = availableMarkets.find(m => m.id === currentMarketId);

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0, width: isCollapsed ? '72px' : '240px' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen flex flex-col bg-white border-r border-gray-200"
      style={{ zIndex: 50 }}
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center justify-between">
        <motion.div
          animate={{ opacity: isCollapsed ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-gray-900 font-bold text-lg tracking-tight">BrandGuard</h1>
              <p className="text-gray-500 text-xs font-medium">Analytics Suite</p>
            </div>
          )}
        </motion.div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Market Selector */}
      {availableMarkets.length > 1 && !isCollapsed && (
        <div className="px-3 pb-4 border-b border-gray-200">
          <label className="block text-xs font-medium text-gray-500 mb-2 px-1">Market</label>
          <select
            value={currentMarketId}
            onChange={(e) => setCurrentMarket(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-gray-900 text-sm border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
          >
            {availableMarkets.map((market) => (
              <option key={market.id} value={market.id}>
                {market.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Market indicator when collapsed */}
      {isCollapsed && currentMarket && (
        <div className="px-3 pb-4 flex justify-center border-b border-gray-200">
          <div
            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xs"
            title={currentMarket.name}
          >
            {currentMarket.name.slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.id === activePage;

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => item.href && navigate(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-blue-600"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />

              {!isCollapsed && (
                <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {item.label}
                </div>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 space-y-1 border-t border-gray-200">
        {bottomItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all group relative"
            >
              <Icon className="w-5 h-5 flex-shrink-0" />

              {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
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
            className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium truncate">John Doe</p>
                <p className="text-gray-500 text-xs truncate">john@company.com</p>
              </div>
            </div>
          </motion.div>
        )}

        {isCollapsed && (
          <div className="flex justify-center pt-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
              JD
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

export default Sidebar;
