export const ONBOARDING_STATUS_KEY = 'blockwar-onboarding-status';

export type OnboardingStatus = 'new' | 'skipped' | 'completed';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function normalizeOnboardingStatus(
  value?: string | null
): OnboardingStatus {
  if (value === 'skipped' || value === 'completed') {
    return value;
  }

  return 'new';
}

export function readOnboardingStatus(
  storage: StorageLike | undefined =
    typeof window === 'undefined' ? undefined : window.localStorage
): OnboardingStatus {
  if (!storage) {
    return 'new';
  }

  return normalizeOnboardingStatus(storage.getItem(ONBOARDING_STATUS_KEY));
}

export function writeOnboardingStatus(
  status: Exclude<OnboardingStatus, 'new'>,
  storage: StorageLike | undefined =
    typeof window === 'undefined' ? undefined : window.localStorage
) {
  storage?.setItem(ONBOARDING_STATUS_KEY, status);
}

export function shouldShowOnboardingPrompt(status: OnboardingStatus) {
  return status === 'new';
}
