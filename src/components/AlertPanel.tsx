import React from 'react';
import { Bell, Info, AlertCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AlertPanelProps {
  alerts: string[];
}

const AlertPanel: React.FC<AlertPanelProps> = ({ alerts }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-blue-500" />
        <h3 className="font-bold text-gray-900">Live Alerts</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        <AnimatePresence initial={false}>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No active alerts</p>
            </div>
          ) : (
            alerts.map((alert, index) => (
              <motion.div
                key={`${alert}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn(
                  "p-3 rounded-lg border flex gap-3 items-start",
                  alert.includes("Rerouting") ? "bg-blue-50 border-blue-100 text-blue-700" :
                  alert.includes("Traffic") ? "bg-red-50 border-red-100 text-red-700" :
                  "bg-amber-50 border-amber-100 text-amber-700"
                )}
              >
                {alert.includes("AI") ? (
                  <Zap className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <div className="text-sm font-medium">{alert}</div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AlertPanel;
