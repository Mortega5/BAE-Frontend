export const BADGE_BASE = 'text-xs font-medium me-2 px-2.5 py-0.5 rounded border';
const BASE = BADGE_BASE;

const STATUS_CLASSES: Record<string, string> = {
  Active: 'bg-blue-300 text-blue-600 border-blue-400',
  Launched: 'bg-green-300 text-green-500 border-green-500',
  Retired: 'bg-yellow-300 text-yellow-500 border-yellow-500',
  Obsolete: 'bg-red-300 text-red-500 border-red-500',
};

export function lifecycleStatusClass(status: string): string {
  const color = STATUS_CLASSES[status] ?? 'text-gray-500 border-gray-400';
  return `${BASE} ${color}`;
}

const RESOURCE_STATUS_CLASSES: Record<string, string> = {
  standby: 'bg-blue-300 text-blue-600 border-blue-400',
  available: 'bg-green-300 text-green-500 border-green-500',
  suspended: 'bg-yellow-300 text-yellow-500 border-yellow-500',
  unknown: 'bg-red-300 text-red-500 border-red-500',
};

export function resourceStatusClass(status: string): string {
  const color = RESOURCE_STATUS_CLASSES[status] ?? 'text-gray-500 border-gray-400';
  return `${BASE} ${color}`;
}
