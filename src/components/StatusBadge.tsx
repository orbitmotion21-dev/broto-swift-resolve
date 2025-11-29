import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Loader2, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  // Map status to styling and animation
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Pending':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          className: 'animate-pulse-pending',
        };
      case 'In Progress':
        return {
          variant: 'default' as const,
          icon: Loader2,
          className: '',
          iconClassName: 'animate-spin-slow',
        };
      case 'Resolved':
        return {
          variant: 'outline' as const,
          icon: CheckCircle,
          className: 'animate-success bg-emerald-500/10 border-emerald-500/50 text-emerald-400',
        };
      case 'Waiting for Student':
        return {
          variant: 'secondary' as const,
          icon: AlertCircle,
          className: 'animate-pulse-pending',
        };
      case 'Cancelled':
      case 'Rejected':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          className: '',
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: Clock,
          className: '',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        'gap-1.5 transition-all duration-300',
        config.className,
        className
      )}
    >
      <Icon className={cn(
        'w-3 h-3',
        config.iconClassName
      )} />
      {status}
    </Badge>
  );
};
