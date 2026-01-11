/**
 * Reusable tooltip component for displaying help information
 */

import { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  description: string;
  calculation?: string;
}

export function InfoTooltip({ title, description, calculation }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="ml-2 text-gray-400 hover:text-blue-600 transition-colors"
        type="button"
      >
        <Info className="w-4 h-4" />
      </button>

      {isVisible && (
        <div className="absolute z-50 left-0 top-6 w-80 p-4 bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700">
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-blue-400">{title}</h4>
            <p className="text-xs leading-relaxed text-gray-300">{description}</p>
            {calculation && (
              <>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <p className="text-xs font-semibold text-gray-400 mb-1">How it's calculated:</p>
                  <p className="text-xs leading-relaxed text-gray-300 font-mono bg-gray-800 p-2 rounded">
                    {calculation}
                  </p>
                </div>
              </>
            )}
          </div>
          {/* Arrow pointing up */}
          <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-900 border-l border-t border-gray-700 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}

export default InfoTooltip;
