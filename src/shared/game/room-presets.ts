export const roomPresets = ['standard', 'warring_state', 'tutorial'] as const;

export type RoomPreset = (typeof roomPresets)[number];

export function normalizeRoomPreset(value?: string | null): RoomPreset {
  if (value === 'warring_state' || value === 'tutorial') {
    return value;
  }

  return 'standard';
}
