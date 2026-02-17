import { currentLanguage } from '../stores/localizationStore';
import { FetchedData } from '../../types/student';

async function fetchData(type: string) {
  try {
    const lang = currentLanguage.value;
    const url = `https://schaledb.com/data/${lang}/${type}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${type} data:`, error);
    return {};
  }
}

export async function fetchAllData(): Promise<FetchedData> {
  try {
    const [students, items, equipment] = await Promise.all([
      fetchData('students'),
      fetchData('items'),
      fetchData('equipment')
    ]);

    return { students, items, equipment };
  } catch (error) {
    console.error('Error fetching all data:', error);
    return { students: {}, items: {}, equipment: {} };
  }
}
