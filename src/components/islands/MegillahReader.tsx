import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { megillahText } from '../../lib/megillah-text';
import { translationsEn } from '../../lib/megillah-translations-en';
import { playRandomHamanSound, stopAllHamanSounds } from '../../lib/audio-effects';
import type { Session, ScrollPosition } from '../../lib/useSession';

type Lang = 'he' | 'en' | 'es' | 'ru' | 'fr' | 'pt' | 'it';
type TranslationMap = Record<string, string>;

function toHebrew(n: number): string {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  return (tens[Math.floor(n / 10)] || '') + (ones[n % 10] || '');
}

const LOUD_VERSES = new Set(['2:5', '8:15', '8:16', '10:3']);
const BNEI_HAMAN_VERSES = new Set(['9:7', '9:8', '9:9']);
const BNEI_HAMAN_SPLIT_VERSE = '9:6';
const BNEI_HAMAN_SPLIT_RE = /(חֲמֵ[\u0591-\u05C7]*שׁ מֵא[\u0591-\u05C7]*וֹת אִ[\u0591-\u05C7]*י[\u0591-\u05C7]*שׁ׃)/;
const DEFAULT_READING_MINUTES = 35;

// Precomputed: verses where Haman's name appears
const HAMAN_VERSES = new Set([
  '3:1','3:2','3:4','3:5','3:6','3:7','3:8','3:10','3:11','3:12','3:15',
  '4:7',
  '5:4','5:5','5:8','5:9','5:10','5:11','5:12','5:14',
  '6:4','6:5','6:6','6:7','6:10','6:11','6:12','6:13','6:14',
  '7:1','7:6','7:7','7:8','7:9','7:10',
  '8:1','8:2','8:3','8:5','8:7',
  '9:10','9:12','9:13','9:14','9:24',
]);

// Precomputed: verses where Haman has a title (Chabad mode — only these get highlighted)
const HAMAN_TITLED_VERSES = new Set([
  '3:1','3:10','7:6','8:1','8:3','8:5','9:10','9:24',
]);

const ILLUSTRATIONS = [
  { after: '1:1', src: '/illustrations/1-1-4.webp', he: 'המשתה המלכותי', en: 'The Royal Feast' },
  { after: '1:10', src: '/illustrations/1-10-12.webp', he: 'ושתי מסרבת', en: 'Vashti Refuses' },
  { after: '2:17', src: '/illustrations/2-17.webp', he: 'אסתר מוכתרת', en: 'Esther is Crowned' },
  { after: '3:1', src: '/illustrations/3-1-2.webp', he: 'מרדכי מסרב להשתחוות', en: 'Mordechai Refuses to Bow' },
  { after: '3:8', src: '/illustrations/3-8-11.webp', he: 'הגזירה הרעה', en: 'The Evil Decree' },
];

