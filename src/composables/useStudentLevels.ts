import { computed, toValue, MaybeRefOrGetter } from 'vue';

const MAX_LEVEL = 90;

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
