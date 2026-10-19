import React from 'react';
import {
  Droplets,
  CloudRain,
  Trash2,
  Sparkles,
  Route as RoadIcon,
  Lightbulb,
  Building2,
  TreePine,
  Zap,
  Volume2,
  Compass,
} from 'lucide-react';

export interface DeptIconConfig {
  icon: React.ReactNode;
  gradient: string;
  shadow: string;
  color: string;
}

/**
 * Normalized lookup mapping for departments to service-grid style icons and colors.
 */
export const getDeptIconConfig = (slugOrName?: string | null): DeptIconConfig => {
  const key = (slugOrName || '').toLowerCase().trim();

  if (key.includes('green') || key.includes('उद्यान') || key.includes('park')) {
    return {
      icon: <TreePine size={18} />,
      gradient: 'linear-gradient(135deg, #15803d, #16a34a)',
      shadow: 'rgba(22,163,74,0.3)',
      color: '#15803d',
    };
  }

  if (key.includes('water') || key.includes('जल') || key.includes('pani') || key.includes('supply')) {
    return {
      icon: <Droplets size={18} />,
      gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)',
      shadow: 'rgba(2,132,199,0.3)',
      color: '#0284c7',
    };
  }

  if (key.includes('rain') || key.includes('drain') || key.includes('flood') || key.includes('वर्षा') || key.includes('बाढ़')) {
    return {
      icon: <CloudRain size={18} />,
      gradient: 'linear-gradient(135deg, #4338ca, #6366f1)',
      shadow: 'rgba(99,102,241,0.3)',
      color: '#4338ca',
    };
  }

  if (key.includes('cnd') || key.includes('c&d') || key.includes('debris') || key.includes('मलबा') || key.includes('demolition')) {
    return {
      icon: <Trash2 size={18} />,
      gradient: 'linear-gradient(135deg, #92400e, #b45309)',
      shadow: 'rgba(180,83,9,0.3)',
      color: '#92400e',
    };
  }

  if (key.includes('clean') || key.includes('swachh') || key.includes('safai') || key.includes('कचरा') || key.includes('सफाई') || key.includes('solid')) {
    return {
      icon: <Sparkles size={18} />,
      gradient: 'linear-gradient(135deg, #059669, #10b981)',
      shadow: 'rgba(5,150,105,0.3)',
      color: '#059669',
    };
  }

  if (key.includes('road') || key.includes('सड़क') || key.includes('pothole') || key.includes('path')) {
    return {
      icon: <RoadIcon size={18} />,
      gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)',
      shadow: 'rgba(239,68,68,0.3)',
      color: '#b91c1c',
    };
  }

  if (key.includes('light') || key.includes('street') || key.includes('बिजली') || key.includes('बत्ती') || key.includes('lamp')) {
    return {
      icon: <Lightbulb size={18} />,
      gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      shadow: 'rgba(217,119,6,0.3)',
      color: '#d97706',
    };
  }

  if (key.includes('sewage') || key.includes('सीवर') || key.includes('drainage') || key.includes('nala')) {
    return {
      icon: <Compass size={18} />,
      gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
      shadow: 'rgba(109,40,217,0.3)',
      color: '#6d28d9',
    };
  }

  if (key.includes('electric') || key.includes('power') || key.includes('current')) {
    return {
      icon: <Zap size={18} />,
      gradient: 'linear-gradient(135deg, #eab308, #ca8a04)',
      shadow: 'rgba(202,138,4,0.3)',
      color: '#ca8a04',
    };
  }

  if (key.includes('noise') || key.includes('ध्वनि') || key.includes('sound')) {
    return {
      icon: <Volume2 size={18} />,
      gradient: 'linear-gradient(135deg, #ea580c, #f97316)',
      shadow: 'rgba(234,88,12,0.3)',
      color: '#ea580c',
    };
  }

  // Fallback: Default civic organization icon
  return {
    icon: <Building2 size={18} />,
    gradient: 'linear-gradient(135deg, #146C94, #19A7CE)',
    shadow: 'rgba(20,108,148,0.3)',
    color: '#146C94',
  };
};

/**
 * Service-Grid style icon badge component for any department
 */
export const DepartmentServiceIcon: React.FC<{
  slugOrName?: string | null;
  size?: number;
  iconSize?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ slugOrName, size = 36, iconSize, className, style }) => {
  const conf = getDeptIconConfig(slugOrName);
  const actualIconSize = iconSize || Math.round(size * 0.52);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: conf.gradient,
        color: '#ffffff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 2px 8px ${conf.shadow}`,
        flexShrink: 0,
        ...style,
      }}
    >
      {React.isValidElement(conf.icon)
        ? React.cloneElement(conf.icon as React.ReactElement<{ size?: number }>, {
            size: actualIconSize,
          })
        : conf.icon}
    </div>
  );
};