const translations = {
  he: {
    showCantillation: 'הצג טעמים',
    chabadCustom: 'הדגש המן לפי מנהג חב״ד',
    showTranslation: 'הצג תרגום',
    fontSize: 'גודל גופן',
    minLeft: 'דק׳ נותרו',
    readingTime: 'זמן קריאה (דקות):',
    save: 'שמור',
    changeReadingTime: 'שנה זמן קריאה',
    chabadHint: 'מנהג חב״ד — רק כשהמן מוזכר עם תואר',
    tapHint: 'לחצו על שמו של המן להשמיע רעש!',
    chapter: 'פרק',
    loudLabel: 'הקהל אומר בקול רם',
    bneiHamanLabel: 'יש אומרים שהקהל אומר בקול רם',
    headerTitle: 'מגילת אסתר',
    headerSub: 'הטקסט המלא עם ניקוד וטעמי מקרא',
    language: 'שפה',
    shakeToPlay: 'נער להשמעת רעשן',
    displayIllustrations: 'הצג איורים',
  },
  en: {
    showCantillation: 'Show cantillation signs',
    chabadCustom: 'Highlight fewer Hamans',
    showTranslation: 'Display translation',
    fontSize: 'Font size',
    minLeft: 'min left',
    readingTime: 'Reading time (min):',
    save: 'Save',
    changeReadingTime: 'Change reading time',
    chabadHint: 'Chabad custom — Haman highlighted only with a title',
    tapHint: <>Don't have a gragger?<br class="mobile-only"/> Just click Haman's name!</>,
    chapter: 'Chapter',
    loudLabel: 'Everyone reads this together:',
    bneiHamanLabel: 'In some communities, everyone says this together.',
    headerTitle: 'The Megillah App',
    headerSub: <a href="https://www.chabad.org/purim" target="_blank" rel="noopener noreferrer" class="header-link">Learn more about Purim</a>,
    language: 'Language',
    shakeToPlay: 'Shake phone to boo Haman',
    displayIllustrations: 'Display illustrations',
  },
  es: {
    showCantillation: 'Mostrar signos de cantilación',
    chabadCustom: 'Resaltar menos Hamanes',
    showTranslation: 'Mostrar traducción',
    fontSize: 'Tamaño de fuente',
    minLeft: 'min restantes',
    readingTime: 'Tiempo de lectura (min):',
    save: 'Guardar',
    changeReadingTime: 'Cambiar tiempo de lectura',
    chabadHint: 'Costumbre Jabad — Hamán resaltado solo con título',
    tapHint: '¡No tienes matraca? ¡Haz clic en el nombre de Hamán!',
    chapter: 'Capítulo',
    loudLabel: 'Todos leen esto juntos:',
    bneiHamanLabel: 'En algunas comunidades, todos dicen esto juntos.',
    headerTitle: 'La Meguilá',
    headerSub: 'Matraca incorporada y barra de progreso',
    language: 'Idioma',
    shakeToPlay: 'Agitar para sonar matraca',
    displayIllustrations: 'Mostrar ilustraciones',
  },
  ru: {
    showCantillation: 'Показать знаки кантилляции',
    chabadCustom: 'Выделять меньше Аманов',
    showTranslation: 'Показать перевод',
    fontSize: 'Размер шрифта',
    minLeft: 'мин осталось',
    readingTime: 'Время чтения (мин):',
    save: 'Сохранить',
    changeReadingTime: 'Изменить время чтения',
    chabadHint: 'Обычай Хабад — Аман выделяется только с титулом',
    tapHint: 'Нет трещотки? Нажмите на имя Амана!',
    chapter: 'Глава',
    loudLabel: 'Все читают это вместе:',
    bneiHamanLabel: 'В некоторых общинах все говорят это вместе.',
    headerTitle: 'Мегилат Эстер',
    headerSub: 'Встроенная трещотка и индикатор прогресса',
    language: 'Язык',
    shakeToPlay: 'Встряхните для трещотки',
    displayIllustrations: 'Показать иллюстрации',
  },
  fr: {
    showCantillation: 'Afficher les signes de cantillation',
    chabadCustom: 'Surligner moins de Hamans',
    showTranslation: 'Afficher la traduction',
    fontSize: 'Taille de police',
    minLeft: 'min restantes',
    readingTime: 'Temps de lecture (min) :',
    save: 'Enregistrer',
    changeReadingTime: 'Modifier le temps de lecture',
    chabadHint: "Coutume Habad — Haman n'est souligné qu'avec un titre",
    tapHint: "Pas de crécelle ? Cliquez sur le nom d'Haman !",
    chapter: 'Chapitre',
    loudLabel: 'Tout le monde lit ceci ensemble :',
    bneiHamanLabel: 'Dans certaines communautés, tout le monde dit ceci ensemble.',
    headerTitle: 'La Méguila',
    headerSub: 'Crécelle intégrée et barre de progression',
    language: 'Langue',
    shakeToPlay: 'Secouer pour la crécelle',
    displayIllustrations: 'Afficher les illustrations',
  },
  pt: {
    showCantillation: 'Mostrar sinais de cantilação',
    chabadCustom: 'Destacar menos Hamãs',
    showTranslation: 'Mostrar tradução',
    fontSize: 'Tamanho da fonte',
    minLeft: 'min restantes',
    readingTime: 'Tempo de leitura (min):',
    save: 'Salvar',
    changeReadingTime: 'Alterar tempo de leitura',
    chabadHint: 'Costume Chabad — Hamã destacado apenas com título',
    tapHint: 'Não tem matraca? Clique no nome de Hamã!',
    chapter: 'Capítulo',
    loudLabel: 'Todos leem isto juntos:',
    bneiHamanLabel: 'Em algumas comunidades, todos dizem isto juntos.',
    headerTitle: 'A Meguilá',
    headerSub: 'Matraca embutida e barra de progresso',
    language: 'Idioma',
    shakeToPlay: 'Agitar para tocar matraca',
    displayIllustrations: 'Mostrar ilustrações',
  },
  it: {
    showCantillation: 'Mostra segni di cantillazione',
    chabadCustom: 'Evidenzia meno Haman',
    showTranslation: 'Mostra traduzione',
    fontSize: 'Dimensione carattere',
    minLeft: 'min rimasti',
    readingTime: 'Tempo di lettura (min):',
    save: 'Salva',
    changeReadingTime: 'Modifica tempo di lettura',
    chabadHint: 'Usanza Chabad — Haman evidenziato solo con titolo',
    tapHint: 'Non hai una raganella? Clicca sul nome di Haman!',
    chapter: 'Capitolo',
    loudLabel: 'Tutti leggono questo insieme:',
    bneiHamanLabel: 'In alcune comunità, tutti dicono questo insieme.',
    headerTitle: 'La Meghillà',
    headerSub: 'Raganella integrata e barra di avanzamento',
    language: 'Lingua',
    shakeToPlay: 'Agita per la raganella',
    displayIllustrations: 'Mostra illustrazioni',
  },
} as const;

type Translations = typeof translations[keyof typeof translations];

const HAMAN_REGEX = /((?:[\u05B0-\u05C7]*[ולבכמשה][\u05B0-\u05C7]*)?הָמָ[\u0591-\u05AF]*ן)/g;

