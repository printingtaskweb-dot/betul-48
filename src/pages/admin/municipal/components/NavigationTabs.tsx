import React from 'react';
import { BarChart3, Briefcase, TrendingUp, MapPin, Building2, Layers, Compass } from 'lucide-react';
import { BORDER } from '../constants';
import { TabButton } from './TabButton';
import type { ViewTab } from '../types';

interface Props {
  activeTab: ViewTab;
  setActiveTab: (t: ViewTab) => void;
  filteredCount: number;
  wardsCount: number;
}

export const NavigationTabs: React.FC<Props> = ({
  activeTab, setActiveTab, filteredCount, wardsCount,
}) => (
  <div style={{ display: 'flex', gap: 8, borderBottom: BORDER, paddingBottom: 4, overflowX: 'auto' }}>
    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart3 size={16} />} label="Executive Overview" />
    <TabButton active={activeTab === 'complaints'} onClick={() => setActiveTab('complaints')} icon={<Briefcase size={16} />} label={`Task Allocation (${filteredCount})`} />
    <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<TrendingUp size={16} />} label="Employee Leaderboard" />
    <TabButton active={activeTab === 'wards'} onClick={() => setActiveTab('wards')} icon={<MapPin size={16} />} label={`Wards (${wardsCount})`} />
    <TabButton active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} icon={<Building2 size={16} />} label="Departments" />
    <TabButton active={activeTab === 'ward-manager'} onClick={() => setActiveTab('ward-manager')} icon={<Layers size={16} />} label="Ward Registration" />
    <TabButton active={activeTab === 'location-viewer'} onClick={() => setActiveTab('location-viewer')} icon={<Compass size={16} />} label="Location Filter" />
  </div>
);
