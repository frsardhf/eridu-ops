import { ref, watch } from 'vue';
import { db } from '@/consumables/db/database';
import type { DeckRecord, DeckTeam } from '@/consumables/db/database';

const DEFAULT_DECK_NAMES = ['Team I', 'Team II', 'Team III', 'Team IV', 'Team V'];

function emptyTeam(): DeckTeam {
  return { units: Array(6).fill(null) };
}

function defaultDecks(): DeckRecord[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: DEFAULT_DECK_NAMES[i],
    teams: [emptyTeam()],
    updatedAt: Date.now()
  }));
}

// Singleton state
const decks = ref<DeckRecord[]>([]);
const deckIndex = new Map<number, DeckRecord>();
let initialized = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    await db.decks.bulkPut(JSON.parse(JSON.stringify(decks.value)));
  }, 300);
}

export function useDeckBuilder() {
  async function initDecks() {
    if (initialized) return;
    initialized = true;

    const stored = await db.decks.toArray();
    if (stored.length === 5) {
      decks.value = stored.sort((a, b) => a.id - b.id);
    } else {
      const defaults = defaultDecks();
      await db.decks.bulkPut(defaults);
      decks.value = defaults;
    }

    deckIndex.clear();
    decks.value.forEach(d => deckIndex.set(d.id, d));

    watch(decks, scheduleSave, { deep: true });
  }

  function setUnit(deckId: number, teamIdx: number, slotIdx: number, studentId: number | null) {
    const deck = deckIndex.get(deckId);
    if (!deck || !deck.teams[teamIdx]) return;
    deck.teams[teamIdx].units[slotIdx] = studentId;
    deck.updatedAt = Date.now();
  }

  function moveUnit(deckId: number, teamIdx: number, fromSlot: number, toSlot: number) {
    const deck = deckIndex.get(deckId);
    if (!deck || !deck.teams[teamIdx]) return;
    const units = deck.teams[teamIdx].units;
    const temp = units[fromSlot];
    units[fromSlot] = units[toSlot];
    units[toSlot] = temp;
    deck.updatedAt = Date.now();
  }

  function addTeam(deckId: number) {
    const deck = deckIndex.get(deckId);
    if (!deck) return;
    deck.teams.push(emptyTeam());
    deck.updatedAt = Date.now();
  }

  function removeTeam(deckId: number, teamIdx: number) {
    const deck = deckIndex.get(deckId);
    if (!deck || deck.teams.length <= 1) return;
    deck.teams.splice(teamIdx, 1);
    deck.updatedAt = Date.now();
  }

  function renameDeck(deckId: number, name: string) {
    const deck = deckIndex.get(deckId);
    if (!deck) return;
    deck.name = name;
    deck.updatedAt = Date.now();
  }

  function clearTeam(deckId: number, teamIdx: number) {
    const deck = deckIndex.get(deckId);
    if (!deck || !deck.teams[teamIdx]) return;
    deck.teams[teamIdx] = emptyTeam();
    deck.updatedAt = Date.now();
  }

  function swapUnits(deckId: number, fromTeam: number, fromSlot: number, toTeam: number, toSlot: number) {
    const deck = deckIndex.get(deckId);
    if (!deck || !deck.teams[fromTeam] || !deck.teams[toTeam]) return;
    const a = deck.teams[fromTeam].units[fromSlot];
    deck.teams[fromTeam].units[fromSlot] = deck.teams[toTeam].units[toSlot];
    deck.teams[toTeam].units[toSlot] = a;
    deck.updatedAt = Date.now();
  }

  function copyTeamToPreset(fromDeckId: number, teamIdx: number, toDeckId: number) {
    const fromDeck = deckIndex.get(fromDeckId);
    const toDeck = deckIndex.get(toDeckId);
    if (!fromDeck || !toDeck || !fromDeck.teams[teamIdx]) return;
    toDeck.teams.push({ units: [...fromDeck.teams[teamIdx].units] });
    toDeck.updatedAt = Date.now();
  }

  function reorderTeam(deckId: number, fromIdx: number, toIdx: number) {
    const deck = deckIndex.get(deckId);
    if (!deck) return;
    const [team] = deck.teams.splice(fromIdx, 1);
    deck.teams.splice(toIdx, 0, team);
    deck.updatedAt = Date.now();
  }

  return { decks, initDecks, setUnit, moveUnit, swapUnits, addTeam, removeTeam, renameDeck, clearTeam, copyTeamToPreset, reorderTeam };
}
