/**
 * HOME Dashboard - Quick Pulse View
 * Shows all critical metrics at a glance with links to detailed sections.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Grid, Title, Text } from '@tremor/react';
import { Shield, Target, TrendingUp, Settings, ArrowRight, Loader2 } from 'lucide-react';
import { BrandPicker } from '../components/common/BrandPicker';
import { BrandHealthCard } from '../components/dashboard/BrandHealthCard';
import { OpportunityCard } from '../components/dashboard/OpportunityCard';
import { ThreatCard } from '../components/dashboard/ThreatCard';
import { InsightCard } from '../components/dashboard/InsightCard';
import { useApiWithParam } from '../hooks/useApi';
import { getHomeDashboard } from '../api/endpoints';
import type { HomeDashboard } from '../types';

export function Home() {
  const navigate = useNavigate();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    (brand: string) => getHomeDashboard(brand),
    []
  );

  const { data, loading } = useApiWithParam<HomeDashboard, string>(
    fetchDashboard,
    selectedBrand
  );

  // Health score comes from backend now
  const healthScore = data?.kpis.health_score ?? 0;

  // Top threat from KPIs
  const hasTopThreat = data?.kpis.top_threat_domain != null;

  // Quick action cards
  const quickActions = [
    {
      title: 'Brand Protection',
      description: 'View detailed brand defense metrics',
      icon: Shield,
      color: 'from-blue-500 to-blue-600',
      href: '/protect',
    },
    {
      title: 'Find Opportunities',
      description: 'Discover uncaptured keywords',
      icon: Target,
      color: 'from-emerald-500 to-emerald-600',
      href: '/discover',
    },
    {
      title: 'Market Analysis',
      description: 'See market share and trends',
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      href: '/analyze',
    },
    {
      title: 'Configure',
      description: 'Manage brand-domain mapping',
      icon: Settings,
      color: 'from-gray-500 to-gray-600',
      href: '/config',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Quick pulse check on your brand health
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 min-w-[280px]">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Brand
          </label>
          <BrandPicker
            value={selectedBrand}
            onChange={setSelectedBrand}
            minKeywords={3}
            minVolume={100}
            placeholder="Choose a brand..."
          />
        </div>
      </div>

      {/* No Brand Selected State */}
      {!selectedBrand && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-blue-900 mb-2">
            Welcome to BrandGuard
          </h2>
          <p className="text-blue-700 mb-6 max-w-md mx-auto">
            Select a brand above to see your brand health metrics, opportunities, and threats at a glance.
          </p>

          {/* Quick Actions Grid */}
          <Grid numItemsMd={4} className="gap-4 max-w-4xl mx-auto mt-8">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => navigate(action.href)}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all text-left group"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br ${action.color}`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-xs text-gray-500">{action.description}</p>
                  <ArrowRight className="w-4 h-4 text-gray-400 mt-2 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </motion.button>
              );
            })}
          </Grid>
        </motion.div>
      )}

      {/* Loading State */}
      {selectedBrand && loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      )}

      {/* Dashboard Content */}
      {selectedBrand && data && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Brand Name Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <Text className="text-blue-100 mb-1">Monitoring</Text>
                <Title className="text-white text-2xl">{data.brand_name}</Title>
                {data.brand_domains.length > 0 && (
                  <p className="text-blue-100 text-sm mt-1">
                    {data.brand_domains.join(', ')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{data.kpis.health_grade}</div>
                <p className="text-blue-100 text-sm">brand health grade</p>
              </div>
            </div>
          </div>

          {/* Domain Mapping Warning */}
          {!data.has_domain_mapping && (
            <InsightCard
              priority="warning"
              title="No domains mapped for this brand"
              description="All branded keywords will show as losses until you map the brand's domain in Configure."
              onAction={() => navigate('/config')}
              actionLabel="Configure"
            />
          )}

          {/* KPI Cards Row */}
          <Grid numItemsMd={3} className="gap-6">
            <BrandHealthCard
              score={healthScore}
              winRateKeywords={data.kpis.win_rate_keywords}
              winRateVolume={data.kpis.win_rate_volume}
              onClick={() => navigate('/protect')}
            />
            <OpportunityCard
              volume={data.kpis.volume_at_risk}
              keywords={data.kpis.keywords_at_risk}
              onClick={() => navigate('/protect')}
            />
            {hasTopThreat && (
              <ThreatCard
                domain={data.kpis.top_threat_domain!}
                domainType={data.kpis.top_threat_domain_type}
                keywords={data.kpis.top_threat_keywords}
                volume={data.kpis.top_threat_volume}
                onClick={() => navigate('/protect')}
              />
            )}
          </Grid>

          {/* Insights Section */}
          {data.kpis.keywords_at_risk > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Top Insights</h3>

              {healthScore < 50 && (
                <InsightCard
                  priority="critical"
                  title="Brand health is critical"
                  description={`You're winning only ${data.kpis.win_rate_keywords.toFixed(0)}% of your branded keywords.`}
                  volume={data.kpis.volume_at_risk}
                  keywords={data.kpis.keywords_at_risk}
                  onAction={() => navigate('/protect')}
                  actionLabel="View Losses"
                />
              )}

              {hasTopThreat && data.kpis.top_threat_keywords > 10 && (
                <InsightCard
                  priority="warning"
                  title={`${data.kpis.top_threat_domain} is taking your traffic`}
                  description={`This ${data.kpis.top_threat_domain_type || 'competitor'} is winning ${data.kpis.top_threat_keywords} of your branded keywords.`}
                  volume={data.kpis.top_threat_volume}
                  onAction={() => navigate('/protect')}
                  actionLabel="Analyze"
                />
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  onClick={() => navigate(action.href)}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${action.color} flex-shrink-0`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm">{action.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{action.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default Home;
