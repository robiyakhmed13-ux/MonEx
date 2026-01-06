import React from 'react';
import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ 
  onRefresh, 
  children, 
  className = '' 
}) => {
  const { containerRef, isRefreshing, pullDistance, shouldTrigger } = usePullToRefresh({
    onRefresh,
    threshold: 80
  });

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ 
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Pull indicator */}
      <motion.div 
        className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-50"
        style={{ 
          top: -40,
          height: 40
        }}
        animate={{
          y: pullDistance,
          opacity: pullDistance > 20 ? 1 : 0
        }}
        transition={{ duration: 0.1 }}
      >
        <motion.div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            shouldTrigger || isRefreshing 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary text-muted-foreground'
          }`}
          animate={{ 
            rotate: isRefreshing ? 360 : shouldTrigger ? 180 : pullDistance * 2,
            scale: isRefreshing ? 1.1 : 1
          }}
          transition={{ 
            rotate: isRefreshing 
              ? { duration: 1, repeat: Infinity, ease: 'linear' } 
              : { duration: 0.1 },
            scale: { duration: 0.2 }
          }}
        >
          <RefreshCw className="w-5 h-5" />
        </motion.div>
      </motion.div>

      {/* Content with transform when pulling */}
      <motion.div
        animate={{ y: isRefreshing ? 50 : pullDistance > 0 ? pullDistance : 0 }}
        transition={{ duration: isRefreshing ? 0.3 : 0.1 }}
      >
        {children}
      </motion.div>

      {/* Loading overlay */}
      {isRefreshing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/50 backdrop-blur-sm z-40 pointer-events-none"
        />
      )}
    </div>
  );
};
