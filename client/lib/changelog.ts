import type { SupportedLanguage } from '@/lib/language';

export type ChangelogEntry = {
  date: string;
  title: Record<SupportedLanguage, string>;
  items: Record<SupportedLanguage, string[]>;
};

export const changelogEntries: ChangelogEntry[] = [
  {
    date: '2026-04-22',
    title: {
      en: 'Tutorial Upgrade',
      zh: '教程升级',
    },
    items: {
      en: [
        'Added undo button, progress indicators, and clearer completion messages to help new players learn faster.',
        'Expanded the practice map with better mountain routes and a complete enemy-capital capture tutorial.',
      ],
      zh: [
        '新手教程加入撤销按钮、进度指示和更清晰的完成提示，帮助新玩家更快上手。',
        '练习地图补强了绕山路线和完整的攻占敌方主城教学。',
      ],
    },
  },
  {
    date: '2026-04-21',
    title: {
      en: 'Battle Guidance Refresh',
      zh: '战场提示优化',
    },
    items: {
      en: [
        'New strategic hints alert you to frontline pressure, nearby threats, and enemy invasions.',
        'Improved mobile experience in lobby and rooms, with better map focus and touch controls.',
      ],
      zh: [
        '新增战略提示，会提醒你前线压力、主城附近威胁和敌军入侵。',
        '优化移动端大厅和房间体验，改进地图聚焦和触控操作。',
      ],
    },
  },
  {
    date: '2026-04-20',
    title: {
      en: 'Replay Experience Update',
      zh: '回放体验升级',
    },
    items: {
      en: [
        'Replay visuals now match live games more closely, with consistent tile and tower rendering.',
        'Added zoom and reset view controls, improved drag and touch handling, and a cleaner control bar.',
      ],
      zh: [
        '回放画面现在更接近实时对局，地块和塔的显示更统一。',
        '新增缩放和重置视图按钮，优化拖拽和触控，控制条布局更简洁。',
      ],
    },
  },
  {
    date: '2026-04-17',
    title: {
      en: 'Room And Replay Improvements',
      zh: '房间与回放改进',
    },
    items: {
      en: [
        'Redesigned room and replay interfaces with better player grouping and clearer information display.',
        'Added gameplay sound effects and reduced replay file sizes for faster loading.',
      ],
      zh: [
        '重新设计房间和回放界面，玩家列表改为分组显示，信息更清晰。',
        '新增游戏音效，并减小回放文件体积以加快加载速度。',
      ],
    },
  },
  {
    date: '2026-04-16',
    title: {
      en: 'Lobby And Editor Rework',
      zh: '大厅与编辑器改版',
    },
    items: {
      en: [
        'Redesigned map editor for mobile with tighter controls and a cleaner toolbar.',
        'Rooms now support on-demand bots, improved team and chat management, and smoother onboarding for new players.',
      ],
      zh: [
        '地图编辑器针对移动端重新设计，控制区和工具栏更紧凑。',
        '房间支持按需添加机器人，改进队伍和聊天管理，新手引导更流畅。',
      ],
    },
  },
  {
    date: '2026-04-15',
    title: {
      en: 'Infrastructure Upgrade And Visual Refresh',
      zh: '基础设施升级与视觉重构',
    },
    items: {
      en: [
        'Migrated to a new server infrastructure for better performance and reliability worldwide.',
        'Refreshed the entire UI with new day and night themes, updated branding, and smoother animations.',
      ],
      zh: [
        '迁移到新的服务器架构，全球性能和稳定性更好。',
        '全面刷新界面，加入昼夜主题、更新品牌样式和更流畅的动画。',
      ],
    },
  },
];
