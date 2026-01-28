/**
 * Shared CompetitorsTab sub-component for drawers.
 * Groups competitors by domain type with styled headers.
 * Works for all contexts (market shows visibility_score; brand contexts show wins + avg_position).
 */

import { useMarketConfig } from '@/contexts/MarketConfigContext';
import { formatCompactNumber } from '@/utils/formatters';
import type { DrawerContext } from './HeroStats';
import type { DomainVisibilityItem } from '@/types';

interface BrandCompetitor {
  domain: string;
  domain_type: string;
  wins_count: number;
  wins_volume: number;
  avg_position: number;
}

interface CompetitorsTabProps {
  context: DrawerContext;
  /** For protection / opportunity: Record<domainType, competitor[]> */
  competitorsByType?: Record<string, BrandCompetitor[]>;
  /** For market: Record<domainType, player[]> */
  playersByType?: Record<string, DomainVisibilityItem[]>;
}

export function CompetitorsTab({ context, competitorsByType, playersByType }: CompetitorsTabProps) {
  const { getStyles, getIcon, getDomainTypeNames } = useMarketConfig();

  if (context === 'market') {
    return (
      <MarketPlayersView
        playersByType={playersByType ?? {}}
        getStyles={getStyles}
        getIcon={getIcon}
        getDomainTypeNames={getDomainTypeNames}
      />
    );
  }

  return (
    <BrandCompetitorsView
      competitorsByType={competitorsByType ?? {}}
      getStyles={getStyles}
      getIcon={getIcon}
    />
  );
}

// ── Brand competitors (protection + opportunity) ────────────────────────────

function BrandCompetitorsView({
  competitorsByType,
  getStyles,
  getIcon,
}: {
  competitorsByType: Record<string, BrandCompetitor[]>;
  getStyles: ReturnType<typeof useMarketConfig>['getStyles'];
  getIcon: ReturnType<typeof useMarketConfig>['getIcon'];
}) {
  const types = Object.keys(competitorsByType);

  if (types.length === 0) {
    return <div className="text-center py-8 text-gray-500">No competitor data available</div>;
  }

  return (
    <div className="space-y-4">
      {types.map((type) => {
        const competitors = competitorsByType[type];
        const styles = getStyles(type);
        const Icon = getIcon(type);

        return (
          <div key={type} className={`rounded-xl border ${styles.borderColor} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-4 py-3 ${styles.bgColor}`}>
              <Icon className={`w-4 h-4 ${styles.textColor}`} />
              <span className={`text-sm font-semibold ${styles.textColor}`}>{type}</span>
              <span className="text-xs text-gray-500 ml-auto">{competitors.length} domains</span>
            </div>
            <div className="divide-y divide-gray-100">
              {competitors.slice(0, 6).map((comp, i) => (
                <div
                  key={`${type}-${i}`}
                  className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{comp.domain}</div>
                    <div className="text-xs text-gray-500">
                      {comp.wins_count} wins &middot; {formatCompactNumber(comp.wins_volume)} volume
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold px-2 py-0.5 rounded ${
                      comp.avg_position <= 3
                        ? 'bg-emerald-100 text-emerald-700'
                        : comp.avg_position <= 10
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    #{(comp.avg_position ?? 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Market players (visibility-based) ───────────────────────────────────────

function MarketPlayersView({
  playersByType,
  getStyles,
  getIcon,
  getDomainTypeNames,
}: {
  playersByType: Record<string, DomainVisibilityItem[]>;
  getStyles: ReturnType<typeof useMarketConfig>['getStyles'];
  getIcon: ReturnType<typeof useMarketConfig>['getIcon'];
  getDomainTypeNames: ReturnType<typeof useMarketConfig>['getDomainTypeNames'];
}) {
  const typeNames = getDomainTypeNames();
  const hasData = typeNames.some((t) => (playersByType[t] || []).length > 0);

  if (!hasData) {
    return <div className="text-center py-8 text-gray-500">No player data available</div>;
  }

  return (
    <div className="space-y-4">
      {typeNames.map((type) => {
        const players = playersByType[type] || [];
        if (players.length === 0) return null;

        const styles = getStyles(type);
        const Icon = getIcon(type);

        return (
          <div key={type} className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Icon className={`h-4 w-4 ${styles.textColor}`} />
              {type}
            </h4>
            {players.slice(0, 5).map((player, i) => (
              <div
                key={`${type}-${i}`}
                className={`flex items-center justify-between p-3 rounded-lg ${styles.bgColor} border ${styles.borderColor}`}
              >
                <div>
                  <div className={`font-medium ${styles.textColor}`}>{player.domain}</div>
                  <div className="text-xs text-gray-500">
                    {player.win_count} wins | {formatCompactNumber(player.visibility_score || 0)}{' '}
                    visibility
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  #{player.avg_position?.toFixed(1) || 'N/A'}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default CompetitorsTab;
