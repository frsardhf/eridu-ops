import { currentLanguage } from '../stores/localizationStore';
import { FetchedData } from '../../types/student';

/**
 * Fetch a single SchaleDB data file with automatic retry on failure.
 * Retries up to `maxRetries` times with linear back-off (1 s, 2 s, …).
 * Returns an empty object only after all attempts are exhausted.
 */
async function fetchData(type: string, maxRetries = 2): Promise<any> {
  const lang = currentLanguage.value;
  const url = `https://schaledb.com/data/${lang}/${type}.json`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt < maxRetries) {
        const delayMs = 1000 * (attempt + 1); // 1 s, 2 s
        console.warn(`Fetch attempt ${attempt + 1} failed for ${type}, retrying in ${delayMs}ms…`, error);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error(`Error fetching ${type} data after ${maxRetries + 1} attempts:`, error);
        return {};
      }
    }
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
