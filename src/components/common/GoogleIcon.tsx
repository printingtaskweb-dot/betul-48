import React from 'react';

export const EMOJI_TO_ICON_MAP: Record<string, string> = {
  // Departments & Civic Services
  '🌿': 'eco',
  '🌱': 'eco',
  '🌳': 'park',
  '🌲': 'forest',
  '💧': 'water_drop',
  '🚰': 'water_damage',
  '🌊': 'waves',
  '🌧️': 'rainy',
  '🌧': 'rainy',
  '🏗️': 'construction',
  '🏗': 'construction',
  '🧹': 'cleaning_services',
  '✨': 'auto_awesome',
  '🛣️': 'edit_road',
  '🛣': 'edit_road',
  '🚗': 'directions_car',
  '💡': 'lightbulb',
  '⚡': 'bolt',
  '🔌': 'power',
  '🗑️': 'delete',
  '🗑': 'delete',
  '🚿': 'shower',
  '🏢': 'apartment',
  '🏥': 'local_hospital',
  '🚒': 'fire_truck',
  '🚌': 'directions_bus',
  '🐕': 'pets',
  '🔊': 'volume_up',

  // Roles, Authority & Tiers
  '👑': 'admin_panel_settings',
  '🏛️': 'account_balance',
  '🏛': 'account_balance',
  '📍': 'pin_drop',
  '🎯': 'my_location',
  '👤': 'person',
  '👥': 'groups',
  '👷': 'engineering',
  '🛠️': 'construction',
  '🛠': 'construction',
  '🛡️': 'shield',
  '🛡': 'shield',

  // Status, Clock, Communication, UI
  '⏳': 'hourglass_top',
  '⌛': 'hourglass_bottom',
  '▶': 'play_arrow',
  '▶️': 'play_arrow',
  '⚠️': 'warning',
  '⚠': 'warning',
  '✅': 'check_circle',
  '✓': 'check',
  '❌': 'cancel',
  '✕': 'close',
  '📋': 'assignment',
  '📝': 'edit_note',
  '📞': 'call',
  '📮': 'mail',
  '✉️': 'mail',
  '✉': 'mail',
  '📅': 'calendar_today',
  '🏆': 'military_tech',
  '🔔': 'notifications',
  '🔍': 'search',
  '🔎': 'search',
  '📷': 'photo_camera',
  '📸': 'photo_camera',
  '💬': 'chat',
  '❤️': 'favorite',
  '👍': 'thumb_up',
  '👎': 'thumb_down',
  '⭐': 'star',
  '🌟': 'star',
  '🔥': 'local_fire_department',
  '📢': 'campaign',
  '📣': 'campaign',
};

export function resolveGoogleIcon(input?: string | null, fallback = 'apartment'): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (EMOJI_TO_ICON_MAP[trimmed]) {
    return EMOJI_TO_ICON_MAP[trimmed];
  }
  for (const [emoji, iconName] of Object.entries(EMOJI_TO_ICON_MAP)) {
    if (trimmed.includes(emoji)) {
      return iconName;
    }
  }
  if (/^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(trimmed)) {
    return fallback;
  }
  return trimmed || fallback;
}

export interface GoogleIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string | null;
  size?: number | string;
  color?: string;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reusable Google Material Symbols Icon Component
 * Loaded via Google Fonts CDN in index.html
 * Automatically maps raw emoji strings (e.g. from database) to Material Symbols!
 */
export const GoogleIcon: React.FC<GoogleIconProps> = ({
  name,
  size = 20,
  color,
  filled = false,
  weight = 400,
  className = '',
  style = {},
  ...props
}) => {
  const iconName = resolveGoogleIcon(name);

  const iconStyle: React.CSSProperties = {
    fontFamily: '"Material Symbols Rounded", "Material Symbols Outlined", sans-serif',
    fontWeight: weight,
    fontStyle: 'normal',
    fontSize: typeof size === 'number' ? `${size}px` : size,
    lineHeight: 1,
    letterSpacing: 'normal',
    textTransform: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    userSelect: 'none',
    flexShrink: 0,
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    ...(color ? { color } : {}),
    ...style,
  };

  return (
    <span
      className={`material-symbols-rounded ${className}`.trim()}
      style={iconStyle}
      aria-hidden="true"
      {...props}
    >
      {iconName}
    </span>
  );
};

export default GoogleIcon;
