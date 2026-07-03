export const BADGE_BASE = 'bg-blue-100 dark:bg-secondary-300 text-xs font-medium me-2 px-2.5 py-0.5 rounded border';
const BASE = BADGE_BASE;

const STATUS_CLASSES: Record<string, string> = {
  Active: 'text-blue-600 border-blue-400',
  Launched: 'text-green-500 border-green-500',
  Retired: 'text-yellow-500 border-yellow-500',
  Obsolete: 'text-red-500 border-red-500',
};

export function lifecycleStatusClass(status: string): string {
  const color = STATUS_CLASSES[status] ?? 'text-gray-500 border-gray-400';
  return `${BASE} ${color}`;
}

const RESOURCE_STATUS_CLASSES: Record<string, string> = {
  standby: 'text-blue-600 border-blue-400',
  available: 'text-green-500 border-green-500',
  suspended: 'text-yellow-500 border-yellow-500',
  unknown: 'text-red-500 border-red-500',
};

export function resourceStatusClass(status: string): string {
  const color = RESOURCE_STATUS_CLASSES[status] ?? 'text-gray-500 border-gray-400';
  return `${BASE} ${color}`;
}
