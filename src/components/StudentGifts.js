import { computed, toValue } from "vue";
import { getItemsInCategory } from "./Items";
import { useSettingsStore } from "../stores/SettingsStore";
import { studentsReleasedGenerator } from "./Student";
import { useStudentStore } from "../stores/StudentStore";

export const genericGiftTags = ["BC", "Bc", "ew"];

export function useGiftsByStudent(studentRef, includeAll) {

    return computed(() => {
        
        const student = toValue(studentRef);

        const allGifts = getItemsInCategory('Favor', useSettingsStore().settings.server);

        const studentGifts = [];
    
        for (const gift of allGifts) {

            const allTags = [...student.FavorItemTags, ...student.FavorItemUniqueTags, ...genericGiftTags];
            const genericTagCount = gift.Tags.filter(x => genericGiftTags.includes(x)).length;

            const commonTags = gift.Tags.filter(x => allTags.includes(x));
            const favorGrade = Math.min(commonTags.length, 3);

            const expValue = gift.ExpValue * (1 + Math.min(commonTags.length, 3))

            if (favorGrade - genericTagCount > 0 || toValue(includeAll)) {
                studentGifts.push({
                    gift: gift,
                    exp: expValue,
                    grade: favorGrade + 1
                });
            }
        }

        return studentGifts.sort((a,b) => b.exp - a.exp);

    })

}

export function useStudentsByGift(giftRef, filterRef) {

    return computed(() => {

        const gift = toValue(giftRef);
        const filter  = toValue(filterRef);
        const students = {1: [], 2: [], 3: [], 4: []};
        const studentStore = useStudentStore();

        for (const student of studentsReleasedGenerator()) {

            if (student.StyleId > 0) {
                continue;
            }

            if (filter == 1 && !studentStore.collectionExists(student.Id)) {
                continue;
            }

            if (filter == 2 && !studentStore.favouritesExists(student.Id)) {
                continue;
            }
            
            const allTags = [...student.FavorItemTags, ...student.FavorItemUniqueTags, ...genericGiftTags];
            const genericTagCount = gift.Tags.filter(x => genericGiftTags.includes(x)).length;

            const commonTags = gift.Tags.filter(x => allTags.includes(x));
            const favorGrade = Math.min(commonTags.length, 3);

            if (favorGrade - genericTagCount > 0) {
                students[favorGrade + 1].push({
                    id: student.Id,
                    name: student.Name,
                    path: student.PathName
                })
            }

        }

        return students;

    })

}