<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { getBondIconUrl, getStudentIconUrl } from '@/lib/utils/iconUtils';
import { $t } from '@/locales';
import GlobalControls from '@/components/navbar/GlobalControls.vue';
import ContactModal from '@/components/navbar/modals/ContactModal.vue';
import CreditsModal from '@/components/navbar/modals/CreditsModal.vue';
import '@/styles/navbar.css';

const { currentTheme, setTheme, sortedStudentsArray } = useStudentData();

// GlobalControls only emits open events; on /students these modals are hosted by
// GlobalNavbar, but the landing page uses GlobalControls directly, so it hosts them.
const showContact = ref(false);
const showCredits = ref(false);

const bondIconUrl = getBondIconUrl();
const studentIconUrl = ref<string>('');
const studentsImgError = ref(false);
const bondsImgError = ref(false);

/** Pick a random student portrait, avoiding an immediate repeat. */
function cycleStudentIcon() {
  const students = sortedStudentsArray.value;
  if (!students.length) return;
  let url = studentIconUrl.value;
  for (let attempt = 0; attempt < 5 && (url === studentIconUrl.value || !studentIconUrl.value); attempt++) {
    const pick = students[Math.floor(Math.random() * students.length)];
    url = getStudentIconUrl(pick.Id);
    if (students.length === 1) break;
  }
  studentIconUrl.value = url;
  studentsImgError.value = false;
}

watch(sortedStudentsArray, (students) => {
  if (students.length && !studentIconUrl.value) cycleStudentIcon();
}, { immediate: true });

let studentIconInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  studentIconInterval = setInterval(cycleStudentIcon, 2000);
});

onUnmounted(() => {
  if (studentIconInterval) clearInterval(studentIconInterval);
});
</script>

<template>
  <div class="landing">
    <header class="app-navbar">
      <div class="app-navbar-content lp-bar">
        <GlobalControls
          :current-theme="currentTheme"
          @set-theme="setTheme"
          @open-contact="showContact = true"
          @open-credits="showCredits = true"
        />
      </div>
    </header>

    <div class="landing-content">
      <div class="landing-brand">
        <h1 class="landing-title">
          <span class="brand-eridu">Eridu</span><span class="brand-ops">Ops</span>
        </h1>
      </div>

      <p class="landing-subtitle">{{ $t('landingSubtitle') }}</p>

      <nav class="landing-cards">
        <RouterLink to="/students" class="landing-card">
          <div class="landing-card-art">
            <Transition name="portrait-fade">
              <img
                v-if="studentIconUrl && !studentsImgError"
                :key="studentIconUrl"
                :src="studentIconUrl"
                alt=""
                class="landing-card-img"
                @error="studentsImgError = true"
              />
              <div v-else class="landing-card-img-fallback">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
            </Transition>
          </div>
          <div class="landing-card-body">
            <h2 class="landing-card-title">{{ $t('students') }}</h2>
            <p class="landing-card-desc">{{ $t('studentsDesc') }}</p>
          </div>
          <div class="landing-card-arrow">→</div>
        </RouterLink>

        <RouterLink to="/bonds" class="landing-card">
          <div class="landing-card-art landing-card-art--bond100">
            <img
              v-if="!bondsImgError"
              :src="bondIconUrl"
              alt=""
              class="landing-card-img landing-card-img--icon"
              @error="bondsImgError = true"
            />
            <div v-else class="landing-card-img-fallback">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="var(--color-negative)" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
          </div>
          <div class="landing-card-body">
            <h2 class="landing-card-title">{{ $t('bonds') }}</h2>
            <p class="landing-card-desc">{{ $t('bondsDesc') }}</p>
          </div>
          <div class="landing-card-arrow">→</div>
        </RouterLink>

        <RouterLink to="/hall" class="landing-card">
          <div class="landing-card-art">
            <img src="/assets/kokona100.png" alt="" class="landing-card-img" />
          </div>
          <div class="landing-card-body">
            <h2 class="landing-card-title">{{ $t('bond100.nav') }}</h2>
            <p class="landing-card-desc">{{ $t('bond100Desc') }}</p>
          </div>
          <div class="landing-card-arrow">→</div>
        </RouterLink>
      </nav>
    </div>

    <footer class="landing-footer">
      <p class="landing-footer-disclaimer">
        Eridu Ops is an unofficial fan project, not affiliated with Nexon, Nexon Games, or Yostar.
        Game data and images are provided via
        <a href="https://schaledb.com" target="_blank" rel="noopener noreferrer">SchaleDB</a>;
        all artwork, information, and assets remain the property of their respective owners.
      </p>
    </footer>

    <ContactModal v-if="showContact" @close="showContact = false" />
    <CreditsModal v-if="showCredits" @close="showCredits = false" />
  </div>
