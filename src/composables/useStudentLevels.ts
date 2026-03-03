import { computed, toValue, MaybeRefOrGetter } from 'vue';
import { MAX_LEVEL } from '@/consumables/constants/gameConstants';

export { MAX_LEVEL };

export function useStudentLevels(
  characterLevels: MaybeRefOrGetter<{ current: number; target: number }>
) {
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