// Strip nikkud and cantillation for consonant-only matching
function stripMarks(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

// Chabad custom: only highlight Haman when he has a title
// Titles: האגגי (the Agagite), הרע (the evil), צורר/צרר (enemy)
// These may appear after "בן המדתא" so we check a wider window
function hasTitleAfter(textAfter: string): boolean {
  const plain = stripMarks(textAfter.slice(0, 50));
  return /(האגגי|הרע|צרר|צורר)/.test(plain);
}

// Strip cantillation marks (U+0591–U+05AF) and paseq (U+05C0) but keep nikkud vowels
function stripCantillation(s: string): string {
  return s.replace(/[\u0591-\u05AF\u05C0]/g, '');
}

const SPLAT_COLORS = ['#5c3a1e', '#7a4f2e', '#3e2710', '#8b6914', '#6b4423', '#4a3015'];
const CONFETTI_COLORS = ['#660a23', '#E8962E', '#f0b054', '#8a1e3c', '#2e7d32', '#1565c0', '#e91e63', '#ff9800'];

function spawnConfetti() {
  const count = 80;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = 6 + Math.random() * 8;
    const x = Math.random() * window.innerWidth;
    const dx = (Math.random() - 0.5) * 300;
    const duration = 1.5 + Math.random() * 2;
    const delay = Math.random() * 600;
    const rotation = Math.random() * 720 - 360;
    piece.style.cssText = `
      left:${x}px;top:-10px;
      width:${size}px;height:${size * (0.5 + Math.random() * 0.8)}px;
      background:${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
      --dx:${dx}px;--rot:${rotation}deg;
      animation-delay:${delay}ms;
      animation-duration:${duration}s;
    `;
    document.body.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

function spawnSplats(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 14 + Math.floor(Math.random() * 8);

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'haman-splat';
    const size = 5 + Math.random() * 10;
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 120;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const delay = Math.random() * 80;
    const duration = 0.5 + Math.random() * 0.4;
    dot.style.cssText = `
      left:${cx}px;top:${cy}px;
      width:${size}px;height:${size}px;
      background:${SPLAT_COLORS[Math.floor(Math.random() * SPLAT_COLORS.length)]};
      --dx:${dx}px;--dy:${dy}px;
      animation-delay:${delay}ms;
      animation-duration:${duration}s;
    `;
    document.body.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  }
}

function HamanWord({ text, onTap }: { text: string; onTap: () => void }) {
  const [shaking, setShaking] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const handleClick = () => {
    onTap();
    setShaking(true);
    if (ref.current) spawnSplats(ref.current);
    setTimeout(() => setShaking(false), 400);
  };

  return (
    <span
      ref={ref}
      class={`haman-name${shaking ? ' shake' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      {text}
    </span>
  );
}

function renderVerse(
  text: string,
  chapterNum: number,
  verseNum: number,
  onHamanTap: () => void,
  chabadMode: boolean,
  hideCantillation: boolean,
  t: Translations,
  lang: Lang,
  translationMap: TranslationMap | null,
) {
  const displayText = hideCantillation ? stripCantillation(text) : text;
  const parts = displayText.split(HAMAN_REGEX);
  const verseKey = `${chapterNum}:${verseNum}`;
  const isLoud = LOUD_VERSES.has(verseKey);
  const translation = translationMap?.[verseKey];

  const verseContent = (
    <span class={`verse${isLoud ? ' loud-verse' : ''}`} data-verse={verseKey}>
      {isLoud && <span class="loud-label" dir={lang === 'he' ? 'rtl' : 'ltr'}>{t.loudLabel}</span>}
      <sup class="verse-num">{toHebrew(verseNum)}</sup>
      {parts.map((part, i) => {
        if (!HAMAN_REGEX.test(part)) {
          return <span key={`${chapterNum}-${verseNum}-${i}`}>{part}</span>;
        }
        if (chabadMode) {
          const nextPart = parts[i + 1] || '';
          if (!hasTitleAfter(nextPart)) {
            return <span key={`${chapterNum}-${verseNum}-${i}`}>{part}</span>;
          }
        }
        return (
          <HamanWord key={`${chapterNum}-${verseNum}-${i}`} text={part} onTap={onHamanTap} />
        );
      })}
      {translation && <span class="verse-translation" dir={lang === 'he' ? 'rtl' : 'ltr'}>{
        (chabadMode ? HAMAN_TITLED_VERSES : HAMAN_VERSES).has(verseKey)
          ? translation.split(/(Haman)/gi).map((seg, j) =>
              /^haman$/i.test(seg)
                ? <HamanWord key={`tr-${chapterNum}-${verseNum}-${j}`} text={seg} onTap={onHamanTap} />
                : seg
            )
          : translation
      }</span>}
      {' '}
    </span>
  );

  return verseContent;
}

export default function MegillahReader({ standalone = false, showTitle = false, session, remoteMinutes }: { standalone?: boolean; showTitle?: boolean; session?: Session; remoteMinutes?: number | null }) {
  const [showCantillation, setShowCantillation] = useState(false);
  const [chabadMode, setChabadMode] = useState(false);
  const [fontSize, setFontSize] = useState(1.35);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(DEFAULT_READING_MINUTES);
  const [draftMinutes, setDraftMinutes] = useState(DEFAULT_READING_MINUTES);
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('he');
  const [showTranslation, setShowTranslation] = useState(false);
  const [loadedTranslations, setLoadedTranslations] = useState<TranslationMap | null>(null);
  const translationCache = useRef<Record<string, TranslationMap>>({});
  const deviceLang = useRef<Lang>('he');
  const [showIllustrations, setShowIllustrations] = useState(false);
  const [muted, setMuted] = useState(false);
  const [soundActive, setSoundActive] = useState(false);
  const soundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTextRef = useRef<HTMLDivElement>(null);
  const confettiFired = useRef(false);

  const t = translations[lang];

  // The translation language to use when showTranslation is on
  // Hebrew users get Steinsaltz commentary; others get their language's translation
  const translationKey: Lang = lang;

  // Resolve the active translation map
  const activeTranslations: TranslationMap | null =
    !showTranslation ? null :
    translationKey === 'en' ? translationsEn :
    loadedTranslations;

  // Auto-detect device language on mount
  useEffect(() => {
    const navLang = navigator.language;
    let detected: Lang = 'en';
    if (navLang.startsWith('he')) detected = 'he';
    else if (navLang.startsWith('es')) detected = 'es';
    else if (navLang.startsWith('ru')) detected = 'ru';
    else if (navLang.startsWith('fr')) detected = 'fr';
    else if (navLang.startsWith('pt')) detected = 'pt';
    else if (navLang.startsWith('it')) detected = 'it';
    deviceLang.current = detected;
    setLang(detected);
  }, []);

  // Lazy-load non-English translations when needed
  useEffect(() => {
    if (!showTranslation || translationKey === 'en') {
      setLoadedTranslations(null);
      return;
    }
    if (translationCache.current[translationKey]) {
      setLoadedTranslations(translationCache.current[translationKey]);
      return;
    }
    fetch(`/translations/${translationKey}.json`)
      .then(r => r.json())
      .then((data: TranslationMap) => {
        translationCache.current[translationKey] = data;
        setLoadedTranslations(data);
      })
      .catch(() => setLoadedTranslations(null));
  }, [showTranslation, translationKey]);

  useEffect(() => {
    const saved = sessionStorage.getItem('megillah-reading-minutes');
    if (saved) {
      const val = parseInt(saved, 10);
      setTotalMinutes(val);
      setDraftMinutes(val);
    }
  }, []);

  // Follower: apply reading time from admin
  useEffect(() => {
    if (remoteMinutes != null) {
      setTotalMinutes(remoteMinutes);
      setDraftMinutes(remoteMinutes);
    }
  }, [remoteMinutes]);

  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const handleScroll = () => {
      const el = scrollTextRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalHeight = el.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrolled = -rect.top;
      const scrollable = totalHeight - viewportHeight;
      if (scrollable <= 0) { setScrollProgress(1); return; }
      const progress = Math.min(1, Math.max(0, scrolled / scrollable));
      setScrollProgress(progress);
      if (progress >= 0.99 && !confettiFired.current) {
        confettiFired.current = true;
        spawnConfetti();
      }
      // Admin: find topmost visible verse and broadcast it
      if (sessionRef.current?.role === 'admin') {
        const verseEls = el.querySelectorAll('[data-verse]');
        let topVerse: string | null = null;
        for (const v of verseEls) {
          const r = v.getBoundingClientRect();
          if (r.top >= -r.height) {
            topVerse = (v as HTMLElement).dataset.verse || null;
            break;
          }
        }
        if (topVerse) {
          sessionRef.current.broadcast({ verse: topVerse });
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const playGragger = useCallback(() => {
    if (muted) return;
    playRandomHamanSound();
    setSoundActive(true);
    if (soundTimer.current) clearTimeout(soundTimer.current);
    soundTimer.current = setTimeout(() => setSoundActive(false), 2000);
  }, [muted]);

  // Ref so shake effect can read current mute state
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      if (!prev) {
        // Muting: stop all playing sounds
        stopAllHamanSounds();
        setSoundActive(false);
        if (soundTimer.current) clearTimeout(soundTimer.current);
      }
      return !prev;
    });
  }, []);

  // Unlock audio on first user interaction (needed for shake-to-play on iOS/Android)
  useEffect(() => {
    let unlocked = false;
    const unlockAudio = () => {
      if (unlocked) return;
      unlocked = true;
      // Play a real sound file at zero volume to fully unlock iOS audio
      const audio = new Audio('/sounds/gragger1.mp3');
      audio.volume = 0;
      audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
    document.addEventListener('click', unlockAudio);
    return () => {
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
  }, []);

  // Shake detection for mobile devices
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const needsMotionPermission = typeof DeviceMotionEvent !== 'undefined'
    && typeof (DeviceMotionEvent as any).requestPermission === 'function';

  const hasMotionSupport = typeof DeviceMotionEvent !== 'undefined';

  useEffect(() => {
    if (!shakeEnabled) return;

    const SHAKE_THRESHOLD = 15;
    const STOP_DELAY = 100;
    let lastX = 0, lastY = 0, lastZ = 0;
    let hasReading = false;
    let stopTimer: ReturnType<typeof setTimeout> | null = null;
    const shakeIdx = Math.floor(Math.random() * 22) + 1;
    const shakeAudio = new Audio(`/sounds/gragger${shakeIdx}.mp3`);
    shakeAudio.loop = true;
    let isShaking = false;

    const stopShakeSounds = () => {
      shakeAudio.pause();
      shakeAudio.currentTime = 0;
      isShaking = false;
    };

    const startShakeGragger = () => {
      if (mutedRef.current || isShaking) return;
      isShaking = true;
      shakeAudio.play().catch(() => {});
      setSoundActive(true);
      if (soundTimer.current) clearTimeout(soundTimer.current);
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.acceleration;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      if (!hasReading) {
        lastX = acc.x; lastY = acc.y; lastZ = acc.z;
        hasReading = true;
        return;
      }

      const dx = Math.abs(acc.x - lastX);
      const dy = Math.abs(acc.y - lastY);
      const dz = Math.abs(acc.z - lastZ);
      lastX = acc.x; lastY = acc.y; lastZ = acc.z;

      if ((dx + dy + dz) > SHAKE_THRESHOLD) {
        // Reset stop timer — still shaking
        if (stopTimer) clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
          stopShakeSounds();
          soundTimer.current = setTimeout(() => setSoundActive(false), 1000);
        }, STOP_DELAY);

        if (!isShaking) {
          startShakeGragger();
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (stopTimer) clearTimeout(stopTimer);
      stopShakeSounds();
    };
  }, [shakeEnabled]);

  // iOS: request permission and enable shake (must be called from user gesture)
  const enableShakeIOS = useCallback(async () => {
    try {
      const result = await (DeviceMotionEvent as any).requestPermission();
      if (result === 'granted') setShakeEnabled(true);
    } catch {}
  }, []);

  return (
    <div class="megillah-reader" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {standalone && (
        <header class="reader-header">
          <span class="logo-main">{t.headerTitle}</span>
          <span class="logo-sub">{t.headerSub}</span>
        </header>
      )}
      {showTitle && (
        <div class="page-title-block">
          <h1 class="page-title">{t.headerTitle}</h1>
          <p class="page-subtitle">{t.headerSub}</p>
        </div>
      )}
      {/* Session info bar */}
      {session && (
        <div class="session-bar">
          <span class="session-code">
            <span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:4px">
              {session.role === 'admin' ? 'cast' : 'cast_connected'}
            </span>
            Code: {session.code}
          </span>
          <span class="session-role">
            {session.role === 'admin' ? 'Broadcasting' : 'Following'}
          </span>
          <button class="session-leave" onClick={session.leave}>
            <span class="material-icons" style="font-size:16px;vertical-align:middle;margin-right:2px">
              {session.role === 'admin' ? 'stop_circle' : 'logout'}
            </span>
            {session.role === 'admin' ? 'End' : 'Leave'}
          </button>
        </div>
      )}
      {session?.role === 'follower' && (
        <div class="following-banner">
          <span class="material-icons" style="font-size:18px;vertical-align:middle;margin-right:4px">sync</span>
          Following live — auto-scrolling
        </div>
      )}
      {/* Progress bar */}
      <div class="progress-bar-container" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div class="progress-bar-fill" style={{ width: `${scrollProgress * 100}%` }} />
        <span class="progress-label">
          {`${Math.round(scrollProgress * 100)}%`}
          {scrollProgress < 1 && ` · ~${Math.ceil((1 - scrollProgress) * totalMinutes)} ${t.minLeft}`}
        </span>
      </div>
      {/* Inline toolbar */}
      <div class="toolbar-sticky">
      <div class="inline-toolbar" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div class="toolbar-left">
          <span class="material-icons size-icon">text_fields</span>
          <input
            type="range"
            min="0.9"
            max="2.2"
            step="0.05"
            value={fontSize}
            onInput={(e) => setFontSize(parseFloat((e.target as HTMLInputElement).value))}
            class="size-slider"
          />
        </div>
        <div class="toolbar-right">
          <button
            class="toolbar-icon-btn"
            onClick={() => { setShowTimeEdit(!showTimeEdit); setMenuOpen(false); }}
            title={t.changeReadingTime}
          >
            <span class="material-icons">timer</span>
          </button>
          <button
            class="toolbar-icon-btn"
            onClick={() => { setMenuOpen(!menuOpen); setShowTimeEdit(false); }}
            title="Settings"
          >
            <span class="material-icons">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>
      {/* Reading time popover */}
      {showTimeEdit && (
        <div class="time-popover" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <label>
            {t.readingTime}
            <input
              type="number"
              min="10"
              max="90"
              value={draftMinutes}
              onInput={(e) => {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                if (val >= 10 && val <= 90) setDraftMinutes(val);
              }}
              class="time-input"
            />
          </label>
          <button
            class="save-time-btn"
            onClick={() => {
              setTotalMinutes(draftMinutes);
              sessionStorage.setItem('megillah-reading-minutes', String(draftMinutes));
              setShowTimeEdit(false);
              if (session?.role === 'admin') {
                session.broadcastTime(draftMinutes);
              }
            }}
          >
            {t.save}
          </button>
        </div>
      )}
      {/* Settings menu */}
      {menuOpen && (
        <div class="settings-menu" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <label class="option-toggle">
            <input
              type="checkbox"
              checked={showTranslation}
              onChange={() => setShowTranslation(!showTranslation)}
            />
            <span class="toggle-switch"></span>
            <span class="option-label">{t.showTranslation}</span>
          </label>
          <label class="option-toggle">
            <input
              type="checkbox"
              checked={showCantillation}
              onChange={() => setShowCantillation(!showCantillation)}
            />
            <span class="toggle-switch"></span>
            <span class="option-label">{t.showCantillation}</span>
          </label>
          <label class="option-toggle">
            <input
              type="checkbox"
              checked={chabadMode}
              onChange={() => setChabadMode(!chabadMode)}
            />
            <span class="toggle-switch"></span>
            <span class="option-label">{t.chabadCustom}</span>
          </label>
          {hasMotionSupport && (
            <label class="option-toggle">
              <input
                type="checkbox"
                checked={shakeEnabled}
                onChange={() => {
                  if (!shakeEnabled) {
                    if (needsMotionPermission) enableShakeIOS();
                    else setShakeEnabled(true);
                  } else {
                    setShakeEnabled(false);
                  }
                }}
              />
              <span class="toggle-switch"></span>
              <span class="option-label">{t.shakeToPlay}</span>
            </label>
          )}
          <label class="option-toggle">
            <input
              type="checkbox"
              checked={showIllustrations}
              onChange={() => setShowIllustrations(!showIllustrations)}
            />
            <span class="toggle-switch"></span>
            <span class="option-label">{t.displayIllustrations}</span>
          </label>
          <div class="menu-row">
            <label>
              {t.language}
              <select
                class="lang-select"
                value={lang}
                onChange={(e) => setLang((e.target as HTMLSelectElement).value as Lang)}
              >
                <option value="he">עברית</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ru">Русский</option>
                <option value="fr">Français</option>
                <option value="pt">Português</option>
                <option value="it">Italiano</option>
              </select>
            </label>
          </div>
        </div>
      )}
      </div>

      <p class="hint-text">
        <span class="material-icons hint-icon">touch_app</span>
        {chabadMode ? t.chabadHint : t.tapHint}
      </p>

      <div class="scroll-text" dir="rtl" ref={scrollTextRef}>
        <div class="blessings-block" data-verse="blessings-before">
          <h2 class="chapter-heading">{lang === 'he' ? 'ברכות לפני קריאת המגילה' : 'Blessings Before the Reading'}</h2>
          <div class="blessing-text">
            <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל מִקְרָא מְגִלָּה.</p>
            <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשָׂה נִסִּים לַאֲבוֹתֵינוּ בַּיָּמִים הָהֵם בַּזְּמַן הַזֶּה.</p>
            <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה.</p>
          </div>
        </div>

        {megillahText.map((ch) => (
          <div key={ch.chapter} class="chapter-block">
            <h2 class="chapter-heading">{t.chapter} {lang === 'he' ? toHebrew(ch.chapter) : ch.chapter}</h2>
            <div class={`verses-container${showTranslation ? ' with-translation' : ''}`} style={{ fontSize: `${fontSize}rem` }}>
              {ch.verses.flatMap((v) => {
                const verseKey = `${ch.chapter}:${v.verse}`;

                // Skip 9:7-9:9, they're rendered inside the bnei haman block at 9:6
                if (BNEI_HAMAN_VERSES.has(verseKey)) return [];

                // Verse 9:6: split at "חמש מאות איש", render first part normally, then the bnei haman block
                if (verseKey === BNEI_HAMAN_SPLIT_VERSE) {
                  const raw = !showCantillation ? stripCantillation(v.text) : v.text;
                  const splitParts = raw.split(BNEI_HAMAN_SPLIT_RE);
                  const beforeText = splitParts[0] || '';
                  const splitText = splitParts[1] || '';

                  // Collect all sons' names from 9:7-9:9
                  const sonsVerses = ch.verses.filter(sv => BNEI_HAMAN_VERSES.has(`${ch.chapter}:${sv.verse}`));
                  const allNames = sonsVerses.flatMap(sv => {
                    const t = !showCantillation ? stripCantillation(sv.text) : sv.text;
                    return t.split(/\s{2,}/).map(n => n.trim()).filter(Boolean);
                  });

                  const bneiTranslations = activeTranslations
                    ? ['9:6', '9:7', '9:8', '9:9']
                        .map(k => activeTranslations[k])
                        .filter(Boolean)
                        .join(' ')
                    : null;

                  return [
                    <span key="9-6-before" class="verse" data-verse="9:6">
                      <sup class="verse-num">{toHebrew(v.verse)}</sup>
                      {beforeText}
                    </span>,
                    <span key="bnei-haman-block" class="verse loud-verse bnei-haman" data-verse="9:7">
                      <span class="loud-label" dir={lang === 'he' ? 'rtl' : 'ltr'}>{t.bneiHamanLabel}</span>
                      <span class="haman-son">{splitText}</span>
                      {allNames.map((name, i) => (
                        <span key={`son-${i}`} class="haman-son">{name}</span>
                      ))}
                      {bneiTranslations && <span class="verse-translation" dir={lang === 'he' ? 'rtl' : 'ltr'}>{bneiTranslations}</span>}
                    </span>,
                  ];
                }

                const verseResult = [renderVerse(v.text, ch.chapter, v.verse, playGragger, chabadMode, !showCantillation, t, lang, activeTranslations)];
                const illustration = showIllustrations && ILLUSTRATIONS.find(ill => ill.after === verseKey);
                if (illustration) {
                  verseResult.push(
                    <div class={`illustration${lang === 'he' ? ' illustration-he' : ''}`} key={`ill-${verseKey}`}>
                      <img src={illustration.src} alt={illustration[lang === 'he' ? 'he' : 'en']} loading="lazy" />
                    </div>
                  );
                }
                return verseResult;
              })}
            </div>
          </div>
        ))}

        <div class="blessings-block" data-verse="blessings-after">
          <h2 class="chapter-heading">{lang === 'he' ? 'ברכה לאחר קריאת המגילה' : 'Blessing After the Reading'}</h2>
          <div class="blessing-text">
            <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, הָרָב אֶת רִיבֵנוּ, וְהַדָּן אֶת דִּינֵנוּ, וְהַנּוֹקֵם אֶת נִקְמָתֵנוּ, וְהַנִּפְרָע לָנוּ מִצָּרֵינוּ, וְהַמְשַׁלֵּם גְּמוּל לְכָל אוֹיְבֵי נַפְשֵׁנוּ, בָּרוּךְ אַתָּה אֲ-דוֹנָי, הַנִּפְרָע לְעַמּוֹ יִשְׂרָאֵל מִכָּל צָרֵיהֶם, הָאֵ-ל הַמּוֹשִׁיעַ.</p>
          </div>
        </div>

        <div class="blessings-block" data-verse="shoshanat">
          <h2 class="chapter-heading">{lang === 'he' ? 'שׁוֹשַׁנַּת יַעֲקֹב' : 'Shoshanat Yaakov'}</h2>
          <div class="blessing-text shoshanat-yaakov">
            <p>שׁוֹשַׁנַּת יַעֲקֹב צָהֲלָה וְשָׂמֵחָה, בִּרְאוֹתָם יַחַד תְּכֵלֶת מָרְדְּכָי,</p>
            <p>תְּשׁוּעָתָם הָיִיתָ לָנֶצַח, וְתִקְוָתָם בְּכָל דּוֹר וָדוֹר.</p>
            <p>לְהוֹדִיעַ שֶׁכָּל קֹוֶיךָ לֹא יֵבֹשׁוּ וְלֹא יִכָּלְמוּ לָנֶצַח כָּל הַחוֹסִים בָּךְ.</p>
            <p>אָרוּר הָמָן אֲשֶׁר בִּקֵשׁ לְאַבְּדִי, בָּרוּךְ מָרְדְּכַי הַיְּהוּדִי.</p>
            <p>אֲרוּרָה זֶרֶשׁ אֵשֶׁת מַפְחִידִי, בְּרוּכָה אֶסְתֵּר בַּעֲדִי.</p>
            <p>אֲרוּרִים כָּל הָרְשָׁעִים, בְּרוּכִים כָּל הַצַּדִּיקִים,</p>
            <p>וְגַם חַרְבוֹנָה זָכוּר לַטּוֹב.</p>
          </div>
        </div>
      </div>

      {(soundActive || muted) && (
        <button
          class={`sound-fab${soundActive && !muted ? ' playing' : ''}`}
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          <span class="material-icons">
            {muted ? 'volume_off' : 'volume_up'}
          </span>
        </button>
      )}

      <style>{`
        .megillah-reader {
        }

        .reader-header {
          background: var(--color-burgundy);
          color: var(--color-white);
          padding: 14px 0;
          text-align: center;
          box-shadow: 0 2px 8px rgba(102, 10, 35, 0.3);
          margin: 0 -16px 0;
        }

        .reader-header .logo-main {
          display: block;
          font-size: 1.3rem;
          font-weight: 900;
          letter-spacing: 0.02em;
        }

        .reader-header .logo-sub {
          display: block;
          font-size: 0.75rem;
          font-weight: 300;
          opacity: 0.85;
          margin-top: 2px;
        }

        .header-link {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .page-title-block {
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--color-burgundy);
          text-align: center;
          margin-bottom: 4px;
        }

        .page-subtitle {
          text-align: center;
          font-size: 0.9rem;
          color: var(--color-text-light);
        }

        .progress-bar-container {
          position: sticky;
          top: 0;
          height: 20px;
          background: var(--color-cream-dark);
          overflow: hidden;
          z-index: 51;
        }

        .progress-bar-fill {
          height: 100%;
          background: rgba(102, 10, 35, 0.35);
          transition: width 0.15s ease-out;
        }

        .progress-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-text);
          white-space: nowrap;
          text-shadow: 0 0 3px var(--color-white), 0 0 3px var(--color-white);
        }

        .toolbar-sticky {
          position: sticky;
          top: 20px;
          z-index: 50;
          margin-bottom: 14px;
        }

        .inline-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--color-white);
          border-radius: 0 0 12px 12px;
          padding: 8px 14px;
          box-shadow: 0 2px 8px rgba(102, 10, 35, 0.08);
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .toolbar-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
          color: var(--color-text-light);
          border-radius: 50%;
          transition: background 0.2s, color 0.2s;
        }

        .toolbar-icon-btn:hover {
          background: var(--color-cream-dark);
          color: var(--color-text);
        }

        .toolbar-icon-btn .material-icons {
          font-size: 22px;
        }

        .time-popover {
          background: var(--color-white);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 10px;
          box-shadow: 0 2px 12px rgba(102, 10, 35, 0.12);
          text-align: center;
          font-size: 0.85rem;
        }

        .time-input {
          width: 50px;
          margin: 0 8px;
          padding: 2px 6px;
          border: 1px solid var(--color-cream-dark);
          border-radius: 4px;
          font-size: 0.8rem;
          text-align: center;
        }

        .save-time-btn {
          padding: 3px 12px;
          background: var(--color-burgundy);
          color: var(--color-white);
          border: none;
          border-radius: 4px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .settings-menu {
          background: var(--color-white);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 14px;
          box-shadow: 0 2px 12px rgba(102, 10, 35, 0.12);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .menu-row {
          font-size: 0.85rem;
        }

        .lang-select {
          margin-inline-start: 8px;
          padding: 2px 6px;
          border: 1px solid var(--color-cream-dark);
          border-radius: 4px;
          font-size: 0.8rem;
        }


        .option-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }

        .option-toggle input {
          display: none;
        }

        .toggle-switch {
          position: relative;
          width: 40px;
          height: 22px;
          background: var(--color-cream-dark);
          border-radius: 11px;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .option-toggle input:checked + .toggle-switch {
          background: var(--color-burgundy);
        }

        .option-toggle input:checked + .toggle-switch::after {
          transform: translateX(18px);
        }

        .option-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-text);
        }

        .size-icon {
          font-size: 20px;
          color: var(--color-burgundy);
        }

        .size-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 140px;
          height: 6px;
          background: var(--color-cream-dark);
          border-radius: 3px;
          outline: none;
          direction: ltr;
        }

        .size-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          background: var(--color-burgundy);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(102, 10, 35, 0.3);
        }

        .size-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          background: var(--color-burgundy);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 4px rgba(102, 10, 35, 0.3);
        }

        .hint-text {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.9rem;
          color: var(--color-gold);
          font-weight: 500;
          margin-bottom: 20px;
          text-align: center;
        }

        .hint-icon {
          font-size: 20px;
        }

        .scroll-text {
          background: var(--color-white);
          border-radius: 16px;
          padding: 28px 24px;
          box-shadow: 0 2px 12px rgba(102, 10, 35, 0.1);
          position: relative;
          z-index: 1;
        }

        .chapter-block {
          margin-bottom: 36px;
        }

        .chapter-block:last-child {
          margin-bottom: 0;
        }

        .chapter-heading {
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--color-burgundy);
          text-align: center;
          margin-bottom: 18px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--color-cream-dark);
        }

        .verses-container {
          font-family: Arial, 'Heebo', sans-serif;
          font-weight: 700;
          line-height: 2.4;
          text-align: justify;
        }

        .verses-container.with-translation {
          line-height: 1.8;
          font-weight: 500;
          font-size: 0.85em;
        }

        .verse-num {
          color: var(--color-gold);
          font-size: 0.55em;
          font-weight: 700;
          margin-inline-end: 2px;
          user-select: none;
        }

        .haman-name {
          color: #666;
          padding: 2px 5px;
          border: 1.5px dotted #999;
          border-radius: 4px;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          user-select: none;
          display: inline;
        }

        .haman-name:hover {
          color: #444;
          border-color: #666;
        }

        .haman-name.shake {
          animation: shake 0.4s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-3px) rotate(-2deg); }
          30% { transform: translateX(3px) rotate(2deg); }
          45% { transform: translateX(-2px) rotate(-1deg); }
          60% { transform: translateX(2px) rotate(1deg); }
          75% { transform: translateX(-1px); }
        }

        .haman-splat {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
          animation: splat-fly 0.5s ease-out forwards;
        }

        @keyframes splat-fly {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.5);
          }
          40% {
            opacity: 1;
            transform: translate(calc(-50% + var(--dx) * 0.6), calc(-50% + var(--dy) * 0.6)) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.2);
          }
        }

        .blessings-block {
          margin-bottom: 36px;
          text-align: center;
        }

        .blessing-text {
          font-family: Arial, 'Heebo', sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 2.2;
        }

        .blessing-text p {
          margin-bottom: 12px;
        }

        .shoshanat-yaakov p {
          margin-bottom: 4px;
        }

        .confetti-piece {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          border-radius: 2px;
          animation: confetti-fall 2s ease-out forwards;
        }

        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) translateX(var(--dx)) rotate(var(--rot));
          }
        }

        .loud-verse {
          display: block;
          background: linear-gradient(135deg, rgba(232, 190, 80, 0.15), rgba(232, 190, 80, 0.25));
          border-radius: 6px;
          padding: 8px 10px 4px;
          border-right: 3px solid var(--color-gold);
          margin: 8px 0;
        }

        .loud-label {
          display: block;
          font-size: 0.65em;
          font-weight: 700;
          color: var(--color-gold);
          margin-bottom: 4px;
          line-height: 1;
        }

        .bnei-haman {
          text-align: center;
        }

        .haman-son {
          display: block;
          line-height: 2;
        }

        .verse-translation {
          display: block;
          font-size: 0.95em;
          font-weight: 400;
          color: var(--color-text-light);
          line-height: 1.5;
          margin: 6px 0 12px;
          text-align: start;
        }

        .sound-fab {
          position: fixed;
          bottom: 24px;
          inset-inline-end: 24px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--color-burgundy);
          color: var(--color-white);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 12px rgba(102, 10, 35, 0.35);
          z-index: 100;
          transition: background 0.2s, transform 0.2s;
        }

        .sound-fab:hover {
          transform: scale(1.1);
        }

        .sound-fab .material-icons {
          font-size: 24px;
        }

        .sound-fab.playing {
          animation: fab-pulse 0.6s ease-in-out infinite;
        }

        @keyframes fab-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 3px 12px rgba(102, 10, 35, 0.35); }
          50% { transform: scale(1.15); box-shadow: 0 4px 20px rgba(102, 10, 35, 0.5); }
        }

        .session-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: var(--color-burgundy);
          color: var(--color-white);
          padding: 8px 16px;
          font-size: 0.85rem;
          font-weight: 500;
          margin: 0 -16px;
        }

        .session-code {
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .session-role {
          opacity: 0.8;
          font-size: 0.8rem;
        }

        .session-leave {
          background: rgba(255,255,255,0.15);
          color: var(--color-white);
          border: none;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .session-leave:hover {
          background: rgba(255,255,255,0.25);
        }

        .following-banner {
          background: linear-gradient(135deg, rgba(232, 150, 46, 0.15), rgba(232, 150, 46, 0.25));
          color: var(--color-gold);
          text-align: center;
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          margin: 0 -16px;
        }

        .illustration {
          float: right;
          margin: 8px 0 8px 20px;
          width: 45%;
        }

        .illustration.illustration-he {
          float: left;
          margin: 8px 20px 8px 0;
        }

        .illustration img {
          width: 100%;
          border-radius: 8px;
        }

        .mobile-only { display: inline; }

        @media (min-width: 768px) {
          .mobile-only { display: none; }
          .scroll-text {
            padding: 36px 32px;
          }
        }
      `}</style>
    </div>
  );
}