</template>

<style scoped>
.landing {
  position: fixed;
  inset: 0;
  background-color: var(--background-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.lp-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.landing-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px 20px 48px;
}

/* ── Brand ────────────────────────────────────────────────────────────────────── */
.landing-brand {
  display: flex;
  align-items: center;
}

.landing-title {
  margin: 0;
  line-height: 1;
  font-family: 'NEXON Football Gothic', system-ui, sans-serif;
  font-style: italic;
  font-weight: 700;
  font-synthesis: style;
}

.brand-eridu {
  font-size: 3.6rem;
  color: transparent;
  -webkit-text-stroke: 2px var(--text-primary);
  letter-spacing: -0.03em;
}

.brand-ops {
  font-size: 3.6rem;
  color: var(--color-negative);
  letter-spacing: -0.03em;
}

.landing-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
  text-align: center;
  max-width: 420px;
}

/* ── Cards ───────────────────────────────────────────────────────────────────── */
.landing-cards {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.landing-card {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 280px;
  max-width: 360px;
  flex: 1 1 280px;
  padding: 20px 22px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--card-background);
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.landing-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.landing-card:hover .landing-card-arrow {
  transform: translateX(4px);
  color: var(--accent-color);
}

.landing-card-art {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--accent-color) 10%, var(--background-primary));
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Soft crossfade between cycling student portraits */
.portrait-fade-enter-active,
.portrait-fade-leave-active {
  transition: opacity 0.5s ease;
}

.portrait-fade-enter-from,
.portrait-fade-leave-to {
  opacity: 0;
}

/* Stack the outgoing portrait over the incoming one so they blend */
.portrait-fade-leave-active {
  position: absolute;
  inset: 0;
}

.landing-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.landing-card-img--icon {
  object-fit: contain;
  padding: 10px;
}

.landing-card-art--bond100 {
  background:
    radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent-color) 34%, transparent), transparent 48%),
    color-mix(in srgb, var(--color-negative) 12%, var(--background-primary));
}

.landing-card-img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-color);
  opacity: 0.7;
}

.landing-card-body {
  flex: 1;
  min-width: 0;
}

.landing-card-title {
  margin: 0 0 4px;
  font-size: 1.15rem;
  font-weight: 700;
}

.landing-card-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.landing-card-arrow {
  font-size: 1.1rem;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: transform 0.18s, color 0.18s;
}

/* ── Footer ──────────────────────────────────────────────────────────────────── */
.landing-footer {
  padding: 16px 20px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.landing-footer-disclaimer {
  margin: 0 auto;
  max-width: 640px;
  font-size: 0.72rem;
  line-height: 1.5;
  opacity: 0.85;
}

.landing-footer-disclaimer a {
  color: var(--accent-color);
  text-decoration: none;
}

.landing-footer-disclaimer a:hover {
  text-decoration: underline;
}

@media (max-width: 576px) {
  .brand-eridu,
  .brand-ops {
    font-size: 2.6rem;
  }

  .landing-cards {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    max-width: 400px;
  }

  .landing-card {
    min-width: unset;
    max-width: unset;
  }
}
</style>
