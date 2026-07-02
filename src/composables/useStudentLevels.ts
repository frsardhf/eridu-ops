import { computed, toValue, MaybeRefOrGetter } from 'vue';
import { MAX_LEVEL } from '@/lib/constants/gameConstants';
import type { CharacterLevels } from '@/types/upgrade';

export function useStudentLevels(characterLevels: MaybeRefOrGetter<CharacterLevels>) {
  const isMaxLevel = computed(() => {
    const levels = toValue(characterLevels);
    return levels.current === MAX_LEVEL && levels.target === MAX_LEVEL;
  });
  const showLevelArrow = computed(() => {
    const levels = toValue(characterLevels);
    return levels.current !== levels.target;
  });
  return { isMaxLevel, showLevelArrow };
}
