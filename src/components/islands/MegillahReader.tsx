import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { megillahText } from '../../lib/megillah-text';
import { translationsEn } from '../../lib/megillah-translations-en';
import type { Session, ScrollPosition } from '../../lib/useSession';

type Lang = 'he' | 'en' | 'es' | 'ru' | 'fr' | 'pt' | 'it' | 'hu' | 'de' | 'el';
type TranslationMap = Record<string, string>;

function toHebrew(n: number): string {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  return (tens[Math.floor(n / 10)] || '') + (ones[n % 10] || '');
}

const LOUD_VERSES = new Set(['2:5', '8:15', '8:16', '10:3']);

const LOUD_TRANSLITERATIONS: Record<string, Record<string, string>> = {
  en: {
    '2:5': 'Ish Yehudi haya b\'Shushan habirah, ush\'mo Mordechai ben Ya\'ir ben Shim\'i ben Kish, ish Y\'mini.',
    '8:15': 'U\'Mordechai yatza milifnei hamelech bil\'vush malchut t\'chelet vachur, va\'ateret zahav g\'dolah, v\'tachrich butz v\'argaman, v\'ha\'ir Shushan tzahalah v\'sameicha.',
    '8:16': 'LaYehudim hayta orah v\'simcha v\'sasson vikar.',
    '10:3': 'Ki Mordechai haYehudi mishneh lamelech Achashveirosh, v\'gadol laYehudim v\'ratzui l\'rov echav, doreish tov l\'amo v\'doveir shalom l\'chol zar\'o.',
  },
  es: {
    '2:5': 'Ish Yehudí hayá be-Shushán habirá, ushmó Mordejai ben Yaír ben Shimí ben Kish, ish Yeminí.',
    '8:15': 'U-Mordejai yatzá milifnéi hamélej bilvúsh maljut tejélet vajúr, vaatéret zaháv guedolá, vetajríj butz veargamán, vehair Shushán tzahalá vesaméja.',
    '8:16': 'LaYehudím haytá orá vesimjá vesasón vikar.',
    '10:3': 'Ki Mordejai haYehudí mishné lamélej Ajashverósh, vegadól laYehudím veratzúi lerov ejáv, dorésh tov leamó vedovér shalóm lejol zaró.',
  },
  fr: {
    '2:5': 'Ish Yehoudi haya be-Shoushan habirah, oushmo Mordekhaï ben Yaïr ben Shim\'i ben Kish, ish Yemini.',
    '8:15': 'Ou-Mordekhaï yatza milifneï hamélekh bilvoush malkhout tekhélet va\'hour, vaatéret zahav guedolah, vetakhrikh boutz veargamane, vehaïr Shoushan tzahalah vesamé\'ha.',
    '8:16': 'LaYehoudim hayta orah vesim\'ha vesassone vikar.',
    '10:3': 'Ki Mordekhaï haYehoudi mishné lamélekh A\'hashvérosh, vegadol laYehoudim veratzouï lerov é\'hav, dorésh tov leamo vedovér shalom lekhol zaro.',
  },
  ru: {
    '2:5': 'Иш Йеуди хая бе-Шушан хабира, ушмо Мордехай бен Яир бен Шими бен Киш, иш Йемини.',
    '8:15': 'У-Мордехай яца милифней хамелех бильвуш малхут тхелет вахур, ваатерет захав гдола, ветахрих буц веаргаман, веха-ир Шушан цахала весамеха.',
    '8:16': 'Ла-Йехудим хайта ора весимха весасон викар.',
    '10:3': 'Ки Мордехай ха-Йехуди мишне ламелех Ахашверош, вегадоль ла-Йехудим верацуй леров эхав, дореш тов леамо ведовер шалом лехоль заро.',
  },
  pt: {
    '2:5': 'Ish Yehudí hayá be-Shushán habirá, ushmó Mordechai ben Yaír ben Shimí ben Kish, ish Yeminí.',
    '8:15': 'U-Mordechai yatzá milifnéi hamélech bilvúsh malchút techélet vachúr, vaatéret zaháv guedolá, vetachríkh butz veargamán, vehaír Shushán tzahalá vesamécha.',
    '8:16': 'LaYehudím haytá orá vesimchá vesassón vikár.',
    '10:3': 'Ki Mordechai haYehudí mishné lamélech Achashverósh, vegadól laYehudím veratzúi leróv echáv, dorésh tov leamó vedovér shalóm lechól zaró.',
  },
  it: {
    '2:5': 'Ish Yehudì hayà be-Shushàn habiràh, ushmò Mordechai ben Yaìr ben Shimì ben Kish, ish Yeminì.',
    '8:15': 'U-Mordechai yatzà milifnèi hamèlech bilvùsh malchùt techèlet vachùr, vaatèret zahàv ghedolàh, vetachrìch butz veargamàn, vehaìr Shushàn tzahalàh vesamècha.',
    '8:16': 'LaYehudìm haytà oràh vesimchàh vesassòn vikàr.',
    '10:3': 'Ki Mordechai haYehudì mishnè lamèlech Achashveròsh, vegadòl laYehudìm veratzùi leròv echàv, dorèsh tov leamò vedovèr shalòm lechòl zarò.',
  },
  hu: {
    '2:5': 'Is Jehudi hájá be-Susán hábirá, usmó Mordecháj ben Jáir ben Simi ben Kis, is Jemini.',
    '8:15': 'U-Mordecháj jácá milifné hámelech bilvus málchut tchélet váchur, vááteret záháv gdolá, vetáchrich buc veárgámán, veháir Susán cáhálá veszáméchá.',
    '8:16': 'LáJehudim hájtá orá veszimchá veszászon vikár.',
    '10:3': 'Ki Mordecháj háJehudi misne lámelech Áchásverós, vegádol láJehudim verácuj lerov echáv, dorés tov leámó vedovér sálom lechol záro.',
  },
  de: {
    '2:5': 'Isch Jehudi haja be-Schuschan habira, uschmo Mordechai ben Jair ben Schimi ben Kisch, isch Jemini.',
    '8:15': 'U-Mordechai jatza milifnei hamelech bilwusch malchut techelet wachur, waateret sahaw gedola, wetachrich buz weargaman, wehair Schuschan zahala wesamecha.',
    '8:16': 'LaJehudim hajta ora wesimcha wesasson wikar.',
    '10:3': 'Ki Mordechai haJehudi mischne lamelech Achaschverosch, wegadol laJehudim weratzui lerow echaw, doresch tow leamo wedower schalom lechol saro.',
  },
  el: {
    '2:5': 'Ισς Γιεουντί αγιά μπε-Σσουσσάν αμπιρά, ουσσμό Μορντοάι μπεν Γιαΐρ μπεν Σσιμΐ μπεν Κισς, ισς Γιεμινί.',
    '8:15': 'Ου-Μορντοάι γιατζά μιλιφνέι αμέλε μπιλβούσς μαλούτ τεέλετ βαούρ, βααταρέτ ζαάβ γκεντολά, βεταρί μπουτζ βεαργαμάν, βεαΐρ Σσουσσάν τζααλά βεσαμέα.',
    '8:16': 'Λα-Γιεουντίμ αϊτά ορά βεσιμά βεσασόν βικάρ.',
    '10:3': 'Κι Μορντοάι α-Γιεουντί μισσνέ λαμέλε Αασσβερόσς, βεγκαντόλ λα-Γιεουντίμ βερατζούι λερόβ εάβ, ντορέσς τοβ λεαμό βεντοβέρ σσαλόμ λεόλ ζαρό.',
  },
};
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
  { after: '1:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.1_1_3x2.jpg' },
  { after: '1:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.2_1_3x2.jpg' },
  { after: '1:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.3_1_3x2.jpg' },
  { after: '1:4', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.4_1_3x2.jpg' },
  { after: '1:5', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.5_1_3x2.jpg' },
  { after: '1:6', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.6_1_3x2.jpg' },
  { after: '1:7', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.7_1_3x2.jpg' },
  { after: '1:8', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.8_1_3x2.jpg' },
  { after: '1:9', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.9_1_3x2.jpg' },
  { after: '1:10', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.10_1_3x2.jpg' },
  { after: '1:11', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.11_1_3x2.jpg' },
  { after: '1:12', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.12_1_3x2.jpg' },
  { after: '1:13', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.13_1_3x2.jpg' },
  { after: '1:14', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.14_1_3x2.jpg' },
  { after: '1:15', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.15_1_3x2.jpg' },
  { after: '1:16', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.16_1_3x2.jpg' },
  { after: '1:17', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.17_1_3x2.jpg' },
  { after: '1:18', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.18_1_3x2.jpg' },
  { after: '1:19', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.19_1_3x2.jpg' },
  { after: '1:20', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.20_1_3x2.jpg' },
  { after: '1:21', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.21_1_3x2.jpg' },
  { after: '1:22', src: 'https://scroll.torahapp.org/imgs/Esther/esther.1.22_1_3x2.jpg' },
  { after: '2:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.1_1_3x2.jpg' },
  { after: '2:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.2_1_3x2.jpg' },
  { after: '2:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.3_1_3x2.jpg' },
  { after: '2:4', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.4_1_3x2.jpg' },
  { after: '2:5', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.5_1_3x2.jpg' },
  { after: '2:6', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.6_1_3x2.jpg' },
  { after: '2:7', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.7_1_3x2.jpg' },
  { after: '2:8', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.8_1_3x2.jpg' },
  { after: '2:9', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.9_1_3x2.jpg' },
  { after: '2:10', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.10_1_3x2.jpg' },
  { after: '2:11', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.11_1_3x2.jpg' },
  { after: '2:12', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.12_1_3x2.jpg' },
  { after: '2:13', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.13_1_3x2.jpg' },
  { after: '2:14', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.14_1_3x2.jpg' },
  { after: '2:15', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.15_1_3x2.jpg' },
  { after: '2:16', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.16_1_3x2.jpg' },
  { after: '2:17', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.17_1_3x2.jpg' },
  { after: '2:18', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.18_1_3x2.jpg' },
  { after: '2:19', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.19_1_3x2.jpg' },
  { after: '2:20', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.20_1_3x2.jpg' },
  { after: '2:21', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.21_1_3x2.jpg' },
  { after: '2:22', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.22_1_3x2.jpg' },
  { after: '2:23', src: 'https://scroll.torahapp.org/imgs/Esther/esther.2.23_1_3x2.jpg' },
  { after: '3:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.3.1_1_3x2.jpg' },
  { after: '3:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.3.2_1_3x2.jpg' },
  { after: '3:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.3.3_1_3x2.jpg' },
  { after: '5:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.1_1_3x2.jpg' },
  { after: '5:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.2_1_3x2.jpg' },
  { after: '5:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.3_1_3x2.jpg' },
  { after: '5:4', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.4_1_3x2.jpg' },
  { after: '5:5', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.5_1_3x2.jpg' },
  { after: '5:6', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.6_1_3x2.jpg' },
  { after: '5:7', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.7_1_3x2.jpg' },
  { after: '5:9', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.9_1_3x2.jpg' },
  { after: '5:10', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.10_1_3x2.jpg' },
  { after: '5:11', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.11_1_3x2.jpg' },
  { after: '5:12', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.12_1_3x2.jpg' },
  { after: '5:13', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.13_1_3x2.jpg' },
  { after: '5:14', src: 'https://scroll.torahapp.org/imgs/Esther/esther.5.14_1_3x2.jpg' },
  { after: '6:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.1_1_3x2.jpg' },
  { after: '6:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.2_1_3x2.jpg' },
  { after: '6:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.3_1_3x2.jpg' },
  { after: '6:4', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.4_1_3x2.jpg' },
  { after: '6:5', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.5_1_3x2.jpg' },
  { after: '6:6', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.6_1_3x2.jpg' },
  { after: '6:7', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.7_1_3x2.jpg' },
  { after: '6:8', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.8_1_3x2.jpg' },
  { after: '6:9', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.9_1_3x2.jpg' },
  { after: '6:10', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.10_1_3x2.jpg' },
  { after: '6:11', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.11_1_3x2.jpg' },
  { after: '6:12', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.12_1_3x2.jpg' },
  { after: '6:13', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.13_1_3x2.jpg' },
  { after: '6:14', src: 'https://scroll.torahapp.org/imgs/Esther/esther.6.14_1_3x2.jpg' },
  { after: '7:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.1_1_3x2.jpg' },
  { after: '7:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.2_1_3x2.jpg' },
  { after: '7:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.3_1_3x2.jpg' },
  { after: '7:4', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.4_1_3x2.jpg' },
  { after: '7:5', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.5_1_3x2.jpg' },
  { after: '7:6', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.6_1_3x2.jpg' },
  { after: '7:7', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.7_1_3x2.jpg' },
  { after: '7:8', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.8_1_3x2.jpg' },
  { after: '7:9', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.9_1_3x2.jpg' },
  { after: '7:10', src: 'https://scroll.torahapp.org/imgs/Esther/esther.7.10_1_3x2.jpg' },
  { after: '8:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.1_1_3x2.jpg' },
  { after: '8:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.2_1_3x2.jpg' },
  { after: '8:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.3_1_3x2.jpg' },
  { after: '8:4', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.4_1_3x2.jpg' },
  { after: '8:5', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.5_1_3x2.jpg' },
  { after: '8:6', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.6_1_3x2.jpg' },
  { after: '8:7', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.7_1_3x2.jpg' },
  { after: '8:8', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.8_1_3x2.jpg' },
  { after: '8:9', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.9_1_3x2.jpg' },
  { after: '8:10', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.10_1_3x2.jpg' },
  { after: '8:11', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.11_1_3x2.jpg' },
  { after: '8:12', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.12_1_3x2.jpg' },
  { after: '8:13', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.13_1_3x2.jpg' },
  { after: '8:14', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.14_1_3x2.jpg' },
  { after: '8:15', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.15_1_3x2.jpg' },
  { after: '8:16', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.16_1_3x2.jpg' },
  { after: '8:17', src: 'https://scroll.torahapp.org/imgs/Esther/esther.8.17_1_3x2.jpg' },
  { after: '9:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.1_1_3x2.jpg' },
  { after: '9:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.2_1_3x2.jpg' },
  { after: '9:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.3_1_3x2.jpg' },
  { after: '9:4', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.4_1_3x2.jpg' },
  { after: '9:5', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.5_1_3x2.jpg' },
  { after: '9:6', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.6_1_3x2.jpg' },
  { after: '9:7', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.7_1_3x2.jpg' },
  { after: '9:8', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.8_1_3x2.jpg' },
  { after: '9:9', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.9_1_3x2.jpg' },
  { after: '9:10', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.10_1_3x2.jpg' },
  { after: '9:11', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.11_1_3x2.jpg' },
  { after: '9:12', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.12_1_3x2.jpg' },
  { after: '9:13', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.13_1_3x2.jpg' },
  { after: '9:14', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.14_1_3x2.jpg' },
  { after: '9:15', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.15_1_3x2.jpg' },
  { after: '9:16', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.16_1_3x2.jpg' },
  { after: '9:17', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.17_1_3x2.jpg' },
  { after: '9:18', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.18_1_3x2.jpg' },
  { after: '9:19', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.19_1_3x2.jpg' },
  { after: '9:20', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.20_1_3x2.png' },
  { after: '9:21', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.21_1_3x2.png' },
  { after: '9:22', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.22_1_3x2.jpg' },
  { after: '9:23', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.23_1_3x2.png' },
  { after: '9:24', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.24_1_3x2.png' },
  { after: '9:25', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.25_1_3x2.png' },
  { after: '9:26', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.26_1_3x2.png' },
  { after: '9:27', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.27_1_3x2.png' },
  { after: '9:28', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.28_1_3x2.png' },
  { after: '9:29', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.29_1_3x2.png' },
  { after: '9:30', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.30_1_3x2.png' },
  { after: '9:31', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.31_1_3x2.png' },
  { after: '9:32', src: 'https://scroll.torahapp.org/imgs/Esther/esther.9.32_1_3x2.png' },
  { after: '10:1', src: 'https://scroll.torahapp.org/imgs/Esther/esther.10.1_1_3x2.png' },
  { after: '10:2', src: 'https://scroll.torahapp.org/imgs/Esther/esther.10.2_1_3x2.png' },
  { after: '10:3', src: 'https://scroll.torahapp.org/imgs/Esther/esther.10.3_1_3x2.png' },
];

const translations = {
  he: {
    showCantillation: 'הצג טעמים',
    chabadCustom: 'הדגש המן לפי מנהג חב״ד',
    showTranslation: 'הגדרות',
    hebrewOnly: 'טקסט המגילה',
    langName: 'ביאור',
    hebrewName: 'טקסט המגילה',
    only: 'בלבד',
    both: 'שניהם',
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
    headerSub: <a href="https://chabadisrael.co.il/purim" target="_blank" rel="noopener noreferrer" class="header-link">למידע נוסף על מצוות החג לחץ כאן</a>,
    language: 'שפה',
    editTitle: 'ערוך כותרת',
    titleText: 'כותרת',
    editSubtitle: 'ערוך כותרת משנה',
    subtitleText: 'טקסט',
    subtitleUrl: 'קישור (אופציונלי)',
    displayIllustrations: 'הצג איורים',
    trackScrolling: 'גלילה בלבד, ללא הדגשה',
    trackVerse: 'פסוקים שתלחץ יודגשו לצופים (מומלץ)',
    trackWord: 'מילים שתלחץ יודגשו לצופים',
    editTapHint: 'ערוך הודעה',
    resetToDefault: 'איפוס לברירת מחדל',
    sessionCode: 'קוד',
    broadcasting: 'משדר',
    following: 'עוקב',
    endSession: 'סיום',
    leaveSession: 'יציאה',
    cancel: 'ביטול',
    joinLive: 'שידור חי',
    syncOn: 'עוקב אחרי השידור החי',
    syncOff: 'הפסקת מעקב — גלול בקצב שלך',
    copyLink: 'העתק קישור',
    copied: 'הועתק!',
    viewAsFollower: 'צפייה כעוקב',
    onboardingFollowerAutoScroll: 'גלילה אוטומטית',
    onboardingFollowerAutoScrollText: 'המגילה תתחיל לגלול מעצמה ברגע שהקורא מתחיל. אם זה מהר מדי, לחצו על הכפתור הזה כדי לעצור את הגלילה — לחצו שוב כדי לחזור לעקוב.',
    onboardingFollowerOptions: 'אפשרויות נוספות',
    onboardingFollowerOptionsText: 'כאן תוכלו להפעיל איורים, לשנות שפה, ועוד. גודל הגופן ניתן לשינוי בסרגל הכלים.',
    onboardingAdminInvite: 'הזמנת אנשים',
    onboardingAdminInviteText: 'לחצו על קוד השידור כדי להציג קוד QR וקישור הזמנה — שתפו אותם כדי שאנשים יצטרפו לשידור.',
    onboardingAdminHighlight: 'הדגשת פסוקים',
    onboardingAdminHighlightText: 'לחצו על פסוקים כדי להדגיש אותם עבור כל העוקבים. העוקבים יכולים ללחוץ על כפתור העקיבה {icon} כדי לעצור את הגלילה האוטומטית אם הקריאה מהירה מדי — וללחוץ שוב כדי לחזור.',
    onboardingAdminTracking: 'אפשרויות מעקב',
    onboardingAdminTrackingText: 'כאן תמצאו את אפשרויות המעקב השונות. ברירת המחדל היא מעקב מילה-אחר-מילה. לחצו על פסוקים כדי להדגיש אותם עבור כל העוקבים. העוקבים יכולים ללחוץ על כפתור העקיבה כדי לעצור את הגלילה האוטומטית אם הקריאה מהירה מדי — וללחוץ שוב כדי לחזור.',
    onboardingAdminTime: 'זמן קריאה',
    onboardingAdminTimeText: 'הגדירו את זמן הקריאה המשוער. זה יציג לכל העוקבים כמה דקות נותרו.',
    onboardingAdminSettings: 'הגדרות לכולם',
    onboardingAdminSettingsText: 'ההגדרות שתבחרו (שפה, הדגשת המנים, איורים) יחולו על כל העוקבים.',
    onboardingAdminReadingMode: 'מצב קריאה',
    onboardingAdminReadingModeText: 'מצב הקריאה שתבחרו יהיה ברירת המחדל לכל מי שמצטרף, אבל הם יכולים לשנות אותו אצלם.',
    onboardingAdminSubtitle: 'עריכת כותרת משנה',
    onboardingAdminSubtitleText: 'לחצו כאן כדי לשנות את הכותרת מתחת לשם האפליקציה — לדוגמה, שם בית הכנסת או קישור.',
    onboardingAdminAnnouncements: 'הודעות ניתנות לעריכה',
    onboardingAdminAnnouncementsText: 'כל ההודעות ניתנות לעריכה: לחצו על סמל העיפרון כדי לערוך את הטקסט שמופיע מעל המגילה. יש גם אזור נוסף לעריכה בראש הדף, וליד הטקסט מתחת למגילה.',
    onboardingSkip: 'דלג',
    onboardingNext: 'הבא',
    onboardingGotIt: 'הבנתי!',
  },
  en: {
    showCantillation: 'Show cantillation signs',
    chabadCustom: 'Highlight fewer Hamans',
    showTranslation: 'Translation',
    hebrewOnly: 'Hebrew Only',
    langName: 'English',
    hebrewName: 'Hebrew',
    only: 'Only',
    both: 'Both',
    fontSize: 'Font size',
    minLeft: 'min left',
    readingTime: 'Reading time (min):',
    save: 'Save',
    changeReadingTime: 'Change reading time',
    chabadHint: 'Chabad custom — Haman highlighted only with a title',
    tapHint: <>Don't have a gragger?<br class="mobile-only"/> Just click Haman's name!</>,
    listenTitle: 'How to Listen to the Megillah:',
    listenStep1: 'Intend to fulfill the Mitzvah of hearing the Megillah.',
    listenStep2: 'Follow along quietly as it is being read.',
    listenStep3: 'Put your phone on Do Not Disturb to avoid interruptions.',
    chapter: 'Chapter',
    loudLabel: 'Everyone reads this together:',
    bneiHamanLabel: 'In some communities, everyone says this together.',
    headerTitle: 'The Megillah App',
    headerSub: <a href="https://www.chabad.org/purim" target="_blank" rel="noopener noreferrer" class="header-link">Learn more about Purim</a>,
    language: 'Language',
    editTitle: 'Edit title',
    titleText: 'Title',
    editSubtitle: 'Edit subtitle',
    subtitleText: 'Text',
    subtitleUrl: 'Link (optional)',
    displayIllustrations: 'Display illustrations',
    trackScrolling: 'Scrolling only, no highlighting',
    trackVerse: 'Verses you tap are highlighted for viewers (recommended)',
    trackWord: 'Words you tap are highlighted for viewers',
    editTapHint: 'Edit announcement',
    resetToDefault: 'Reset to default',
    sessionCode: 'Code',
    broadcasting: 'Broadcasting',
    following: 'Following',
    endSession: 'End',
    leaveSession: 'Leave',
    cancel: 'Cancel',
    joinLive: 'Join Live',
    syncOn: 'Following the live broadcast',
    syncOff: 'Unfollowed — read at your own pace',
    copyLink: 'Copy Link',
    copied: 'Copied!',
    viewAsFollower: 'View as Follower',
    onboardingFollowerAutoScroll: 'Auto-Scroll',
    onboardingFollowerAutoScrollText: 'The Megillah will start scrolling automatically once the reader begins. If it\'s too fast, tap this button to pause auto-scroll — tap again to resume.',
    onboardingFollowerOptions: 'More Options',
    onboardingFollowerOptionsText: 'Here you can enable illustrations, change the language, and more. Font size can be adjusted in the toolbar.',
    onboardingAdminInvite: 'Invite People',
    onboardingAdminInviteText: 'Tap the session code to see a QR code and invite link — share them so people can join your broadcast.',
    onboardingAdminHighlight: 'Highlight Verses',
    onboardingAdminHighlightText: 'Tap on verses to highlight them for everyone following along. Followers can tap the follow button {icon} to pause auto-scroll if the reading is too fast — and tap again to resume.',
    onboardingAdminTracking: 'Tracking Mode Options',
    onboardingAdminTrackingText: 'Here you can find the various tracking options. The default is tracking word by word. Tap on verses to highlight them for everyone following along. Followers can tap the follow button to pause auto-scroll if the reading is too fast — and tap again to resume.',
    onboardingAdminTime: 'Reading Time',
    onboardingAdminTimeText: 'Set the estimated reading time. This shows all followers how many minutes remain.',
    onboardingAdminSettings: 'Settings for Everyone',
    onboardingAdminSettingsText: 'The settings you choose (language, Haman highlighting, illustrations) apply to all followers.',
    onboardingAdminReadingMode: 'Reading Mode',
    onboardingAdminReadingModeText: 'The reading mode you choose becomes the default for everyone joining, but they can override it.',
    onboardingAdminSubtitle: 'Edit Subtitle',
    onboardingAdminSubtitleText: 'Tap here to customize the subtitle below the app name — for example, your synagogue name or a link.',
    onboardingAdminAnnouncements: 'Editable Messages',
    onboardingAdminAnnouncementsText: 'All messages are editable: Click the pencil icon to edit the text appearing above the Megillah. There is also another editable area on the very top of the page, and near the text below the Megillah.',
    onboardingSkip: 'Skip',
    onboardingNext: 'Next',
    onboardingGotIt: 'Got it!',
  },
  es: {
    showCantillation: 'Mostrar signos de cantilación',
    chabadCustom: 'Resaltar menos Hamanes',
    showTranslation: 'Traducción',
    hebrewOnly: 'Solo hebreo',
    langName: 'Español',
    hebrewName: 'Hebreo',
    only: 'Solo',
    both: 'Ambos',
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
    editTitle: 'Editar título',
    titleText: 'Título',
    editSubtitle: 'Editar subtítulo',
    subtitleText: 'Texto',
    subtitleUrl: 'Enlace (opcional)',
    displayIllustrations: 'Mostrar ilustraciones',
    trackScrolling: 'Solo desplazamiento, sin resaltado',
    trackVerse: 'Versículos que toques se resaltan para los espectadores (recomendado)',
    trackWord: 'Palabras que toques se resaltan para los espectadores',
    editTapHint: 'Editar anuncio',
    resetToDefault: 'Restablecer predeterminado',
    sessionCode: 'Código',
    broadcasting: 'Transmitiendo',
    following: 'Siguiendo',
    endSession: 'Finalizar',
    leaveSession: 'Salir',
    cancel: 'Cancelar',
    joinLive: 'En vivo',
    syncOn: 'Siguiendo la transmisión en vivo',
    syncOff: 'Dejaste de seguir — lee a tu ritmo',
    copyLink: 'Copiar enlace',
    copied: '¡Copiado!',
    viewAsFollower: 'Ver como seguidor',
    onboardingFollowerAutoScroll: 'Desplazamiento automático',
    onboardingFollowerAutoScrollText: 'La Meguilá comenzará a desplazarse automáticamente cuando el lector comience. Si es demasiado rápido, toque este botón para pausar — toque de nuevo para reanudar.',
    onboardingFollowerOptions: 'Más opciones',
    onboardingFollowerOptionsText: 'Aquí puede activar ilustraciones, cambiar el idioma y más. El tamaño de fuente se ajusta en la barra de herramientas.',
    onboardingAdminInvite: 'Invitar personas',
    onboardingAdminInviteText: 'Toque el código de sesión para ver un código QR y enlace de invitación — compártalos para que otros se unan a su transmisión.',
    onboardingAdminHighlight: 'Resaltar versículos',
    onboardingAdminHighlightText: 'Toque los versículos para resaltarlos para todos los seguidores. Los seguidores pueden tocar el botón de seguimiento {icon} para pausar el desplazamiento automático si la lectura es muy rápida — y tocar de nuevo para reanudar.',
    onboardingAdminTracking: 'Opciones de seguimiento',
    onboardingAdminTrackingText: 'Aquí encontrará las distintas opciones de seguimiento. El modo predeterminado es seguimiento palabra por palabra. Toque los versículos para resaltarlos para todos los seguidores. Los seguidores pueden tocar el botón de seguimiento para pausar el desplazamiento automático si la lectura es muy rápida — y tocar de nuevo para reanudar.',
    onboardingAdminTime: 'Tiempo de lectura',
    onboardingAdminTimeText: 'Establezca el tiempo estimado de lectura. Esto muestra a todos los seguidores cuántos minutos quedan.',
    onboardingAdminSettings: 'Configuración para todos',
    onboardingAdminSettingsText: 'La configuración que elija (idioma, resaltado de Hamán, ilustraciones) se aplica a todos los seguidores.',
    onboardingAdminReadingMode: 'Modo de lectura',
    onboardingAdminReadingModeText: 'El modo de lectura que elija será el predeterminado para todos los que se unan, pero pueden cambiarlo.',
    onboardingAdminSubtitle: 'Editar subtítulo',
    onboardingAdminSubtitleText: 'Toque aquí para personalizar el subtítulo debajo del nombre de la aplicación — por ejemplo, el nombre de su sinagoga o un enlace.',
    onboardingAdminAnnouncements: 'Mensajes editables',
    onboardingAdminAnnouncementsText: 'Todos los mensajes son editables: Toque el icono de lápiz para editar el texto que aparece sobre la Meguilá. También hay otra área editable en la parte superior de la página, y cerca del texto debajo de la Meguilá.',
    onboardingSkip: 'Omitir',
    onboardingNext: 'Siguiente',
    onboardingGotIt: '¡Entendido!',
  },
  ru: {
    showCantillation: 'Показать знаки кантилляции',
    chabadCustom: 'Выделять меньше Аманов',
    showTranslation: 'Перевод',
    hebrewOnly: 'Только иврит',
    langName: 'Русский',
    hebrewName: 'Иврит',
    only: 'Только',
    both: 'Оба',
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
    editTitle: 'Редактировать заголовок',
    titleText: 'Заголовок',
    editSubtitle: 'Редактировать подзаголовок',
    subtitleText: 'Текст',
    subtitleUrl: 'Ссылка (необязательно)',
    displayIllustrations: 'Показать иллюстрации',
    trackScrolling: 'Только прокрутка, без выделения',
    trackVerse: 'Нажатые стихи выделяются для зрителей (рекомендуется)',
    trackWord: 'Нажатые слова выделяются для зрителей',
    editTapHint: 'Редактировать объявление',
    resetToDefault: 'Сбросить по умолчанию',
    sessionCode: 'Код',
    broadcasting: 'Трансляция',
    following: 'Слежение',
    endSession: 'Завершить',
    leaveSession: 'Выйти',
    cancel: 'Отмена',
    joinLive: 'Эфир',
    syncOn: 'Следите за прямой трансляцией',
    syncOff: 'Отписались — читайте в своём темпе',
    copyLink: 'Копировать ссылку',
    copied: 'Скопировано!',
    viewAsFollower: 'Смотреть как зритель',
    onboardingFollowerAutoScroll: 'Автопрокрутка',
    onboardingFollowerAutoScrollText: 'Мегила начнёт прокручиваться автоматически, когда чтец начнёт. Если слишком быстро, нажмите эту кнопку, чтобы приостановить — нажмите снова, чтобы продолжить.',
    onboardingFollowerOptions: 'Дополнительные параметры',
    onboardingFollowerOptionsText: 'Здесь можно включить иллюстрации, сменить язык и другое. Размер шрифта регулируется на панели инструментов.',
    onboardingAdminInvite: 'Пригласить людей',
    onboardingAdminInviteText: 'Нажмите на код сессии, чтобы увидеть QR-код и ссылку-приглашение — поделитесь ими, чтобы люди присоединились к трансляции.',
    onboardingAdminHighlight: 'Выделение стихов',
    onboardingAdminHighlightText: 'Нажимайте на стихи, чтобы выделить их для всех зрителей. Зрители могут нажать кнопку следования {icon}, чтобы приостановить автопрокрутку, если чтение слишком быстрое — и нажать снова, чтобы продолжить.',
    onboardingAdminTracking: 'Параметры отслеживания',
    onboardingAdminTrackingText: 'Здесь вы найдёте различные режимы отслеживания. По умолчанию — пословное отслеживание. Нажимайте на стихи, чтобы выделить их для всех зрителей. Зрители могут нажать кнопку следования, чтобы приостановить автопрокрутку, если чтение слишком быстрое — и нажать снова, чтобы продолжить.',
    onboardingAdminTime: 'Время чтения',
    onboardingAdminTimeText: 'Установите примерное время чтения. Это покажет всем зрителям, сколько минут осталось.',
    onboardingAdminSettings: 'Настройки для всех',
    onboardingAdminSettingsText: 'Выбранные вами настройки (язык, выделение Амана, иллюстрации) применяются ко всем зрителям.',
    onboardingAdminReadingMode: 'Режим чтения',
    onboardingAdminReadingModeText: 'Выбранный вами режим чтения станет режимом по умолчанию для всех присоединяющихся, но они могут изменить его.',
    onboardingAdminSubtitle: 'Редактировать подзаголовок',
    onboardingAdminSubtitleText: 'Нажмите здесь, чтобы изменить подзаголовок под названием приложения — например, название синагоги или ссылку.',
    onboardingAdminAnnouncements: 'Редактируемые сообщения',
    onboardingAdminAnnouncementsText: 'Все сообщения можно редактировать: нажмите на значок карандаша, чтобы изменить текст над Мегилой. Также есть редактируемая область в самом верху страницы и рядом с текстом под Мегилой.',
    onboardingSkip: 'Пропустить',
    onboardingNext: 'Далее',
    onboardingGotIt: 'Понятно!',
  },
  fr: {
    showCantillation: 'Afficher les signes de cantillation',
    chabadCustom: 'Surligner moins de Hamans',
    showTranslation: 'Traduction',
    hebrewOnly: 'Hébreu seul',
    langName: 'Français',
    hebrewName: 'Hébreu',
    only: 'Seul',
    both: 'Les deux',
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
    editTitle: 'Modifier le titre',
    titleText: 'Titre',
    editSubtitle: 'Modifier le sous-titre',
    subtitleText: 'Texte',
    subtitleUrl: 'Lien (facultatif)',
    displayIllustrations: 'Afficher les illustrations',
    trackScrolling: 'Défilement seul, sans surlignage',
    trackVerse: 'Les versets touchés sont surlignés pour les spectateurs (recommandé)',
    trackWord: 'Les mots touchés sont surlignés pour les spectateurs',
    editTapHint: "Modifier l'annonce",
    resetToDefault: 'Réinitialiser par défaut',
    sessionCode: 'Code',
    broadcasting: 'Diffusion',
    following: 'Suivi',
    endSession: 'Terminer',
    leaveSession: 'Quitter',
    cancel: 'Annuler',
    joinLive: 'En direct',
    syncOn: 'Vous suivez la diffusion en direct',
    syncOff: 'Plus de suivi — lisez à votre rythme',
    copyLink: 'Copier le lien',
    copied: 'Copié !',
    viewAsFollower: 'Voir en tant que spectateur',
    onboardingFollowerAutoScroll: 'Défilement automatique',
    onboardingFollowerAutoScrollText: 'La Méguila commencera à défiler automatiquement dès que le lecteur commence. Si c\'est trop rapide, appuyez sur ce bouton pour mettre en pause — appuyez à nouveau pour reprendre.',
    onboardingFollowerOptions: 'Plus d\'options',
    onboardingFollowerOptionsText: 'Ici vous pouvez activer les illustrations, changer la langue, et plus encore. La taille de police se règle dans la barre d\'outils.',
    onboardingAdminInvite: 'Inviter des personnes',
    onboardingAdminInviteText: 'Appuyez sur le code de session pour voir un QR code et un lien d\'invitation — partagez-les pour que les gens rejoignent votre diffusion.',
    onboardingAdminHighlight: 'Surligner les versets',
    onboardingAdminHighlightText: 'Appuyez sur les versets pour les surligner pour tous les spectateurs. Les spectateurs peuvent appuyer sur le bouton de suivi {icon} pour mettre en pause le défilement automatique si la lecture est trop rapide — et appuyer à nouveau pour reprendre.',
    onboardingAdminTracking: 'Options de suivi',
    onboardingAdminTrackingText: 'Vous trouverez ici les différentes options de suivi. Le mode par défaut est le suivi mot par mot. Appuyez sur les versets pour les surligner pour tous les spectateurs. Les spectateurs peuvent appuyer sur le bouton de suivi pour mettre en pause le défilement automatique si la lecture est trop rapide — et appuyer à nouveau pour reprendre.',
    onboardingAdminTime: 'Temps de lecture',
    onboardingAdminTimeText: 'Définissez le temps de lecture estimé. Cela montre à tous les spectateurs combien de minutes il reste.',
    onboardingAdminSettings: 'Paramètres pour tous',
    onboardingAdminSettingsText: 'Les paramètres que vous choisissez (langue, surlignage d\'Haman, illustrations) s\'appliquent à tous les spectateurs.',
    onboardingAdminReadingMode: 'Mode de lecture',
    onboardingAdminReadingModeText: 'Le mode de lecture que vous choisissez devient le mode par défaut pour tous ceux qui rejoignent, mais ils peuvent le modifier.',
    onboardingAdminSubtitle: 'Modifier le sous-titre',
    onboardingAdminSubtitleText: 'Appuyez ici pour personnaliser le sous-titre sous le nom de l\'application — par exemple, le nom de votre synagogue ou un lien.',
    onboardingAdminAnnouncements: 'Messages modifiables',
    onboardingAdminAnnouncementsText: 'Tous les messages sont modifiables : appuyez sur l\'icône crayon pour modifier le texte au-dessus de la Méguila. Il y a aussi une zone modifiable tout en haut de la page, et près du texte sous la Méguila.',
    onboardingSkip: 'Passer',
    onboardingNext: 'Suivant',
    onboardingGotIt: 'Compris !',
  },
  pt: {
    showCantillation: 'Mostrar sinais de cantilação',
    chabadCustom: 'Destacar menos Hamãs',
    showTranslation: 'Tradução',
    hebrewOnly: 'Só hebraico',
    langName: 'Português',
    hebrewName: 'Hebraico',
    only: 'Só',
    both: 'Ambos',
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
    editTitle: 'Editar título',
    titleText: 'Título',
    editSubtitle: 'Editar subtítulo',
    subtitleText: 'Texto',
    subtitleUrl: 'Link (opcional)',
    displayIllustrations: 'Mostrar ilustrações',
    trackScrolling: 'Apenas rolagem, sem destaque',
    trackVerse: 'Versículos tocados são destacados para espectadores (recomendado)',
    trackWord: 'Palavras tocadas são destacadas para espectadores',
    editTapHint: 'Editar anúncio',
    resetToDefault: 'Redefinir padrão',
    sessionCode: 'Código',
    broadcasting: 'Transmitindo',
    following: 'Seguindo',
    endSession: 'Encerrar',
    leaveSession: 'Sair',
    cancel: 'Cancelar',
    joinLive: 'Ao vivo',
    syncOn: 'Seguindo a transmissão ao vivo',
    syncOff: 'Deixou de seguir — leia no seu ritmo',
    copyLink: 'Copiar link',
    copied: 'Copiado!',
    viewAsFollower: 'Ver como seguidor',
    onboardingFollowerAutoScroll: 'Rolagem automática',
    onboardingFollowerAutoScrollText: 'A Meguilá começará a rolar automaticamente quando o leitor iniciar. Se for rápido demais, toque neste botão para pausar — toque novamente para retomar.',
    onboardingFollowerOptions: 'Mais opções',
    onboardingFollowerOptionsText: 'Aqui você pode ativar ilustrações, mudar o idioma e mais. O tamanho da fonte pode ser ajustado na barra de ferramentas.',
    onboardingAdminInvite: 'Convidar pessoas',
    onboardingAdminInviteText: 'Toque no código da sessão para ver um código QR e link de convite — compartilhe-os para que as pessoas participem da sua transmissão.',
    onboardingAdminHighlight: 'Destacar versículos',
    onboardingAdminHighlightText: 'Toque nos versículos para destacá-los para todos os seguidores. Os seguidores podem tocar no botão de seguir {icon} para pausar a rolagem automática se a leitura estiver muito rápida — e tocar novamente para retomar.',
    onboardingAdminTracking: 'Opções de rastreamento',
    onboardingAdminTrackingText: 'Aqui você encontra as diversas opções de rastreamento. O padrão é rastreamento palavra por palavra. Toque nos versículos para destacá-los para todos os seguidores. Os seguidores podem tocar no botão de seguir para pausar a rolagem automática se a leitura estiver muito rápida — e tocar novamente para retomar.',
    onboardingAdminTime: 'Tempo de leitura',
    onboardingAdminTimeText: 'Defina o tempo estimado de leitura. Isso mostra a todos os seguidores quantos minutos restam.',
    onboardingAdminSettings: 'Configurações para todos',
    onboardingAdminSettingsText: 'As configurações que você escolher (idioma, destaque de Hamã, ilustrações) se aplicam a todos os seguidores.',
    onboardingAdminReadingMode: 'Modo de leitura',
    onboardingAdminReadingModeText: 'O modo de leitura que você escolher se torna o padrão para todos que entrarem, mas eles podem alterá-lo.',
    onboardingAdminSubtitle: 'Editar subtítulo',
    onboardingAdminSubtitleText: 'Toque aqui para personalizar o subtítulo abaixo do nome do aplicativo — por exemplo, o nome da sua sinagoga ou um link.',
    onboardingAdminAnnouncements: 'Mensagens editáveis',
    onboardingAdminAnnouncementsText: 'Todas as mensagens são editáveis: toque no ícone de lápis para editar o texto acima da Meguilá. Também há outra área editável no topo da página, e perto do texto abaixo da Meguilá.',
    onboardingSkip: 'Pular',
    onboardingNext: 'Próximo',
    onboardingGotIt: 'Entendi!',
  },
  it: {
    showCantillation: 'Mostra segni di cantillazione',
    chabadCustom: 'Evidenzia meno Haman',
    showTranslation: 'Traduzione',
    hebrewOnly: 'Solo ebraico',
    langName: 'Italiano',
    hebrewName: 'Ebraico',
    only: 'Solo',
    both: 'Entrambi',
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
    editTitle: 'Modifica titolo',
    titleText: 'Titolo',
    editSubtitle: 'Modifica sottotitolo',
    subtitleText: 'Testo',
    subtitleUrl: 'Link (facoltativo)',
    displayIllustrations: 'Mostra illustrazioni',
    trackScrolling: 'Solo scorrimento, senza evidenziazione',
    trackVerse: 'I versetti toccati vengono evidenziati per gli spettatori (consigliato)',
    trackWord: 'Le parole toccate vengono evidenziate per gli spettatori',
    editTapHint: 'Modifica annuncio',
    resetToDefault: 'Ripristina predefinito',
    sessionCode: 'Codice',
    broadcasting: 'Trasmissione',
    following: 'Seguendo',
    endSession: 'Termina',
    leaveSession: 'Esci',
    cancel: 'Annulla',
    joinLive: 'Dal vivo',
    syncOn: 'Stai seguendo la trasmissione in diretta',
    syncOff: 'Non segui più — leggi al tuo ritmo',
    copyLink: 'Copia link',
    copied: 'Copiato!',
    viewAsFollower: 'Visualizza come spettatore',
    onboardingFollowerAutoScroll: 'Scorrimento automatico',
    onboardingFollowerAutoScrollText: 'La Meghillà inizierà a scorrere automaticamente quando il lettore inizia. Se è troppo veloce, tocca questo pulsante per mettere in pausa — tocca di nuovo per riprendere.',
    onboardingFollowerOptions: 'Altre opzioni',
    onboardingFollowerOptionsText: 'Qui puoi attivare le illustrazioni, cambiare la lingua e altro. La dimensione del carattere si regola nella barra degli strumenti.',
    onboardingAdminInvite: 'Invita persone',
    onboardingAdminInviteText: 'Tocca il codice sessione per vedere un codice QR e un link di invito — condividili per far partecipare le persone alla tua trasmissione.',
    onboardingAdminHighlight: 'Evidenzia versetti',
    onboardingAdminHighlightText: 'Tocca i versetti per evidenziarli per tutti gli spettatori. Gli spettatori possono toccare il pulsante di seguimento {icon} per mettere in pausa lo scorrimento automatico se la lettura è troppo veloce — e toccare di nuovo per riprendere.',
    onboardingAdminTracking: 'Opzioni di tracciamento',
    onboardingAdminTrackingText: 'Qui trovi le varie opzioni di tracciamento. L\'impostazione predefinita è il tracciamento parola per parola. Tocca i versetti per evidenziarli per tutti gli spettatori. Gli spettatori possono toccare il pulsante di seguimento per mettere in pausa lo scorrimento automatico se la lettura è troppo veloce — e toccare di nuovo per riprendere.',
    onboardingAdminTime: 'Tempo di lettura',
    onboardingAdminTimeText: 'Imposta il tempo di lettura stimato. Questo mostra a tutti gli spettatori quanti minuti restano.',
    onboardingAdminSettings: 'Impostazioni per tutti',
    onboardingAdminSettingsText: 'Le impostazioni che scegli (lingua, evidenziazione di Haman, illustrazioni) si applicano a tutti gli spettatori.',
    onboardingAdminReadingMode: 'Modalità di lettura',
    onboardingAdminReadingModeText: 'La modalità di lettura che scegli diventa quella predefinita per tutti quelli che si uniscono, ma possono cambiarla.',
    onboardingAdminSubtitle: 'Modifica sottotitolo',
    onboardingAdminSubtitleText: 'Tocca qui per personalizzare il sottotitolo sotto il nome dell\'app — ad esempio, il nome della tua sinagoga o un link.',
    onboardingAdminAnnouncements: 'Messaggi modificabili',
    onboardingAdminAnnouncementsText: 'Tutti i messaggi sono modificabili: tocca l\'icona della matita per modificare il testo sopra la Meghillà. C\'è anche un\'altra area modificabile in cima alla pagina, e vicino al testo sotto la Meghillà.',
    onboardingSkip: 'Salta',
    onboardingNext: 'Avanti',
    onboardingGotIt: 'Capito!',
  },
  hu: {
    showCantillation: 'Kantilláció jelzések mutatása',
    chabadCustom: 'Kevesebb Hámán kiemelése',
    showTranslation: 'Fordítás',
    hebrewOnly: 'Csak héber',
    langName: 'Magyar',
    hebrewName: 'Héber',
    only: 'Csak',
    both: 'Mindkettő',
    fontSize: 'Betűméret',
    minLeft: 'perc van hátra',
    readingTime: 'Olvasási idő (perc):',
    save: 'Mentés',
    changeReadingTime: 'Olvasási idő módosítása',
    chabadHint: 'Chabad szokás — Hámán csak címmel kiemelve',
    tapHint: 'Nincs kereplőd? Kattints Hámán nevére!',
    chapter: 'Fejezet',
    loudLabel: 'Mindenki együtt olvassa:',
    bneiHamanLabel: 'Egyes közösségekben mindenki együtt mondja.',
    headerTitle: 'A Megilla',
    headerSub: 'Beépített kereplő és haladásjelző',
    language: 'Nyelv',
    editTitle: 'Cím szerkesztése',
    titleText: 'Cím',
    editSubtitle: 'Alcím szerkesztése',
    subtitleText: 'Szöveg',
    subtitleUrl: 'Link (opcionális)',
    displayIllustrations: 'Illusztrációk megjelenítése',
    trackScrolling: 'Csak görgetés, kiemelés nélkül',
    trackVerse: 'Az érintett versek kijelölődnek a nézők számára (ajánlott)',
    trackWord: 'Az érintett szavak kijelölődnek a nézők számára',
    editTapHint: 'Hirdetmény szerkesztése',
    resetToDefault: 'Visszaállítás alapértelmezettre',
    sessionCode: 'Kód',
    broadcasting: 'Közvetítés',
    following: 'Követés',
    endSession: 'Befejezés',
    leaveSession: 'Kilépés',
    cancel: 'Mégse',
    joinLive: 'Élő',
    syncOn: 'Követi az élő közvetítést',
    syncOff: 'Nem követ — olvasson a saját tempójában',
    copyLink: 'Link másolása',
    copied: 'Másolva!',
    viewAsFollower: 'Megtekintés követőként',
    onboardingFollowerAutoScroll: 'Automatikus görgetés',
    onboardingFollowerAutoScrollText: 'A Megilla automatikusan görgetni kezd, amint a felolvasó elkezdi. Ha túl gyors, érintse meg ezt a gombot a szüneteltetéshez — érintse meg újra a folytatáshoz.',
    onboardingFollowerOptions: 'További lehetőségek',
    onboardingFollowerOptionsText: 'Itt bekapcsolhatja az illusztrációkat, megváltoztathatja a nyelvet és egyebeket. A betűméret az eszköztárban állítható.',
    onboardingAdminInvite: 'Emberek meghívása',
    onboardingAdminInviteText: 'Érintse meg a munkamenet kódját a QR-kód és meghívó link megtekintéséhez — ossza meg őket, hogy mások csatlakozhassanak.',
    onboardingAdminHighlight: 'Versek kiemelése',
    onboardingAdminHighlightText: 'Érintse meg a verseket, hogy kiemelje őket minden követő számára. A követők megérinthetik a követés gombot {icon} az automatikus görgetés szüneteltetéséhez, ha a felolvasás túl gyors — és újra megérinthetik a folytatáshoz.',
    onboardingAdminTracking: 'Követési beállítások',
    onboardingAdminTrackingText: 'Itt találja a különböző követési beállításokat. Az alapértelmezett a szóról szóra követés. Érintse meg a verseket, hogy kiemelje őket minden követő számára. A követők megérinthetik a követés gombot az automatikus görgetés szüneteltetéséhez, ha a felolvasás túl gyors — és újra megérinthetik a folytatáshoz.',
    onboardingAdminTime: 'Olvasási idő',
    onboardingAdminTimeText: 'Állítsa be a becsült olvasási időt. Ez megmutatja minden követőnek, hány perc van hátra.',
    onboardingAdminSettings: 'Beállítások mindenkinek',
    onboardingAdminSettingsText: 'Az Ön által választott beállítások (nyelv, Hámán kiemelése, illusztrációk) minden követőre vonatkoznak.',
    onboardingAdminReadingMode: 'Olvasási mód',
    onboardingAdminReadingModeText: 'Az Ön által választott olvasási mód lesz az alapértelmezett minden csatlakozó számára, de megváltoztathatják.',
    onboardingAdminSubtitle: 'Alcím szerkesztése',
    onboardingAdminSubtitleText: 'Érintse meg itt az alcím testreszabásához az alkalmazás neve alatt — például a zsinagóga neve vagy egy link.',
    onboardingAdminAnnouncements: 'Szerkeszthető üzenetek',
    onboardingAdminAnnouncementsText: 'Minden üzenet szerkeszthető: érintse meg a ceruza ikont a Megilla feletti szöveg szerkesztéséhez. Van egy másik szerkeszthető terület is az oldal tetején, és a Megilla alatti szöveg közelében.',
    onboardingSkip: 'Kihagyás',
    onboardingNext: 'Következő',
    onboardingGotIt: 'Értem!',
  },
  de: {
    showCantillation: 'Kantillationszeichen anzeigen',
    chabadCustom: 'Weniger Haman hervorheben',
    showTranslation: 'Übersetzung',
    hebrewOnly: 'Nur Hebräisch',
    langName: 'Deutsch',
    hebrewName: 'Hebräisch',
    only: 'Nur',
    both: 'Beide',
    fontSize: 'Schriftgröße',
    minLeft: 'Min. übrig',
    readingTime: 'Lesezeit (Min.):',
    save: 'Speichern',
    changeReadingTime: 'Lesezeit ändern',
    chabadHint: 'Chabad-Brauch — Haman nur mit Titel hervorgehoben',
    tapHint: 'Keine Ratsche? Klicke einfach auf Hamans Namen!',
    chapter: 'Kapitel',
    loudLabel: 'Alle lesen dies gemeinsam:',
    bneiHamanLabel: 'In manchen Gemeinden sagen alle dies gemeinsam.',
    headerTitle: 'Die Megilla',
    headerSub: 'Eingebaute Ratsche und Fortschrittsanzeige',
    language: 'Sprache',
    editTitle: 'Titel bearbeiten',
    titleText: 'Titel',
    editSubtitle: 'Untertitel bearbeiten',
    subtitleText: 'Text',
    subtitleUrl: 'Link (optional)',
    displayIllustrations: 'Illustrationen anzeigen',
    trackScrolling: 'Nur Scrollen, keine Hervorhebung',
    trackVerse: 'Angetippte Verse werden für Zuschauer hervorgehoben (empfohlen)',
    trackWord: 'Angetippte Wörter werden für Zuschauer hervorgehoben',
    editTapHint: 'Ankündigung bearbeiten',
    resetToDefault: 'Auf Standard zurücksetzen',
    sessionCode: 'Code',
    broadcasting: 'Übertragung',
    following: 'Folgen',
    endSession: 'Beenden',
    leaveSession: 'Verlassen',
    cancel: 'Abbrechen',
    joinLive: 'Live',
    syncOn: 'Sie folgen der Live-Übertragung',
    syncOff: 'Nicht mehr folgen — lesen Sie in Ihrem Tempo',
    copyLink: 'Link kopieren',
    copied: 'Kopiert!',
    viewAsFollower: 'Als Zuschauer ansehen',
    onboardingFollowerAutoScroll: 'Automatisches Scrollen',
    onboardingFollowerAutoScrollText: 'Die Megilla beginnt automatisch zu scrollen, sobald der Vorleser anfängt. Wenn es zu schnell ist, tippen Sie auf diese Schaltfläche, um zu pausieren — tippen Sie erneut, um fortzufahren.',
    onboardingFollowerOptions: 'Weitere Optionen',
    onboardingFollowerOptionsText: 'Hier können Sie Illustrationen aktivieren, die Sprache ändern und mehr. Die Schriftgröße kann in der Symbolleiste angepasst werden.',
    onboardingAdminInvite: 'Personen einladen',
    onboardingAdminInviteText: 'Tippen Sie auf den Sitzungscode, um einen QR-Code und Einladungslink zu sehen — teilen Sie diese, damit andere Ihrer Übertragung beitreten können.',
    onboardingAdminHighlight: 'Verse hervorheben',
    onboardingAdminHighlightText: 'Tippen Sie auf Verse, um sie für alle Zuschauer hervorzuheben. Zuschauer können die Folgen-Taste {icon} antippen, um das automatische Scrollen zu pausieren, wenn die Lesung zu schnell ist — und erneut tippen, um fortzufahren.',
    onboardingAdminTracking: 'Verfolgungsoptionen',
    onboardingAdminTrackingText: 'Hier finden Sie die verschiedenen Verfolgungsoptionen. Standardmäßig wird Wort für Wort verfolgt. Tippen Sie auf Verse, um sie für alle Zuschauer hervorzuheben. Zuschauer können die Folgen-Taste antippen, um das automatische Scrollen zu pausieren, wenn die Lesung zu schnell ist — und erneut tippen, um fortzufahren.',
    onboardingAdminTime: 'Lesezeit',
    onboardingAdminTimeText: 'Legen Sie die geschätzte Lesezeit fest. Dies zeigt allen Zuschauern, wie viele Minuten verbleiben.',
    onboardingAdminSettings: 'Einstellungen für alle',
    onboardingAdminSettingsText: 'Die von Ihnen gewählten Einstellungen (Sprache, Haman-Hervorhebung, Illustrationen) gelten für alle Zuschauer.',
    onboardingAdminReadingMode: 'Lesemodus',
    onboardingAdminReadingModeText: 'Der von Ihnen gewählte Lesemodus wird zum Standard für alle Beitretenden, aber sie können ihn ändern.',
    onboardingAdminSubtitle: 'Untertitel bearbeiten',
    onboardingAdminSubtitleText: 'Tippen Sie hier, um den Untertitel unter dem App-Namen anzupassen — zum Beispiel den Namen Ihrer Synagoge oder einen Link.',
    onboardingAdminAnnouncements: 'Bearbeitbare Nachrichten',
    onboardingAdminAnnouncementsText: 'Alle Nachrichten sind bearbeitbar: Tippen Sie auf das Stiftsymbol, um den Text über der Megilla zu bearbeiten. Es gibt auch einen bearbeitbaren Bereich ganz oben auf der Seite und neben dem Text unter der Megilla.',
    onboardingSkip: 'Überspringen',
    onboardingNext: 'Weiter',
    onboardingGotIt: 'Verstanden!',
  },
  el: {
    showCantillation: 'Εμφάνιση σημείων καντιλασιόν',
    chabadCustom: 'Λιγότερη επισήμανση Αμάν',
    showTranslation: 'Μετάφραση',
    hebrewOnly: 'Μόνο Εβραϊκά',
    langName: 'Ελληνικά',
    hebrewName: 'Εβραϊκά',
    only: 'Μόνο',
    both: 'Και τα δύο',
    fontSize: 'Μέγεθος γραμματοσειράς',
    minLeft: 'λεπτά απομ.',
    readingTime: 'Χρόνος ανάγνωσης (λεπτά):',
    save: 'Αποθήκευση',
    changeReadingTime: 'Αλλαγή χρόνου ανάγνωσης',
    chabadHint: 'Έθιμο Χαμπάντ — ο Αμάν επισημαίνεται μόνο με τίτλο',
    tapHint: 'Δεν έχετε ρατσέτα; Πατήστε στο όνομα του Αμάν!',
    chapter: 'Κεφάλαιο',
    loudLabel: 'Όλοι διαβάζουν αυτό μαζί:',
    bneiHamanLabel: 'Σε ορισμένες κοινότητες, όλοι λένε αυτό μαζί.',
    headerTitle: 'Η Μεγιλά',
    headerSub: 'Ενσωματωμένη ρατσέτα και παρακολούθηση προόδου',
    language: 'Γλώσσα',
    editTitle: 'Επεξεργασία τίτλου',
    titleText: 'Τίτλος',
    editSubtitle: 'Επεξεργασία υπότιτλου',
    subtitleText: 'Κείμενο',
    subtitleUrl: 'Σύνδεσμος (προαιρετικά)',
    displayIllustrations: 'Εμφάνιση εικονογραφήσεων',
    trackScrolling: 'Μόνο κύλιση, χωρίς επισήμανση',
    trackVerse: 'Οι στίχοι που πατιούνται επισημαίνονται για τους θεατές (συνιστάται)',
    trackWord: 'Οι λέξεις που πατιούνται επισημαίνονται για τους θεατές',
    editTapHint: 'Επεξεργασία ανακοίνωσης',
    resetToDefault: 'Επαναφορά στις προεπιλογές',
    sessionCode: 'Κωδικός',
    broadcasting: 'Μετάδοση',
    following: 'Παρακολούθηση',
    endSession: 'Τέλος',
    leaveSession: 'Αποχώρηση',
    cancel: 'Ακύρωση',
    joinLive: 'Ζωντανά',
    syncOn: 'Ακολουθείτε τη ζωντανή μετάδοση',
    syncOff: 'Δεν ακολουθείτε πλέον — διαβάστε με το δικό σας ρυθμό',
    copyLink: 'Αντιγραφή συνδέσμου',
    copied: 'Αντιγράφηκε!',
    viewAsFollower: 'Προβολή ως θεατής',
    onboardingFollowerAutoScroll: 'Αυτόματη κύλιση',
    onboardingFollowerAutoScrollText: 'Η Μεγιλά θα αρχίσει να κυλάει αυτόματα μόλις ο αναγνώστης ξεκινήσει. Αν είναι πολύ γρήγορα, πατήστε αυτό το κουμπί για παύση — πατήστε ξανά για συνέχεια.',
    onboardingFollowerOptions: 'Περισσότερες επιλογές',
    onboardingFollowerOptionsText: 'Εδώ μπορείτε να ενεργοποιήσετε εικονογραφήσεις, να αλλάξετε γλώσσα και άλλα. Το μέγεθος γραμματοσειράς ρυθμίζεται στη γραμμή εργαλείων.',
    onboardingAdminInvite: 'Πρόσκληση ατόμων',
    onboardingAdminInviteText: 'Πατήστε τον κωδικό συνεδρίας για να δείτε έναν κωδικό QR και σύνδεσμο πρόσκλησης — μοιραστείτε τους για να συμμετάσχουν άλλοι στη μετάδοσή σας.',
    onboardingAdminHighlight: 'Επισήμανση στίχων',
    onboardingAdminHighlightText: 'Πατήστε στους στίχους για να τους επισημάνετε για όλους τους θεατές. Οι θεατές μπορούν να πατήσουν το κουμπί ακολούθησης {icon} για να σταματήσουν την αυτόματη κύλιση αν η ανάγνωση είναι πολύ γρήγορη — και να πατήσουν ξανά για συνέχεια.',
    onboardingAdminTracking: 'Επιλογές παρακολούθησης',
    onboardingAdminTrackingText: 'Εδώ θα βρείτε τις διάφορες επιλογές παρακολούθησης. Η προεπιλογή είναι παρακολούθηση λέξη προς λέξη. Πατήστε στους στίχους για να τους επισημάνετε για όλους τους θεατές. Οι θεατές μπορούν να πατήσουν το κουμπί ακολούθησης για να σταματήσουν την αυτόματη κύλιση αν η ανάγνωση είναι πολύ γρήγορη — και να πατήσουν ξανά για συνέχεια.',
    onboardingAdminTime: 'Χρόνος ανάγνωσης',
    onboardingAdminTimeText: 'Ορίστε τον εκτιμώμενο χρόνο ανάγνωσης. Αυτό δείχνει σε όλους τους θεατές πόσα λεπτά απομένουν.',
    onboardingAdminSettings: 'Ρυθμίσεις για όλους',
    onboardingAdminSettingsText: 'Οι ρυθμίσεις που επιλέγετε (γλώσσα, επισήμανση Αμάν, εικονογραφήσεις) ισχύουν για όλους τους θεατές.',
    onboardingAdminReadingMode: 'Λειτουργία ανάγνωσης',
    onboardingAdminReadingModeText: 'Η λειτουργία ανάγνωσης που επιλέγετε γίνεται η προεπιλογή για όλους όσοι συμμετέχουν, αλλά μπορούν να την αλλάξουν.',
    onboardingAdminSubtitle: 'Επεξεργασία υπότιτλου',
    onboardingAdminSubtitleText: 'Πατήστε εδώ για να προσαρμόσετε τον υπότιτλο κάτω από το όνομα της εφαρμογής — για παράδειγμα, το όνομα της συναγωγής σας ή έναν σύνδεσμο.',
    onboardingAdminAnnouncements: 'Επεξεργάσιμα μηνύματα',
    onboardingAdminAnnouncementsText: 'Όλα τα μηνύματα είναι επεξεργάσιμα: πατήστε το εικονίδιο μολυβιού για να επεξεργαστείτε το κείμενο πάνω από τη Μεγιλά. Υπάρχει επίσης μια επεξεργάσιμη περιοχή στην κορυφή της σελίδας και κοντά στο κείμενο κάτω από τη Μεγιλά.',
    onboardingSkip: 'Παράλειψη',
    onboardingNext: 'Επόμενο',
    onboardingGotIt: 'Κατάλαβα!',
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

function hasEnglishTitle(before: string, after: string): boolean {
  return /\b(evil|wicked)\s*$/i.test(before) || /^\s*[,]?\s*(the Agagite|son of Hamdata|persecutor)/i.test(after);
}

// Strip cantillation marks (U+0591–U+05AF) and paseq (U+05C0) but keep nikkud vowels
function stripCantillation(s: string): string {
  return s.replace(/[\u0591-\u05AF\u05C0]/g, '');
}

// Split Steinsaltz commentary into vowelized (biblical) and plain (commentary) runs
// Words containing nikud vowels (U+05B0–U+05BD, U+05BF, U+05C1–U+05C2, U+05C4–U+05C7) are biblical text
const NIKUD_RE = /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4-\u05C7]/;
function boldVowelized(text: string) {
  // Split into words keeping whitespace/punctuation attached
  const tokens = text.split(/(\s+)/);
  const result: (string | ComponentChildren)[] = [];
  let boldRun: string[] = [];
  let plainRun: string[] = [];

  const flushBold = () => {
    if (boldRun.length) {
      result.push(<b>{boldRun.join('')}</b>);
      boldRun = [];
    }
  };
  const flushPlain = () => {
    if (plainRun.length) {
      result.push(plainRun.join(''));
      plainRun = [];
    }
  };

  for (const token of tokens) {
    if (NIKUD_RE.test(token)) {
      flushPlain();
      boldRun.push(token);
    } else {
      flushBold();
      plainRun.push(token);
    }
  }
  flushBold();
  flushPlain();
  return result;
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

function HamanWord({ text, onTap, wordId, isActive }: { text: string; onTap: () => void; wordId?: string; isActive?: boolean }) {
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
      class={`haman-name${shaking ? ' shake' : ''}${isActive ? ' word-active' : ''}`}
      data-word={wordId}
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

/** Wrap a text segment into individual word spans with data-word attributes */
function wrapWords(
  text: string,
  verseKey: string,
  startIdx: number,
  activeWord: string | null,
  needsWordSpans: boolean,
): { nodes: ComponentChildren[]; nextIdx: number } {
  if (!needsWordSpans) {
    // Count words for index tracking but skip creating individual spans
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return { nodes: [text], nextIdx: startIdx + wordCount };
  }
  const words = text.split(/(\s+)/);
  const nodes: ComponentChildren[] = [];
  let idx = startIdx;
  for (const w of words) {
    if (/^\s+$/.test(w)) {
      nodes.push(w);
      continue;
    }
    if (!w) continue;
    const wordId = `${verseKey}-${idx}`;
    const isActive = activeWord === wordId;
    nodes.push(
      <span
        key={wordId}
        class={`word${isActive ? ' word-active' : ''}`}
        data-word={wordId}
      >
        {w}
      </span>
    );
    idx++;
  }
  return { nodes, nextIdx: idx };
}

// Person names in English translations for emphasis
const NAMES_RE = /\b(Achashverosh|Achashveirosh|Vashti|Mordechai|Esther|Hadassah|Haman|Mehuman|Bizzeta|Charvona|Charvonah|Bigta|Avagta|Zeitar|Charkas|Carshina|Sheitar|Admata|Tarshish|Meress|Marsina|Memuchan|Heigai|Shaashgaz|Bigtan|Teresh|Hatach|Yair|Shim'iy|Kish|Jechoniah|Nebuchadnezzar|Avichayil|Zeresh|Parshandata|Dalfon|Aspata|Porata|Adalya|Aridata|Parmashta|Arisai|Aridai|Vaizata|Hamdata)\b/;

function highlightNames(text: string): (string | preact.JSX.Element)[] {
  const parts = text.split(new RegExp(NAMES_RE.source, 'g'));
  if (parts.length === 1) return [text];
  return parts.map((part, i) =>
    NAMES_RE.test(part) ? <span key={i} class="person-name">{part}</span> : part
  );
}

function renderVerse(
  text: string,
  chapterNum: number,
  verseNum: number,
  onHamanTap: () => void,
  chabadMode: boolean,
  hideCantillation: boolean,
  translationMode: 'hebrew' | 'both' | 'translation',
  t: Translations,
  lang: Lang,
  translationMap: TranslationMap | null,
  activeWord: string | null,
  activeVerse: string | null,
  needsWordSpans: boolean = true,
) {
  const displayText = hideCantillation ? stripCantillation(text) : text;
  const parts = displayText.split(HAMAN_REGEX);
  const verseKey = `${chapterNum}:${verseNum}`;
  const isLoud = LOUD_VERSES.has(verseKey);
  const isVerseActive = activeVerse === verseKey;
  const translation = translationMap?.[verseKey];

  let wordIdx = 0;

  const showHebrew = translationMode !== 'translation';
  const showTrans = translationMode !== 'hebrew' && !!translation;
  const sideBySide = translationMode === 'both' && lang !== 'he';

  const hebrewContent = showHebrew && parts.map((part, i) => {
    if (!HAMAN_REGEX.test(part)) {
      const { nodes, nextIdx } = wrapWords(part, verseKey, wordIdx, activeWord, needsWordSpans);
      wordIdx = nextIdx;
      return <span key={`${chapterNum}-${verseNum}-${i}`}>{nodes}</span>;
    }
    if (chabadMode) {
      const nextPart = parts[i + 1] || '';
      if (!hasTitleAfter(nextPart)) {
        const wId = `${verseKey}-${wordIdx}`;
        const isActive = needsWordSpans && activeWord === wId;
        wordIdx++;
        return needsWordSpans
          ? <span key={`${chapterNum}-${verseNum}-${i}`} class={`word${isActive ? ' word-active' : ''}`} data-word={wId}>{part}</span>
          : <span key={`${chapterNum}-${verseNum}-${i}`}>{part}</span>;
      }
    }
    const wId = `${verseKey}-${wordIdx}`;
    const isActive = needsWordSpans && activeWord === wId;
    wordIdx++;
    return (
      <HamanWord key={`${chapterNum}-${verseNum}-${i}`} text={part} onTap={onHamanTap} wordId={wId} isActive={isActive} />
    );
  });

  const translationContent = showTrans && (
    <span class="verse-translation" dir={lang === 'he' ? 'rtl' : 'ltr'}>{
      lang === 'he'
        ? boldVowelized(translation)
        : (chabadMode ? HAMAN_TITLED_VERSES : HAMAN_VERSES).has(verseKey)
          ? translation.split(/(Haman)/gi).map((seg, j, arr) =>
              /^haman$/i.test(seg)
                ? (chabadMode && !hasEnglishTitle(arr.slice(0, j).join(''), arr.slice(j + 1).join('')))
                  ? seg
                  : <HamanWord key={`tr-${chapterNum}-${verseNum}-${j}`} text={seg} onTap={onHamanTap} />
                : seg
            )
          : highlightNames(translation)
    }</span>
  );

  const transliteration = isLoud && lang !== 'he' ? LOUD_TRANSLITERATIONS[lang]?.[verseKey] ?? LOUD_TRANSLITERATIONS['en']?.[verseKey] : null;

  const verseContent = sideBySide ? (
    <div class={`verse verse-row${isLoud ? ' loud-verse' : ''}${isVerseActive ? ' verse-active' : ''}`} data-verse={verseKey}>
      {isLoud && <span class="loud-label">{t.loudLabel}</span>}
      {transliteration && <div class="transliteration-box" dir="ltr">{transliteration}</div>}
      <div class="verse-col verse-col-translation" dir="ltr">
        <sup class="verse-num">{verseNum}</sup>
        {translationContent}
      </div>
      <div class="verse-col verse-col-hebrew" dir="rtl">
        <sup class="verse-num">{toHebrew(verseNum)}</sup>
        {hebrewContent}
      </div>
    </div>
  ) : (
    <span class={`verse${isLoud ? ' loud-verse' : ''}${isVerseActive ? ' verse-active' : ''}`} data-verse={verseKey}>
      {isLoud && <span class="loud-label" dir={lang === 'he' ? 'rtl' : 'ltr'}>{t.loudLabel}</span>}
      {transliteration && <span class="transliteration-box" dir="ltr">{transliteration}</span>}
      <sup class="verse-num">{lang === 'he' ? toHebrew(verseNum) : verseNum}</sup>
      {hebrewContent}
      {translationContent}
      {' '}
    </span>
  );

  return verseContent;
}

const LANG_STORAGE_KEY = 'megillah-lang';
const SUPPORTED_LANGS: Lang[] = ['he', 'en', 'es', 'ru', 'fr', 'pt', 'it', 'hu', 'de', 'el'];

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && SUPPORTED_LANGS.includes(stored as Lang)) return stored as Lang;
  } catch {}
  const dataLang = document.documentElement.dataset.lang;
  if (dataLang && SUPPORTED_LANGS.includes(dataLang as Lang)) return dataLang as Lang;
  const navLang = navigator.language.split('-')[0].toLowerCase();
  if (SUPPORTED_LANGS.includes(navLang as Lang)) return navLang as Lang;
  return 'en';
}

export default function MegillahReader({ standalone = false, showTitle = false, session, remoteMinutes, activeWord: remoteActiveWord, activeVerse: remoteActiveVerse, onWordTap, remoteChabadMode, syncEnabled = true, onToggleSync }: { standalone?: boolean; showTitle?: boolean; session?: Session; remoteMinutes?: number | null; activeWord?: string | null; activeVerse?: string | null; onWordTap?: (wordId: string) => void; remoteChabadMode?: boolean | null; syncEnabled?: boolean; onToggleSync?: () => void }) {
  const dragging = useRef(false);
  const lastBroadcastTime = useRef(0);
  const lastDragWord = useRef<string | null>(null);
  const gapAnimating = useRef(false);
  const [showCantillation, setShowCantillation] = useState(false);
  const [chabadMode, setChabadMode] = useState(true);
  const [fontSize, setFontSize] = useState(1.15);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(DEFAULT_READING_MINUTES);
  const [draftMinutes, setDraftMinutes] = useState(DEFAULT_READING_MINUTES);
  const [showTimeEdit, setShowTimeEdit] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuDismissedByScroll = useRef(false);
  const [showTrackingMenu, setShowTrackingMenu] = useState(false);
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const [translationMode, setTranslationMode] = useState<'hebrew' | 'both' | 'translation'>('hebrew');
  const [loadedTranslations, setLoadedTranslations] = useState<TranslationMap | null>(null);
  const translationCache = useRef<Record<string, TranslationMap>>({});
  const deviceLang = useRef<Lang>(getInitialLang);
  const [showIllustrations, setShowIllustrations] = useState(true);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [activeVerse, setActiveVerse] = useState<string | null>(null);
  const [trackingMode, setTrackingMode] = useState<'off' | 'verse' | 'word'>('off');
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [showTitleEdit, setShowTitleEdit] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [customSubtitle, setCustomSubtitle] = useState<{ text: string; url: string } | null>(null);
  const [showSubtitleEdit, setShowSubtitleEdit] = useState(false);
  const [draftSubText, setDraftSubText] = useState('');
  const [draftSubUrl, setDraftSubUrl] = useState('');
  const [customTapHint, setCustomTapHint] = useState<string | null>(null);
  const [showTapHintEdit, setShowTapHintEdit] = useState(false);
  const tinymceRef = useRef<HTMLDivElement | null>(null);
  const [customBottomHint, setCustomBottomHint] = useState<string | null>(null);
  const [showBottomHintEdit, setShowBottomHintEdit] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncPulse, setSyncPulse] = useState(false);
  const syncPulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [muted, setMuted] = useState(false);
  const [soundActive, setSoundActive] = useState(false);
  const audioPool = useRef<HTMLAudioElement[]>([]);
  const soundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTextRef = useRef<HTMLDivElement>(null);
  const confettiFired = useRef(false);

  const [onboardingStep, setOnboardingStep] = useState(-1); // -1 = not showing

  // Show onboarding once per role
  useEffect(() => {
    if (!session?.role) return;
    const key = `megillah-onboarding-${session.role}`;
    try {
      if (!localStorage.getItem(key)) {
        // Small delay so toolbar is rendered
        setTimeout(() => setOnboardingStep(0), 800);
      }
    } catch {}
  }, [session?.role]);

  const dismissOnboarding = () => {
    setOnboardingStep(-1);
    if (session?.role) {
      try { localStorage.setItem(`megillah-onboarding-${session.role}`, '1'); } catch {}
    }
  };

  const nextOnboardingStep = (totalSteps: number) => {
    if (onboardingStep >= totalSteps - 1) {
      dismissOnboarding();
    } else {
      setOnboardingStep(onboardingStep + 1);
    }
  };

  // Default to verse tracking when starting a broadcast
  useEffect(() => {
    if (session?.role === 'admin') setTrackingMode('verse');
  }, [session?.role]);

  // Detect real language and restore settings after hydration
  useEffect(() => {
    const detected = getInitialLang();
    if (detected !== lang) {
      setLang(detected);
      deviceLang.current = detected;
    }
    try {
      if (detected === 'he') {
        setTranslationMode('hebrew');
      } else {
        const stored = localStorage.getItem('megillah-translation-mode');
        if (stored === 'both' || stored === 'translation') {
          setTranslationMode(stored);
        } else {
          setTranslationMode('both');
        }
      }
    } catch {}
  }, []);

  const t = translations[lang];
  // Only create per-word spans when word tracking is active or a remote word is highlighted
  const needsWordSpans = trackingMode === 'word' || !!activeWord || !!remoteActiveWord;

  // The translation language to use when translation is shown
  // Hebrew users get Steinsaltz commentary; others get their language's translation
  const translationKey: Lang = lang;
  const showTranslation = translationMode !== 'hebrew';

  // Resolve the active translation map
  const activeTranslations: TranslationMap | null =
    !showTranslation ? null :
    translationKey === 'en' ? translationsEn :
    loadedTranslations;


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

  // Apply initial settings from DB when session connects
  useEffect(() => {
    if (!session?.initialSettings) return;
    const s = session.initialSettings;
    if (s.readingMinutes != null) {
      setTotalMinutes(s.readingMinutes);
      setDraftMinutes(s.readingMinutes);
    }
    if (s.chabadMode !== undefined) {
      setChabadMode(s.chabadMode);
    }
    if (s.lang) {
      setLang(s.lang as Lang);
    }
    const effectiveLang = (s.lang as Lang) || lang;
    if (effectiveLang === 'he') {
      setTranslationMode('hebrew');
    } else if (s.translationMode) {
      setTranslationMode(s.translationMode);
    } else if (s.showTranslation || effectiveLang !== 'he') {
      setTranslationMode('both');
    }
    if (s.customTitle) {
      setCustomTitle(s.customTitle);
    }
    if (s.customSubtitle) {
      setCustomSubtitle(s.customSubtitle);
    }
    if (s.customTapHint) {
      setCustomTapHint(s.customTapHint);
    }
    if (s.customBottomHint) {
      setCustomBottomHint(s.customBottomHint);
    }
    if (s.showIllustrations) {
      setShowIllustrations(true);
    }
    if (s.fontSize != null) {
      setFontSize(s.fontSize);
    }
  }, [session]);

  // Follower: apply real-time reading time from admin
  useEffect(() => {
    if (remoteMinutes != null) {
      setTotalMinutes(remoteMinutes);
      setDraftMinutes(remoteMinutes);
    }
  }, [remoteMinutes]);

  // Follower: apply Chabad mode from broadcaster
  useEffect(() => {
    if (remoteChabadMode != null) {
      setChabadMode(remoteChabadMode);
    }
  }, [remoteChabadMode]);

  // Pulse sync button when receiving remote updates
  useEffect(() => {
    if (!syncEnabled || session?.role !== 'follower') return;
    if (!remoteActiveWord && !remoteActiveVerse) return;
    setSyncPulse(true);
    if (syncPulseTimer.current) clearTimeout(syncPulseTimer.current);
    syncPulseTimer.current = setTimeout(() => setSyncPulse(false), 1200);
  }, [remoteActiveWord, remoteActiveVerse]);

  // Load TinyMCE when editor opens
  const initHintEditor = (selector: string, content: string, contentStyle?: string) => {
    const tinymce = (window as any).tinymce;
    if (!tinymce) return;
    tinymce.init({
      selector,
      height: 200,
      menubar: false,
      branding: false,
      promotion: false,
      directionality: lang === 'he' ? 'rtl' as const : 'ltr' as const,
      plugins: 'link lists directionality',
      toolbar: 'bold italic underline forecolor | link insertbutton | bullist numlist | alignleft aligncenter alignright | fontsize | ltr rtl | removeformat | blocks',
      content_style: contentStyle || `body { font-family: Heebo, sans-serif; font-size: 14px; direction: ${lang === 'he' ? 'rtl' : 'ltr'}; background: #fdf6f0; text-align: center; } p { margin: 4px 0; }`,
      setup: (editor: any) => {
        editor.ui.registry.addButton('insertbutton', {
          text: 'Button',
          icon: 'new-tab',
          onAction: () => {
            editor.windowManager.open({
              title: 'Insert Button',
              body: {
                type: 'panel',
                items: [
                  { type: 'input', name: 'text', label: 'Button text' },
                  { type: 'input', name: 'url', label: 'Button URL' },
                ]
              },
              buttons: [
                { type: 'cancel', text: 'Cancel' },
                { type: 'submit', text: 'Insert', primary: true },
              ],
              onSubmit: (api: any) => {
                const data = api.getData();
                if (data.text && data.url) {
                  editor.insertContent(
                    `<a href="${data.url}" target="_blank" rel="noopener" style="display:inline-block;background:#660a23;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin:4px 2px;">${data.text}</a>`
                  );
                }
                api.close();
              }
            });
          }
        });
        editor.on('init', () => {
          editor.setContent(content);
        });
      },
    });
  };

  const ensureTinyMCELoaded = (callback: () => void) => {
    if ((window as any).tinymce) {
      callback();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.tiny.cloud/1/utcucfgqm71xjbhcb3dgsm1sdjund27o1tylz7nl7llyrfc9/tinymce/7/tinymce.min.js';
      script.referrerPolicy = 'origin';
      script.onload = callback;
      document.head.appendChild(script);
    }
  };

  useEffect(() => {
    if (!showTapHintEdit) return;
    ensureTinyMCELoaded(() => initHintEditor('#tap-hint-tinymce', customTapHint || ''));
    return () => {
      (window as any).tinymce?.get('tap-hint-tinymce')?.destroy();
    };
  }, [showTapHintEdit]);

  const defaultBottomHintHe = `<h2>מה הלאה?</h2>
<p>חוץ מקריאת המגילה, ישנן עוד שלוש מצוות שיש לקיים אותן ביום פורים:</p>
<h3>🎁 מתנות לאביונים – איך עושים?</h3>
<p>במהלך יום הפורים כל איש ואישה – ורצוי שגם הילדים ישתתפו – נותנים סכום כסף או מתנה לשני אנשים נזקקים (איש או אישה). המינימום הוא לתת לשני עניים, ולפחות שווי של פרוטה לכל אחד. כל המרבה – הרי זה משובח.</p>
<p>יש להרבות במתנות לאביונים יותר מיתר מצוות הפורים, כי השמחה המפוארת והגדולה ביותר היא לשמח את לב העניים, היתומים, האלמנות והגרים.</p>
<h3>🍱 משלוח מנות – איך עושים?</h3>
<p>ביום הפורים שולחים לחברים ולידידים – ואפשר גם לכאלה שיהיו ידידים בעתיד 😉 – שני מוצרי מזון לאדם אחד לפחות.</p>
<p>ניתן לשלוח כל סוג של מזון, ובלבד שיהיה דבר אכיל: פירות או ירקות, משקאות או מאפים, תבשילים או מוצרים קנויים.</p>
<p>כל גבר צריך לשלוח לגבר אחד לפחות, וכל אישה לאישה אחת לפחות. אפשר, ואף מומלץ, לשלוח ליותר אנשים. כל המרבה – הרי זה משובח.</p>
<h3>🎉 משתה ושמחה – סעודת פורים</h3>
<p>ביום הפורים מצווה לקיים סעודה ומשתה מתוך שמחה מיוחדת וגדולה. פורים הוא מהימים השמחים ביותר בלוח השנה היהודי, ואם שמחים בו כראוי – זוכים להמשיך את השמחה גם לימים הבאים.</p>
<p>חז"ל קבעו: "חייב אדם לבסומי בפוריא עד דלא ידע בין ארור המן לברוך מרדכי".</p>
<p>סעודת הפורים מתקיימת ביום, ללא עריכת קידוש. מכבדים את היום בפריסת מפה נאה על השולחן, במאכלים משובחים, ויש הנוהגים לבצוע חלות יפות ולהדליק תאורה או נרות חגיגיים (ללא ברכה).</p>
<p style="text-align:left;font-size:0.75rem;opacity:0.5;">(באדיבות אתר חב"ד.אורג)</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">פורים שמח!</p>`;

  const defaultBottomHints: Record<string, string> = {
    en: `<h2>What's Next?</h2>
<p>Now that you finished hearing the Megillah, here are the other 3 Purim Mitzvot to remember:</p>
<h3>1. Give to the Needy (Matanot LaEvyonim)</h3>
<p>On Purim day, give money or food to at least two needy people. This mitzvah highlights Jewish unity and caring for others. If you don't know anyone personally, you can give through your synagogue or place money in a charity box. Even children should participate.</p>
<h3>2. Send Food Gifts (Mishloach Manot)</h3>
<p>On Purim day, send at least two ready-to-eat food or drink items to at least one friend. This strengthens friendship and community bonds. It's ideal to send the package through a messenger, and children are encouraged to take part.</p>
<h3>3. Celebrate with a Festive Meal</h3>
<p>During Purim day, have a joyful meal with family and possibly guests. Traditionally, it includes bread, meat, wine, songs, Torah thoughts, and a spirit of celebration, continuing into the evening.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">Happy Purim!</p>`,
    es: `<h2>¿Qué sigue?</h2>
<p>Ahora que terminaste de escuchar la Meguilá, aquí están las otras 3 mitzvot de Purim para recordar:</p>
<h3>1. Dar a los necesitados (Matanot LaEvyonim)</h3>
<p>En el día de Purim, da dinero o comida a al menos dos personas necesitadas. Esta mitzvá destaca la unidad judía y el cuidado de los demás. Si no conoces a nadie personalmente, puedes dar a través de tu sinagoga o poner dinero en una caja de caridad. Los niños también deben participar.</p>
<h3>2. Enviar regalos de comida (Mishloaj Manot)</h3>
<p>En el día de Purim, envía al menos dos alimentos o bebidas listos para consumir a al menos un amigo. Esto fortalece la amistad y los lazos comunitarios. Es ideal enviar el paquete a través de un mensajero, y se anima a los niños a participar.</p>
<h3>3. Celebrar con una comida festiva</h3>
<p>Durante el día de Purim, disfruta de una comida alegre con la familia y posiblemente invitados. Tradicionalmente incluye pan, carne, vino, canciones, pensamientos de Torá y un espíritu de celebración.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">¡Feliz Purim!</p>`,
    ru: `<h2>Что дальше?</h2>
<p>Теперь, когда вы закончили слушать Мегилу, вот ещё 3 заповеди Пурима, которые нужно помнить:</p>
<h3>1. Подарки бедным (Матанот ЛаЭвьоним)</h3>
<p>В день Пурима дайте деньги или еду как минимум двум нуждающимся людям. Эта заповедь подчёркивает еврейское единство и заботу о других. Если вы не знаете никого лично, можете передать через синагогу или положить деньги в благотворительную коробку. Дети тоже должны участвовать.</p>
<h3>2. Отправить подарки с едой (Мишлоах Манот)</h3>
<p>В день Пурима отправьте хотя бы два готовых к употреблению продукта или напитка как минимум одному другу. Это укрепляет дружбу и общинные связи. Желательно отправить через посланника, и детей поощряют участвовать.</p>
<h3>3. Праздничная трапеза</h3>
<p>В день Пурима устройте радостную трапезу с семьёй и, возможно, гостями. Традиционно она включает хлеб, мясо, вино, песни, мысли из Торы и дух празднования.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">Счастливого Пурима!</p>`,
    fr: `<h2>Et maintenant ?</h2>
<p>Maintenant que vous avez fini d'écouter la Méguila, voici les 3 autres mitsvot de Pourim à retenir :</p>
<h3>1. Donner aux nécessiteux (Matanot LaEvyonim)</h3>
<p>Le jour de Pourim, donnez de l'argent ou de la nourriture à au moins deux personnes dans le besoin. Cette mitsva souligne l'unité juive et le souci des autres. Si vous ne connaissez personne personnellement, vous pouvez donner par l'intermédiaire de votre synagogue ou mettre de l'argent dans une boîte de charité. Les enfants doivent aussi participer.</p>
<h3>2. Envoyer des cadeaux de nourriture (Michloah Manot)</h3>
<p>Le jour de Pourim, envoyez au moins deux aliments ou boissons prêts à consommer à au moins un ami. Cela renforce l'amitié et les liens communautaires. Il est idéal d'envoyer le paquet par un messager, et les enfants sont encouragés à participer.</p>
<h3>3. Célébrer avec un repas festif</h3>
<p>Le jour de Pourim, faites un repas joyeux avec la famille et éventuellement des invités. Traditionnellement, il comprend du pain, de la viande, du vin, des chants, des pensées de Torah et un esprit de célébration.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">Joyeux Pourim !</p>`,
    pt: `<h2>O que vem a seguir?</h2>
<p>Agora que você terminou de ouvir a Meguilá, aqui estão as outras 3 mitzvot de Purim para lembrar:</p>
<h3>1. Dar aos necessitados (Matanot LaEvyonim)</h3>
<p>No dia de Purim, dê dinheiro ou comida a pelo menos duas pessoas necessitadas. Esta mitzvá destaca a unidade judaica e o cuidado com os outros. Se você não conhece ninguém pessoalmente, pode dar através da sua sinagoga ou colocar dinheiro numa caixa de caridade. As crianças também devem participar.</p>
<h3>2. Enviar presentes de comida (Mishloach Manot)</h3>
<p>No dia de Purim, envie pelo menos dois alimentos ou bebidas prontos para consumo a pelo menos um amigo. Isso fortalece a amizade e os laços comunitários. O ideal é enviar o pacote através de um mensageiro, e as crianças são encorajadas a participar.</p>
<h3>3. Celebrar com uma refeição festiva</h3>
<p>Durante o dia de Purim, faça uma refeição alegre com a família e possivelmente convidados. Tradicionalmente inclui pão, carne, vinho, canções, pensamentos da Torá e um espírito de celebração.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">Feliz Purim!</p>`,
    it: `<h2>E adesso?</h2>
<p>Ora che hai finito di ascoltare la Meghillà, ecco le altre 3 mitzvot di Purim da ricordare:</p>
<h3>1. Donare ai bisognosi (Matanot LaEvyonim)</h3>
<p>Nel giorno di Purim, dai denaro o cibo ad almeno due persone bisognose. Questa mitzvà sottolinea l'unità ebraica e la cura degli altri. Se non conosci nessuno personalmente, puoi dare attraverso la tua sinagoga o mettere denaro in una scatola di beneficenza. Anche i bambini dovrebbero partecipare.</p>
<h3>2. Inviare regali di cibo (Mishloach Manot)</h3>
<p>Nel giorno di Purim, invia almeno due cibi o bevande pronti da consumare ad almeno un amico. Questo rafforza l'amicizia e i legami comunitari. È ideale inviare il pacchetto tramite un messaggero, e i bambini sono incoraggiati a partecipare.</p>
<h3>3. Celebrare con un pasto festivo</h3>
<p>Durante il giorno di Purim, fai un pasto gioioso con la famiglia e possibilmente ospiti. Tradizionalmente include pane, carne, vino, canti, pensieri di Torah e uno spirito di celebrazione.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">Buon Purim!</p>`,
    hu: `<h2>Mi következik?</h2>
<p>Most, hogy befejezted a Megilla hallgatását, íme a másik 3 purimi micva, amelyet érdemes megjegyezni:</p>
<h3>1. Adakozás a rászorulóknak (Matanot LaEvjonim)</h3>
<p>Purim napján adj pénzt vagy ételt legalább két rászoruló embernek. Ez a micva a zsidó egységet és a másokról való gondoskodást emeli ki. Ha nem ismersz senkit személyesen, adhatsz a zsinagógádon keresztül vagy tehetsz pénzt egy jótékonysági dobozba. A gyerekek is vegyenek részt.</p>
<h3>2. Ételküldemények küldése (Mislóach Mánot)</h3>
<p>Purim napján küldj legalább két fogyasztásra kész ételt vagy italt legalább egy barátodnak. Ez erősíti a barátságot és a közösségi kötelékeket. Ideális, ha futár viszi a csomagot, és a gyerekeket is bátorítják a részvételre.</p>
<h3>3. Ünnepi lakoma</h3>
<p>Purim napján rendezz vidám lakomát a családdal és esetleg vendégekkel. Hagyományosan kenyeret, húst, bort, dalokat, Tóra-gondolatokat és ünneplést foglal magában.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">Boldog Purimot!</p>`,
    de: `<h2>Was kommt als Nächstes?</h2>
<p>Nachdem Sie die Megilla gehört haben, hier sind die anderen 3 Purim-Mizwot zum Erinnern:</p>
<h3>1. Den Bedürftigen geben (Matanot LaEvjonim)</h3>
<p>Am Purimtag geben Sie Geld oder Essen an mindestens zwei bedürftige Menschen. Diese Mizwa betont die jüdische Einheit und die Fürsorge für andere. Wenn Sie niemanden persönlich kennen, können Sie über Ihre Synagoge geben oder Geld in eine Wohltätigkeitsbox legen. Auch Kinder sollten teilnehmen.</p>
<h3>2. Essensgeschenke senden (Mischloach Manot)</h3>
<p>Am Purimtag senden Sie mindestens zwei verzehrfertige Speisen oder Getränke an mindestens einen Freund. Dies stärkt Freundschaft und Gemeinschaftsbande. Ideal ist es, das Paket durch einen Boten zu senden, und Kinder werden ermutigt teilzunehmen.</p>
<h3>3. Mit einem Festmahl feiern</h3>
<p>Am Purimtag veranstalten Sie ein fröhliches Mahl mit Familie und möglicherweise Gästen. Traditionell umfasst es Brot, Fleisch, Wein, Lieder, Tora-Gedanken und einen Geist der Feier.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">Fröhlichen Purim!</p>`,
    el: `<h2>Τι ακολουθεί;</h2>
<p>Τώρα που ολοκληρώθηκε η ανάγνωση της Μεγκιλά , αυτές είναι οι άλλες 3 Μιτσβότ του Πουρίμ που πρέπει να θυμάστε:</p>
<h3>1. Δώρα στους φτωχούς (Ματανότ ΛαΕβγιονίμ)</h3>
<p>Την ημέρα του Πουρίμ, δίνουμε χρήματα ή φαγητό σε τουλάχιστον δύο άτομα σε ανάγκη. Αυτή η Μιτσβά τονίζει την εβραϊκή ενότητα και τη φροντίδα για τους άλλους. Αν δεν γνωρίζετε κάποιον προσωπικά, μπορείτε να δώσετε μέσω της συναγωγής σας ή να βάλετε χρήματα σε κουτί φιλανθρωπίας. Τα παιδιά πρέπει επίσης να συμμετέχουν.</p>
<h3>2. Αποστολή δώρων φαγητού (Μισλοάχ Μανότ)</h3>
<p>Την ημέρα του Πουρίμ, στείλτε τουλάχιστον δύο έτοιμα προς κατανάλωση τρόφιμα ή ποτά σε τουλάχιστον έναν φίλο. Αυτό ενισχύει τη φιλία και τους κοινοτικούς δεσμούς. Είναι ιδανικό να στείλετε το πακέτο μέσω αγγελιοφόρου, και τα παιδιά ενθαρρύνονται να συμμετάσχουν.</p>
<h3>3. Γιορτάστε με Εορταστικό Γεύμα</h3>
<p>Κατά τη διάρκεια της ημέρας του Πουρίμ, οργανώστε ένα χαρούμενο γεύμα με την οικογένεια και πιθανώς καλεσμένους. Παραδοσιακά περιλαμβάνει ψωμί, κρέας, κρασί, τραγούδια, σκέψεις Τορά και πνεύμα γιορτής.</p>
<p style="text-align:center;font-weight:900;font-size:1.1rem;">Χαρούμενο Πουρίμ!</p>`,
  };

  const getBottomHintDefault = () => {
    if (lang === 'he') return defaultBottomHintHe;
    return defaultBottomHints[lang] || defaultBottomHints.en;
  };

  useEffect(() => {
    if (!showBottomHintEdit) return;
    const bottomStyle = `body { font-family: Heebo, sans-serif; font-size: 14px; direction: ${lang === 'he' ? 'rtl' : 'ltr'}; background: #fdf6f0; color: #333; } h2 { font-size: 1.2rem; font-weight: 900; color: #660a23; } h3 { font-size: 0.95rem; font-weight: 700; color: #660a23; } p { font-size: 0.85rem; line-height: 1.55; margin: 0 0 8px; } a { color: #660a23; }`;
    ensureTinyMCELoaded(() => initHintEditor('#bottom-hint-tinymce', customBottomHint || getBottomHintDefault(), bottomStyle));
    return () => {
      (window as any).tinymce?.get('bottom-hint-tinymce')?.destroy();
    };
  }, [showBottomHintEdit]);

  // Sync remote word/verse highlight from follower callback
  useEffect(() => {
    if (remoteActiveWord !== undefined) {
      setActiveWord(remoteActiveWord ?? null);
    }
  }, [remoteActiveWord]);

  useEffect(() => {
    if (remoteActiveVerse !== undefined) {
      setActiveVerse(remoteActiveVerse ?? null);
    }
  }, [remoteActiveVerse]);

  const highlightWord = useCallback((wordId: string) => {
    setActiveWord(wordId);
    setActiveVerse(null);
    const now = Date.now();
    if (now - lastBroadcastTime.current >= 80) {
      lastBroadcastTime.current = now;
      session?.broadcastWord(wordId);
      onWordTap?.(wordId);
    }
  }, [session, onWordTap]);

  const highlightVerse = useCallback((verseKey: string) => {
    setActiveVerse(verseKey);
    setActiveWord(null);
    session?.broadcastWord(`v:${verseKey}`);
  }, [session]);

  const trackingModeRef = useRef(trackingMode);
  trackingModeRef.current = trackingMode;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Touch/mouse drag handlers for word-by-word and verse highlighting (admin only)
  useEffect(() => {
    const container = scrollTextRef.current;
    if (!container || session?.role !== 'admin') return;

    const getWordFromPoint = (x: number, y: number): string | null => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const wordEl = (el as HTMLElement).closest?.('[data-word]') as HTMLElement | null;
      return wordEl?.dataset.word ?? null;
    };

    const getVerseFromPoint = (x: number, y: number): string | null => {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      const verseEl = (el as HTMLElement).closest?.('[data-verse]') as HTMLElement | null;
      return verseEl?.dataset.verse ?? null;
    };

    // Smooth gap-fill: animate through intermediate words when drag skips
    const fillGap = (fromWord: string, toWord: string) => {
      if (gapAnimating.current) return;
      const allWords = Array.from(container.querySelectorAll('[data-word]')) as HTMLElement[];
      const fromIdx = allWords.findIndex(el => el.dataset.word === fromWord);
      const toIdx = allWords.findIndex(el => el.dataset.word === toWord);
      if (fromIdx === -1 || toIdx === -1 || Math.abs(toIdx - fromIdx) <= 1) return;

      gapAnimating.current = true;
      const step = fromIdx < toIdx ? 1 : -1;
      let i = fromIdx + step;
      const animateNext = () => {
        if ((step > 0 && i >= toIdx) || (step < 0 && i <= toIdx)) {
          gapAnimating.current = false;
          return;
        }
        const wId = allWords[i]?.dataset.word;
        if (wId) {
          setActiveWord(wId);
        }
        i += step;
        setTimeout(() => requestAnimationFrame(animateNext), 30);
      };
      requestAnimationFrame(animateNext);
    };

    const onPointerStart = (x: number, y: number) => {
      const mode = trackingModeRef.current;
      if (mode === 'off') return false;

      if (mode === 'verse') {
        const verseKey = getVerseFromPoint(x, y);
        if (verseKey) highlightVerse(verseKey);
        return false; // Don't start drag for verse mode
      }

      // Word mode
      const wordId = getWordFromPoint(x, y);
      if (!wordId) return false;
      dragging.current = true;
      lastDragWord.current = wordId;
      setActiveWord(wordId);
      setActiveVerse(null);
      lastBroadcastTime.current = Date.now();
      session?.broadcastWord(wordId);
      onWordTap?.(wordId);
      return true;
    };

    const onPointerMove = (x: number, y: number) => {
      if (!dragging.current) return;
      const wordId = getWordFromPoint(x, y);
      if (wordId && wordId !== lastDragWord.current) {
        // Fill gaps if words were skipped
        if (lastDragWord.current) {
          fillGap(lastDragWord.current, wordId);
        }
        lastDragWord.current = wordId;
        highlightWord(wordId);
      }
    };

    const onPointerEnd = () => {
      dragging.current = false;
      lastDragWord.current = null;
    };

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      // Multi-touch always cancels tracking and allows scroll
      if (e.touches.length >= 2) {
        dragging.current = false;
        lastDragWord.current = null;
        return;
      }
      if (trackingModeRef.current === 'off') return;
      const touch = e.touches[0];
      onPointerStart(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Multi-touch cancels
      if (e.touches.length >= 2) {
        dragging.current = false;
        lastDragWord.current = null;
        return;
      }
      if (!dragging.current) return;
      e.preventDefault(); // Block scrolling while dragging words
      const touch = e.touches[0];
      onPointerMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => onPointerEnd();

    // Mouse events
    const handleMouseDown = (e: MouseEvent) => {
      if (trackingModeRef.current === 'off') return;
      onPointerStart(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      onPointerMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => onPointerEnd();

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [session?.role, highlightWord, highlightVerse, session, onWordTap]);

  useEffect(() => {
    const handleScroll = () => {
      const el = scrollTextRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalHeight = el.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrolled = -rect.top;
      const scrollable = totalHeight - viewportHeight;
      if (scrolled > 50 && menuOpen) {
        setMenuOpen(false);
      }
      if (scrollable <= 0) { setScrollProgress(1); return; }
      const progress = Math.min(1, Math.max(0, scrolled / scrollable));
      setScrollProgress(progress);
      if (progress >= 0.99 && !confettiFired.current) {
        confettiFired.current = true;
        spawnConfetti();
      }
      // Admin: find topmost visible verse and broadcast it (only in scroll-only mode)
      if (sessionRef.current?.role === 'admin' && trackingModeRef.current === 'off') {
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

  const TOTAL_SOUNDS = 22;

  const playGragger = useCallback(() => {
    if (muted) return;
    const idx = Math.floor(Math.random() * TOTAL_SOUNDS) + 1;
    const audio = new Audio(`/sounds/gragger${idx}.mp3`);
    audioPool.current.push(audio);
    audio.play().catch(() => {});
    audio.addEventListener('ended', () => {
      audioPool.current = audioPool.current.filter((a) => a !== audio);
    });
    setSoundActive(true);
    if (soundTimer.current) clearTimeout(soundTimer.current);
    soundTimer.current = setTimeout(() => setSoundActive(false), 5000);
  }, [muted]);

  // Ref so shake effect can read current mute state
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      if (!prev) {
        // Muting: stop all playing sounds
        audioPool.current.forEach(a => { a.pause(); a.currentTime = 0; });
        audioPool.current = [];
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

  return (
    <div class="megillah-reader" dir={lang === 'he' ? 'rtl' : 'ltr'} ref={(el: HTMLDivElement | null) => { if (el) { const expected = lang === 'he' ? 'rtl' : 'ltr'; if (el.dir !== expected) setTimeout(() => { el.dir = expected; el.querySelectorAll('[dir]').forEach(child => { (child as HTMLElement).dir = expected; }); }, 0); } }}>
      {standalone && (
        <header class={`reader-header${session ? ' has-session-bar' : ''}`}>
          <span class="logo-main">
            {customTitle || t.headerTitle}
            {session?.role === 'admin' && (
              <button class="edit-subtitle-btn" onClick={() => { setShowTitleEdit(!showTitleEdit); setDraftTitle(customTitle || ''); }} title={t.editTitle}>
                <span class="material-icons" style="font-size:14px;vertical-align:middle;margin:0 4px">edit</span>
              </button>
            )}
          </span>
          <span class="logo-sub">
            {customSubtitle ? (customSubtitle.url ? <a href={customSubtitle.url} target="_blank" rel="noopener noreferrer" class="header-link">{customSubtitle.text}</a> : customSubtitle.text) : t.headerSub}
            {session?.role === 'admin' && (
              <button id="edit-subtitle-btn" class="edit-subtitle-btn" onClick={() => { setShowSubtitleEdit(!showSubtitleEdit); setDraftSubText(customSubtitle?.text || ''); setDraftSubUrl(customSubtitle?.url || ''); }} title={t.editSubtitle}>
                <span class="material-icons" style="font-size:14px;vertical-align:middle;margin:0 4px">edit</span>
              </button>
            )}
          </span>
          {!session && (
            <a href="/live" class="join-live-btn">
              <span class="material-icons" style="font-size:13px;vertical-align:middle;margin-inline-end:3px">cast</span>
              {t.joinLive}
            </a>
          )}
        </header>
      )}
      {showTitle && (
        <div class="page-title-block">
          <h1 class="page-title">{customTitle || t.headerTitle}</h1>
          <p class="page-subtitle">
            {customSubtitle ? (customSubtitle.url ? <a href={customSubtitle.url} target="_blank" rel="noopener noreferrer" class="header-link">{customSubtitle.text}</a> : customSubtitle.text) : t.headerSub}
            {session?.role === 'admin' && (
              <button class="edit-subtitle-btn" onClick={() => { setShowSubtitleEdit(!showSubtitleEdit); setDraftSubText(customSubtitle?.text || ''); setDraftSubUrl(customSubtitle?.url || ''); }} title={t.editSubtitle}>
                <span class="material-icons" style="font-size:14px;vertical-align:middle;margin:0 4px">edit</span>
              </button>
            )}
          </p>
        </div>
      )}
      {/* Title edit popover */}
      {showTitleEdit && session?.role === 'admin' && (
        <div class="time-popover subtitle-popover" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <label class="subtitle-field">
            {t.titleText}
            <input
              type="text"
              value={draftTitle}
              onInput={(e) => setDraftTitle((e.target as HTMLInputElement).value)}
              placeholder={t.headerTitle}
            />
          </label>
          <button
            class="save-time-btn"
            onClick={() => {
              const val = draftTitle.trim() || null;
              setCustomTitle(val);
              session.broadcastSetting('customTitle', val);
              setShowTitleEdit(false);
            }}
          >
            {t.save}
          </button>
        </div>
      )}
      {/* Subtitle edit popover */}
      {showSubtitleEdit && session?.role === 'admin' && (
        <div class="time-popover subtitle-popover" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <label class="subtitle-field">
            {t.subtitleText}
            <input
              type="text"
              value={draftSubText}
              onInput={(e) => setDraftSubText((e.target as HTMLInputElement).value)}
            />
          </label>
          <label class="subtitle-field">
            {t.subtitleUrl}
            <input
              type="url"
              value={draftSubUrl}
              onInput={(e) => setDraftSubUrl((e.target as HTMLInputElement).value)}
              placeholder="https://..."
            />
          </label>
          <button
            class="save-time-btn"
            onClick={() => {
              const val = draftSubText.trim() ? { text: draftSubText.trim(), url: draftSubUrl.trim() } : null;
              setCustomSubtitle(val);
              session.broadcastSetting('customSubtitle', val);
              setShowSubtitleEdit(false);
            }}
          >
            {t.save}
          </button>
        </div>
      )}
      {/* Session info bar */}
      {session && (
        <div class="session-bar">
          <button id="session-code-btn" class="session-code" onClick={() => setShowQR(true)}>
            <span class="material-icons" style="font-size:16px;vertical-align:middle;margin:0 4px">
              {session.role === 'admin' ? 'cast' : 'cast_connected'}
            </span>
            {t.sessionCode}: {session.code}
          </button>
          <span class="session-role">
            {session.role === 'admin' ? t.broadcasting : t.following}
          </span>
          <button class="session-leave" onClick={session.leave}>
            <span class="material-icons" style={`font-size:16px;vertical-align:middle;margin:0 2px${lang === 'he' && session.role !== 'admin' ? ';transform:scaleX(-1)' : ''}`}>
              {session.role === 'admin' ? 'stop_circle' : 'logout'}
            </span>
            {session.role === 'admin' ? t.endSession : t.leaveSession}
          </button>
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
      <div class={`inline-toolbar${session?.role === 'admin' ? ' toolbar-admin' : ''}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <div class="toolbar-left">
          <span class="material-icons size-icon">text_fields</span>
          <input
            type="range"
            min="0.9"
            max="2.2"
            step="0.05"
            value={fontSize}
            onInput={(e) => { const v = parseFloat((e.target as HTMLInputElement).value); setFontSize(v); if (session?.role === 'admin') session.broadcastSetting('fontSize', v); }}
            class="size-slider"
          />
        </div>
        {lang === 'he' ? (
          <div id="translation-toggle" class="toolbar-translation-toggle">
            <button class={`toolbar-trans-btn${translationMode === 'hebrew' ? ' active' : ''}`} onClick={() => { setTranslationMode('hebrew'); try { localStorage.setItem('megillah-translation-mode', 'hebrew'); } catch {} if (session?.role === 'admin') session.broadcastSetting('translationMode', 'hebrew'); }}>{t.hebrewName}</button>
            <button class={`toolbar-trans-btn${translationMode === 'translation' ? ' active' : ''}`} onClick={() => { setTranslationMode('translation'); try { localStorage.setItem('megillah-translation-mode', 'translation'); } catch {} if (session?.role === 'admin') session.broadcastSetting('translationMode', 'translation'); }}>ביאור</button>
          </div>
        ) : (
          <div id="translation-toggle" class="toolbar-translation-toggle">
            <button class={`toolbar-trans-btn${translationMode === 'translation' ? ' active' : ''}`} onClick={() => { setTranslationMode('translation'); try { localStorage.setItem('megillah-translation-mode', 'translation'); } catch {} if (session?.role === 'admin') session.broadcastSetting('translationMode', 'translation'); }}>{t.langName}</button>
            <button class={`toolbar-trans-btn${translationMode === 'both' ? ' active' : ''}`} onClick={() => { setTranslationMode('both'); try { localStorage.setItem('megillah-translation-mode', 'both'); } catch {} if (session?.role === 'admin') session.broadcastSetting('translationMode', 'both'); }}>{t.both}</button>
            <button class={`toolbar-trans-btn${translationMode === 'hebrew' ? ' active' : ''}`} onClick={() => { setTranslationMode('hebrew'); try { localStorage.setItem('megillah-translation-mode', 'hebrew'); } catch {} if (session?.role === 'admin') session.broadcastSetting('translationMode', 'hebrew'); }}>{t.hebrewName}</button>
          </div>
        )}
        <div class="toolbar-right">
          {session?.role === 'admin' && (
            <button
              id="tracking-mode-btn"
              class={`toolbar-icon-btn${trackingMode !== 'off' ? ' tracking-active' : ''}`}
              onClick={() => { setShowTrackingMenu(!showTrackingMenu); setShowTimeEdit(false); setMenuOpen(false); }}
              title="Tracking mode"
            >
              <span class="material-icons">highlight</span>
            </button>
          )}
          {session?.role === 'follower' && onToggleSync && (
            <button
              id="sync-follow-btn"
              class={`toolbar-icon-btn${syncEnabled ? ' tracking-active' : ''}${syncPulse ? ' sync-pulse' : ''}`}
              onClick={() => {
                onToggleSync();
                const msg = syncEnabled ? t.syncOff : t.syncOn;
                setToast(msg);
                if (toastTimer.current) clearTimeout(toastTimer.current);
                toastTimer.current = setTimeout(() => setToast(null), 3000);
              }}
              title={syncEnabled ? 'Unfollow broadcaster' : 'Follow broadcaster'}
            >
              <span class="material-icons">{syncEnabled ? 'sensors' : 'sensors_off'}</span>
            </button>
          )}
          {!(session?.role === 'follower') && (
          <button
            id="reading-time-btn"
            class="toolbar-icon-btn"
            onClick={() => { setShowTimeEdit(!showTimeEdit); setMenuOpen(false); setShowTrackingMenu(false); }}
            title={t.changeReadingTime}
          >
            <span class="material-icons">timer</span>
          </button>
          )}
          <button
            id="menu-toggle-btn"
            class="toolbar-icon-btn"
            onClick={() => { setMenuOpen(!menuOpen); setShowTimeEdit(false); setShowTrackingMenu(false); }}
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
      {/* Tracking mode popover */}
      {showTrackingMenu && (
        <div class="tracking-popover" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <button
            class={`tracking-option${trackingMode === 'off' ? ' active' : ''}`}
            onClick={() => { setTrackingMode('off'); setActiveVerse(null); setActiveWord(null); setShowTrackingMenu(false); }}
          >
            <span class="material-icons">swipe_vertical</span>
            {t.trackScrolling}
          </button>
          <button
            class={`tracking-option${trackingMode === 'verse' ? ' active' : ''}`}
            onClick={() => { setTrackingMode('verse'); setActiveWord(null); setShowTrackingMenu(false); }}
          >
            <span class="material-icons">view_headline</span>
            {t.trackVerse}
          </button>
          <button
            class={`tracking-option${trackingMode === 'word' ? ' active' : ''}`}
            onClick={() => { setTrackingMode('word'); setActiveVerse(null); setShowTrackingMenu(false); }}
          >
            <span class="material-icons">touch_app</span>
            {t.trackWord}
          </button>
        </div>
      )}
      {/* Settings menu */}
      {menuOpen && (
        <div class="settings-menu" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <label class="option-toggle">
            <input
              type="checkbox"
              checked={showCantillation}
              onChange={() => setShowCantillation(!showCantillation)}
            />
            <span class="toggle-switch"></span>
            <span class="option-label">{t.showCantillation}</span>
          </label>
          {!(session?.role === 'follower') && (
          <label class="option-toggle">
            <input
              type="checkbox"
              checked={chabadMode}
              onChange={() => {
                const next = !chabadMode;
                setChabadMode(next);
                if (session?.role === 'admin') session.broadcastChabadMode(next);
              }}
            />
            <span class="toggle-switch"></span>
            <span class="option-label">{t.chabadCustom}</span>
          </label>
          )}
          <label class="option-toggle">
            <input
              type="checkbox"
              checked={showIllustrations}
              onChange={() => { const next = !showIllustrations; setShowIllustrations(next); if (session?.role === 'admin') session.broadcastSetting('showIllustrations', next); }}
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
                onChange={(e) => {
                  const newLang = (e.target as HTMLSelectElement).value as Lang;
                  setLang(newLang);
                  if (newLang === 'he') {
                    setTranslationMode('hebrew');
                    try { localStorage.setItem('megillah-translation-mode', 'hebrew'); } catch {}
                  } else if (translationMode === 'hebrew') {
                    setTranslationMode('both');
                    try { localStorage.setItem('megillah-translation-mode', 'both'); } catch {}
                  }
                  try { localStorage.setItem(LANG_STORAGE_KEY, newLang); } catch {}
                  if (session?.role === 'admin') session.broadcastSetting('lang', newLang);
                }}
              >
                <option value="he">עברית</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ru">Русский</option>
                <option value="fr">Français</option>
                <option value="pt">Português</option>
                <option value="it">Italiano</option>
                <option value="hu">Magyar</option>
                <option value="de">Deutsch</option>
                <option value="el">Ελληνικά</option>
              </select>
            </label>
          </div>
        </div>
      )}
      </div>

      <div class="hint-area">
        {customTapHint ? (
          <div class="hint-text custom-hint" dangerouslySetInnerHTML={{ __html: customTapHint }} />
        ) : (
          <>
            <p class="hint-text">
              <span class="material-icons hint-icon">touch_app</span>
              {t.tapHint}
            </p>
            {t.listenTitle && (
              <div class="listen-instructions">
                <p class="listen-title">{t.listenTitle}</p>
                <ul>
                  <li>{t.listenStep1}</li>
                  <li>{t.listenStep2}</li>
                  <li>{t.listenStep3}</li>
                </ul>
              </div>
            )}
          </>
        )}
        {session?.role === 'admin' && (
          <button id="edit-hint-btn" class="edit-hint-btn" onClick={() => setShowTapHintEdit(!showTapHintEdit)} title={t.editTapHint}>
            <span class="material-icons" style={{ fontSize: '16px' }}>edit</span>
          </button>
        )}
        {showTapHintEdit && session?.role === 'admin' && (
          <div class="tap-hint-editor">
            <div ref={tinymceRef} class="tinymce-container">
              <textarea id="tap-hint-tinymce" />
            </div>
            <div class="tap-hint-editor-actions">
              <button class="save-btn" onClick={() => {
                const editor = (window as any).tinymce?.get('tap-hint-tinymce');
                const html = editor?.getContent() || '';
                const val = html.trim() ? html : null;
                setCustomTapHint(val);
                session.broadcastSetting('customTapHint', val);
                setShowTapHintEdit(false);
                editor?.destroy();
              }}>{t.save}</button>
              <button class="reset-btn" onClick={() => {
                setCustomTapHint(null);
                session.broadcastSetting('customTapHint', null);
                setShowTapHintEdit(false);
                const editor = (window as any).tinymce?.get('tap-hint-tinymce');
                editor?.destroy();
              }}>{t.resetToDefault}</button>
            </div>
          </div>
        )}
      </div>

      <div class={`scroll-text${session?.role === 'admin' ? ' admin-session' : ''}${trackingMode !== 'off' ? ' tracking-on' : ''}`} dir="rtl" ref={scrollTextRef}>
        <div class="blessings-block" data-verse="blessings-before" style={{ fontSize: `${fontSize}rem` }}>
          <h2 class="chapter-heading">{lang === 'he' ? 'ברכות לפני קריאת המגילה' : 'Blessings Before the Reading'}</h2>
          {lang === 'en' && translationMode === 'translation' ? (
            <>
              <div class="blessing-unit">
                <div class="blessing-translation">
                  <p>Blessed are You, G‑d our L-rd, King of the universe, Who has sanctified us with His commandments and commanded us concerning the reading of the Megillah.</p>
                </div>
                <div class="blessing-transliteration">
                  <p>Bah-rookh ah-tah ah-doh-noi eh-loh-hay-noo meh-lekh hah-oh-lahm ah-shehr kahd-sah-noo bi-meetz-voh-taiv vi-tzee-vah-noo. ahl meek-rah mi-glah.</p>
                </div>
                <p class="blessing-response">Respond: Amein</p>
              </div>
              <div class="blessing-unit">
                <div class="blessing-translation">
                  <p>Blessed are You, G‑d our L-rd, King of the universe, Who performed miracles for our ancestors in those days, at this time.</p>
                </div>
                <div class="blessing-transliteration">
                  <p>Bah-rookh ah-tah ah-doh-noi eh-loh-hay-noo meh-lekh hah-oh-lahm sheh-ah-sah-h ni-seem lah-ah-voh-tay-noo bah-yah-meem hah-haym beez-mahn hah-zeh.</p>
                </div>
                <p class="blessing-response">Respond: Amein</p>
              </div>
              <div class="blessing-unit">
                <div class="blessing-translation">
                  <p>Blessed are You, G‑d our L-rd, King of the universe, Who has granted us life, sustained us, and enabled us to reach this occasion.</p>
                </div>
                <div class="blessing-transliteration">
                  <p>Bah-rookh ah-tah ah-doh-noi eh-loh-hay-noo meh-lekh hah-oh-lahm sheh-heh-kheh-ah-noo vi-kee-mah-noo vi-hee-gee-ah-noo leez-mahn hah-zeh.</p>
                </div>
                <p class="blessing-response">Respond: Amein</p>
              </div>
            </>
          ) : lang === 'en' && translationMode === 'both' ? (
            <div class="blessing-side-by-side">
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>Blessed are You, G‑d our L-rd, King of the universe, Who has sanctified us with His commandments and commanded us concerning the reading of the Megillah.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text">
                    <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל מִקְרָא מְגִלָּה.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>Bah-rookh ah-tah ah-doh-noi eh-loh-hay-noo meh-lekh hah-oh-lahm ah-shehr kahd-sah-noo bi-meetz-voh-taiv vi-tzee-vah-noo. ahl meek-rah mi-glah.</p>
              </div>
              <p class="blessing-response-full">Respond: Amein</p>
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>Blessed are You, G‑d our L-rd, King of the universe, Who performed miracles for our ancestors in those days, at this time.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text">
                    <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשָׂה נִסִּים לַאֲבוֹתֵינוּ בַּיָּמִים הָהֵם בַּזְּמַן הַזֶּה.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>Bah-rookh ah-tah ah-doh-noi eh-loh-hay-noo meh-lekh hah-oh-lahm sheh-ah-sah-h ni-seem lah-ah-voh-tay-noo bah-yah-meem hah-haym beez-mahn hah-zeh.</p>
              </div>
              <p class="blessing-response-full">Respond: Amein</p>
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>Blessed are You, G‑d our L-rd, King of the universe, Who has granted us life, sustained us, and enabled us to reach this occasion.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text">
                    <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>Bah-rookh ah-tah ah-doh-noi eh-loh-hay-noo meh-lekh hah-oh-lahm sheh-heh-kheh-ah-noo vi-kee-mah-noo vi-hee-gee-ah-noo leez-mahn hah-zeh.</p>
              </div>
              <p class="blessing-response-full">Respond: Amein</p>
            </div>
          ) : (
            <div class="blessing-text">
              <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל מִקְרָא מְגִלָּה.</p>
              <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשָׂה נִסִּים לַאֲבוֹתֵינוּ בַּיָּמִים הָהֵם בַּזְּמַן הַזֶּה.</p>
              <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ וְהִגִּיעָנוּ לַזְּמַן הַזֶּה.</p>
            </div>
          )}
        </div>

        {megillahText.map((ch) => (
          <div key={ch.chapter} class="chapter-block">
            <h2 class="chapter-heading">{t.chapter} {lang === 'he' ? toHebrew(ch.chapter) : ch.chapter}</h2>
            <div class={`verses-container${translationMode !== 'hebrew' ? ' with-translation' : ''}${translationMode === 'translation' ? ' translation-only' : ''}${translationMode === 'both' && lang !== 'he' ? ' side-by-side' : ''}`} dir={translationMode === 'translation' && lang !== 'he' ? 'ltr' : undefined} style={{ fontSize: `${fontSize}rem` }}>
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

                  // Collect all sons' verses from 9:7-9:9
                  const sonsVerses = ch.verses.filter(sv => BNEI_HAMAN_VERSES.has(`${ch.chapter}:${sv.verse}`));

                  // Split 9:6 translation: before = "...destroyed/killed", loud = "five hundred men."
                  const trans96 = activeTranslations?.['9:6'] || '';
                  // Match the "500 men" portion across languages
                  const trans96SplitPatterns: Record<string, RegExp> = {
                    en: /^(.*?destroyed\s*)(five hundred men\..*)$/i,
                    es: /^(.*?mataron a\s*)(quinientos hombres\..*)$/i,
                    fr: /^(.*?exterminèrent\s*)(cinq cents hommes.*)$/i,
                    it: /^(.*?distrussero\s*)(cinquecent.*)$/i,
                    pt: /^(.*?destruíram\s*)(quinhentos homens\..*)$/i,
                    ru: /^(.*?истребили\s*)(пятьсот человек\..*)$/i,
                    hu: /^(.*?elpusztítottak\s*)(ötszáz embert.*)$/i,
                    de: /^(.*?vernichteten\s*)(fünfhundert Mann\..*)$/i,
                    el: /^(.*?σκότωσαν\s*)(πεντακόσιους άνδρες\..*)$/i,
                    he: /^(.*?וְאַבֵּד\s*)(חֲמֵשׁ מֵאוֹת אִישׁ.*)$/,
                  };
                  const trans96Re = trans96SplitPatterns[lang];
                  const trans96Match = trans96Re ? trans96.match(trans96Re) : null;
                  const trans96Before = trans96Match ? trans96Match[1] : trans96;
                  const trans96Loud = trans96Match ? trans96Match[2] : '';

                  // Compute v10 first word early so we can integrate it into the blocks
                  const v10 = ch.verses.find(sv => sv.verse === 10);
                  const v10text = v10 ? (!showCantillation ? stripCantillation(v10.text) : v10.text) : '';
                  const v10firstSpace = v10text.indexOf(' ');
                  const v10firstWord = v10firstSpace > 0 ? v10text.slice(0, v10firstSpace) : v10text;
                  const v10trans = activeTranslations?.['9:10'] || '';
                  // Match "the ten sons of" across languages
                  const v10SplitPatterns: Record<string, RegExp> = {
                    en: /^(.*?the ten sons of\s*)/i,
                    es: /^(.*?los diez hijos de\s*)/i,
                    fr: /^(.*?les dix fils d['']\s*)/i,
                    it: /^(.*?[Dd]ieci figli d['']\s*)/i,
                    pt: /^(.*?[Oo]s dez filhos de\s*)/i,
                    ru: /^(.*?[Дд]есять сыновей\s*)/i,
                    hu: /^(.*?tíz fiát\s*)/i,
                    de: /^(.*?[Dd]ie zehn Söhne\s*)/i,
                    el: /^(.*?δέκα γιους του Αμάν\s*)/i,
                    he: /^(.*?עֲשֶׂרֶת בְּנֵי הָמָן\s*)/,
                  };
                  const v10Re = v10SplitPatterns[lang];
                  const v10transMatch = v10Re ? v10trans.match(v10Re) : null;
                  const v10transBefore = v10transMatch ? v10transMatch[1] : '';

                  const bneiTranslations = activeTranslations
                    ? [trans96Loud, ...['9:7', '9:8', '9:9'].map(k => activeTranslations[k]), v10transBefore]
                        .filter(Boolean)
                        .join(' ')
                    : null;

                  const sideBySide96 = translationMode === 'both' && lang !== 'he';

                  return [
                    sideBySide96 ? (
                      <div key="9-6-before" class="verse verse-row" data-verse="9:6">
                        <div class="verse-col verse-col-translation" dir="ltr">
                          <sup class="verse-num">{v.verse}</sup>
                          {trans96Before && <span class="verse-translation" dir="ltr">{trans96Before}</span>}
                        </div>
                        <div class="verse-col verse-col-hebrew" dir="rtl">
                          <sup class="verse-num">{toHebrew(v.verse)}</sup>
                          {beforeText}
                        </div>
                      </div>
                    ) : (
                      <span key="9-6-before" class="verse" data-verse="9:6">
                        <sup class="verse-num">{lang === 'he' ? toHebrew(v.verse) : v.verse}</sup>
                        {translationMode !== 'translation' && beforeText}
                        {trans96Before && translationMode !== 'hebrew' && <span class="verse-translation" dir={lang === 'he' ? 'rtl' : 'ltr'}>{trans96Before}</span>}
                      </span>
                    ),
                    <span key="bnei-haman-block" class="verse loud-verse bnei-haman" data-verse="9:7">
                      <span class="loud-label" dir={lang === 'he' ? 'rtl' : 'ltr'}>{t.bneiHamanLabel}</span>
                      {lang !== 'he' && <span class="transliteration-box" dir="ltr">{({
                        en: "Chamesh me'ot ish. V'et Parshandatha, v'et Dalfon, v'et Aspatha, v'et Poratha, v'et Adalya, v'et Aridatha, v'et Parmashta, v'et Arisai, v'et Aridai, v'et Vayzatha. Aseret...",
                        es: "Jamesh meot ish. Veet Parshandatá, veet Dalfón, veet Aspatá, veet Poratá, veet Adalyá, veet Aridatá, veet Parmashtá, veet Arisái, veet Aridái, veet Vayzatá. Aséret...",
                        fr: "Hamesh méot ish. Veète Parshandatha, veète Dalfone, veète Aspatha, veète Poratha, veète Adalya, veète Aridatha, veète Parmashta, veète Arisaï, veète Aridaï, veète Vayzatha. Assérète...",
                        ru: "Хамеш меот иш. Веэт Паршандата, веэт Дальфон, веэт Аспата, веэт Пората, веэт Адалья, веэт Аридата, веэт Пармашта, веэт Арисай, веэт Аридай, веэт Вайзата. Асерет...",
                        pt: "Chamesh meot ish. Veet Parshandatá, veet Dalfón, veet Aspatá, veet Poratá, veet Adalyá, veet Aridatá, veet Parmashtá, veet Arisái, veet Aridái, veet Vayzatá. Asséret...",
                        it: "Chamesh meòt ish. Veèt Parshandathà, veèt Dalfòn, veèt Aspathà, veèt Porathà, veèt Adalyà, veèt Aridathà, veèt Parmashtà, veèt Arisài, veèt Aridài, veèt Vayzathà. Assèret...",
                        hu: "Hámes méot is. Veét Pársándátá, veét Dálfon, veét Ászpátá, veét Porátá, veét Ádáljá, veét Áridátá, veét Pármástá, veét Áriszáj, veét Áridáj, veét Vájzátá. Ászeret...",
                        de: "Chamesch meot isch. Weet Parschandatha, weet Dalfon, weet Aspatha, weet Poratha, weet Adalja, weet Aridatha, weet Parmaschta, weet Arisai, weet Aridai, weet Waisatha. Asseret...",
                        el: "Αμέσς μεότ ισς. Βεέτ Παρσσαντάτα, βεέτ Νταλφόν, βεέτ Ασπατά, βεέτ Ποράτα, βεέτ Ανταλγιά, βεέτ Αριντάτα, βεέτ Παρμασστά, βεέτ Αρισάι, βεέτ Αριντάι, βεέτ Βαϊζατά. Ασέρετ...",
                      } as Record<string, string>)[lang] || "Chamesh me'ot ish. V'et Parshandatha, v'et Dalfon, v'et Aspatha, v'et Poratha, v'et Adalya, v'et Aridatha, v'et Parmashta, v'et Arisai, v'et Aridai, v'et Vayzatha. Aseret..."}</span>}
                      {translationMode !== 'translation' && <>
                        <span class="haman-son">{splitText}</span>
                        {sonsVerses.map(sv => {
                          const names = sv.text.split(/\s{2,}/).map(n => n.trim()).filter(Boolean)
                            .map(n => !showCantillation ? stripCantillation(n) : n);
                          return <span key={`sv-${sv.verse}`} class="haman-verse-group">
                            <sup class="verse-num">{lang === 'he' ? toHebrew(sv.verse) : sv.verse}</sup>
                            {names.map((name, i) => (
                              <span key={`son-${sv.verse}-${i}`} class="haman-son">{name}</span>
                            ))}
                          </span>;
                        })}
                        {v10 && <span class="haman-verse-group">
                          <sup class="verse-num">{lang === 'he' ? toHebrew(10) : 10}</sup>
                          <span class="haman-son">{v10firstWord}</span>
                        </span>}
                      </>}
                      {bneiTranslations && <span class="verse-translation" dir={lang === 'he' ? 'rtl' : 'ltr'}>{bneiTranslations}</span>}
                    </span>,
                  ].filter(Boolean);
                }

                // Verse 9:10: skip first word (rendered in bnei haman block above)
                if (verseKey === '9:10') {
                  const raw = !showCantillation ? stripCantillation(v.text) : v.text;
                  const firstSpace = raw.indexOf(' ');
                  const restText = firstSpace > 0 ? raw.slice(firstSpace + 1) : '';
                  const v10trans = activeTranslations?.['9:10'] || '';
                  const v10RestPatterns: Record<string, RegExp> = {
                    en: /^(.*?the ten sons of\s*)([\s\S]*)$/i,
                    es: /^(.*?los diez hijos de\s*)([\s\S]*)$/i,
                    fr: /^(.*?les dix fils d['']\s*)([\s\S]*)$/i,
                    it: /^(.*?[Dd]ieci figli d['']\s*)([\s\S]*)$/i,
                    pt: /^(.*?[Oo]s dez filhos de\s*)([\s\S]*)$/i,
                    ru: /^(.*?[Дд]есять сыновей\s*)([\s\S]*)$/i,
                    hu: /^(.*?tíz fiát\s*)([\s\S]*)$/i,
                    de: /^(.*?[Dd]ie zehn Söhne\s*)([\s\S]*)$/i,
                    el: /^(.*?δέκα γιους του Αμάν\s*)([\s\S]*)$/i,
                    he: /^(.*?עֲשֶׂרֶת בְּנֵי הָμָן\s*)([\s\S]*)$/,
                  };
                  const v10RestRe = v10RestPatterns[lang];
                  const transMatch = v10RestRe ? v10trans.match(v10RestRe) : null;
                  const transRest = transMatch ? transMatch[2] : v10trans;
                  const customTranslations = transRest ? { '9:10': transRest } as TranslationMap : activeTranslations;
                  const verseResult = [renderVerse(restText, ch.chapter, v.verse, playGragger, chabadMode, false, translationMode, t, lang, customTranslations, activeWord, activeVerse, needsWordSpans)];
                  return verseResult;
                }

                const verseResult = [renderVerse(v.text, ch.chapter, v.verse, playGragger, chabadMode, !showCantillation, translationMode, t, lang, activeTranslations, activeWord, activeVerse, needsWordSpans)];
                const illustration = showIllustrations && ILLUSTRATIONS.find(ill => ill.after === verseKey);
                if (illustration) {
                  verseResult.push(
                    <div class={`illustration${lang === 'he' ? ' illustration-he' : ''}`} key={`ill-${verseKey}`}>
                      <img src={illustration.src} alt={`Esther ${verseKey}`} loading="lazy" />
                      <a href="https://torahapp.org" target="_blank" rel="noopener noreferrer" class="illustration-attribution">© torahapp.org</a>
                    </div>
                  );
                }
                return verseResult;
              })}
            </div>
          </div>
        ))}

        <div class="blessings-block" data-verse="blessings-after" style={{ fontSize: `${fontSize}rem` }}>
          <h2 class="chapter-heading">{lang === 'he' ? 'ברכה לאחר קריאת המגילה' : 'Blessing After the Reading'}</h2>
          {lang === 'en' && translationMode === 'translation' ? (
            <>
              <div class="blessing-translation">
                <p>Blessed are You, G‑d our L-rd, King of the universe, Who champions our cause, judges our case, avenges our wrongs, exacts retribution for us from our adversaries, and repays all the enemies of our soul. Blessed are You, G‑d, Who exacts retribution for His people Israel from all their oppressors, the G‑d Who delivers.</p>
              </div>
              <div class="blessing-transliteration">
                <p>Bah-rookh ah-tah ah-doh-noi eh-loh-hay-noo meh-lekh hah-oh-lahm hah-rahv eht ree-vay-noo vi-hah-dahn eht dee-nay-noo vi-hah-noh-kaym eht neek-mah-tay-noo vi-hah-neef-rah lah-noo mee-tzah-ray-noo vi-hahm-shah-laym gi-mool li-khohl ohvay nahf-shay-noo. bah-rookh ah-tah ah-doh-noi hah-neef-rah lah-moh yee-sׂrah-ayl mee-kahl tzah-ray-hehm hah-ayl hah-moh-shee-ah.</p>
              </div>
              <p class="blessing-response">Respond: Amein</p>
            </>
          ) : lang === 'en' && translationMode === 'both' ? (
            <div class="blessing-side-by-side">
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>Blessed are You, G‑d our L-rd, King of the universe, Who champions our cause, judges our case, avenges our wrongs, exacts retribution for us from our adversaries, and repays all the enemies of our soul. Blessed are You, G‑d, Who exacts retribution for His people Israel from all their oppressors, the G‑d Who delivers.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text">
                    <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, הָרָב אֶת רִיבֵנוּ, וְהַדָּן אֶת דִּינֵנוּ, וְהַנּוֹקֵם אֶת נִקְמָתֵנוּ, וְהַנִּפְרָע לָנוּ מִצָּרֵינוּ, וְהַמְשַׁלֵּם גְּמוּל לְכָל אוֹיְבֵי נַפְשֵׁנוּ, בָּרוּךְ אַתָּה אֲ-דוֹנָי, הַנִּפְרָע לְעַמּוֹ יִשְׂרָאֵל מִכָּל צָרֵיהֶם, הָאֵ-ל הַמּוֹשִׁיעַ.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>Bah-rookh ah-tah ah-doh-noi eh-loh-hay-noo meh-lekh hah-oh-lahm hah-rahv eht ree-vay-noo vi-hah-dahn eht dee-nay-noo vi-hah-noh-kaym eht neek-mah-tay-noo vi-hah-neef-rah lah-noo mee-tzah-ray-noo vi-hahm-shah-laym gi-mool li-khohl ohvay nahf-shay-noo. bah-rookh ah-tah ah-doh-noi hah-neef-rah lah-moh yee-sׂrah-ayl mee-kahl tzah-ray-hehm hah-ayl hah-moh-shee-ah.</p>
              </div>
              <p class="blessing-response-full">Respond: Amein</p>
            </div>
          ) : (
            <div class="blessing-text">
              <p>בָּרוּךְ אַתָּה אֲ-דוֹנָי אֱ-לֹהֵינוּ מֶלֶךְ הָעוֹלָם, הָרָב אֶת רִיבֵנוּ, וְהַדָּן אֶת דִּינֵנוּ, וְהַנּוֹקֵם אֶת נִקְמָתֵנוּ, וְהַנִּפְרָע לָנוּ מִצָּרֵינוּ, וְהַמְשַׁלֵּם גְּמוּל לְכָל אוֹיְבֵי נַפְשֵׁנוּ, בָּרוּךְ אַתָּה אֲ-דוֹנָי, הַנִּפְרָע לְעַמּוֹ יִשְׂרָאֵל מִכָּל צָרֵיהֶם, הָאֵ-ל הַמּוֹשִׁיעַ.</p>
            </div>
          )}
        </div>

        <div class="blessings-block loud-verse" data-verse="shoshanat" style={{ fontSize: `${fontSize}rem` }}>
          <h2 class="chapter-heading">{lang === 'he' ? 'שׁוֹשַׁנַּת יַעֲקֹב' : 'Shoshanat Yaakov'}</h2>
          {lang === 'en' && translationMode !== 'hebrew' && (
            <span class="loud-label">Everyone says this together</span>
          )}
          {lang === 'en' && translationMode === 'translation' ? (
            <>
              <div class="blessing-translation">
                <p>The rose of Jacob rejoiced and was glad when they together beheld the sky-blue garments of Mordechai.</p>
                <p>You were their salvation forever, and their hope throughout every generation.</p>
                <p>To proclaim that all who hope in You shall never be put to shame, nor shall all who take refuge in You ever be disgraced.</p>
                <p>Cursed is Haman who sought to destroy me; blessed is Mordechai the Jew.</p>
                <p>Cursed is Zeresh, the wife of my terror; blessed is Esther who pleaded for me.</p>
                <p>Cursed are all the wicked; blessed are all the righteous—and also Charvonah is remembered for good.</p>
              </div>
              <div class="blessing-transliteration">
                <p>Shoh-shah-naht yah-ah-kohv tzah-hah-lah vi-sׂah-may-khah. bee-roh-tahm yah-khahd ti-khay-leht mahr-dkhai.</p>
                <p>ti-shoo-ah-tahm hah-yee-tah lah-neh-tzakh vi-teek-vah-tahm bi-khohl dohr vah-dohr.</p>
                <p>li-hoh-dee-ah sheh-kahl koh-veh-khah loh yay-voh-shoo vi-loh yee-kahl-moo lah-neh-tzakh kohl hah-khoh-seem bakh.</p>
                <p>ah-roor hah-mahn ah-shehr bee-kaysh lahb-dee bah-rookh mahr-dkhai hah-yhoo-dee.</p>
                <p>ah-roo-rah zeh-resh ay-sheht mahf-khee-dee bi-roo-khah ehs-tayr bah-ah-dee.</p>
                <p>ah-roo-reem kohl hahr-shah-eem bi-roo-kheem kohl hah-tzah-dee-keem vi-gahm khahr-voh-nah zah-khoor lah-tohv.</p>
              </div>
            </>
          ) : lang === 'en' && translationMode === 'both' ? (
            <div class="blessing-side-by-side">
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>The rose of Jacob rejoiced and was glad when they together beheld the sky-blue garments of Mordechai.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text shoshanat-yaakov">
                    <p>שׁוֹשַׁנַּת יַעֲקֹב צָהֲלָה וְשָׂמֵחָה, בִּרְאוֹתָם יַחַד תְּכֵלֶת מָרְדְּכָי,</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>Shoh-shah-naht yah-ah-kohv tzah-hah-lah vi-sׂah-may-khah. bee-roh-tahm yah-khahd ti-khay-leht mahr-dkhai.</p>
              </div>
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>You were their salvation forever, and their hope throughout every generation.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text shoshanat-yaakov">
                    <p>תְּשׁוּעָתָם הָיִיתָ לָנֶצַח, וְתִקְוָתָם בְּכָל דּוֹר וָדוֹר.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>ti-shoo-ah-tahm hah-yee-tah lah-neh-tzakh vi-teek-vah-tahm bi-khohl dohr vah-dohr.</p>
              </div>
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>To proclaim that all who hope in You shall never be put to shame, nor shall all who take refuge in You ever be disgraced.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text shoshanat-yaakov">
                    <p>לְהוֹדִיעַ שֶׁכָּל קֹוֶיךָ לֹא יֵבֹשׁוּ וְלֹא יִכָּלְמוּ לָנֶצַח כָּל הַחוֹסִים בָּךְ.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>li-hoh-dee-ah sheh-kahl koh-veh-khah loh yay-voh-shoo vi-loh yee-kahl-moo lah-neh-tzakh kohl hah-khoh-seem bakh.</p>
              </div>
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>Cursed is Haman who sought to destroy me; blessed is Mordechai the Jew.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text shoshanat-yaakov">
                    <p>אָרוּר הָמָן אֲשֶׁר בִּקֵשׁ לְאַבְּדִי, בָּרוּךְ מָרְדְּכַי הַיְּהוּדִי.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>ah-roor hah-mahn ah-shehr bee-kaysh lahb-dee bah-rookh mahr-dkhai hah-yhoo-dee.</p>
              </div>
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>Cursed is Zeresh, the wife of my terror; blessed is Esther who pleaded for me.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text shoshanat-yaakov">
                    <p>אֲרוּרָה זֶרֶשׁ אֵשֶׁת מַפְחִידִי, בְּרוּכָה אֶסְתֵּר בַּעֲדִי.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>ah-roo-rah zeh-resh ay-sheht mahf-khee-dee bi-roo-khah ehs-tayr bah-ah-dee.</p>
              </div>
              <div class="blessing-row">
                <div class="blessing-col blessing-col-translation" dir="ltr">
                  <div class="blessing-translation">
                    <p>Cursed are all the wicked; blessed are all the righteous—and also Charvonah is remembered for good.</p>
                  </div>
                </div>
                <div class="blessing-col blessing-col-hebrew" dir="rtl">
                  <div class="blessing-text shoshanat-yaakov">
                    <p>אֲרוּרִים כָּל הָרְשָׁעִים, בְּרוּכִים כָּל הַצַּדִּיקִים,</p>
                    <p>וְגַם חַרְבוֹנָה זָכוּר לַטּוֹב.</p>
                  </div>
                </div>
              </div>
              <div class="blessing-transliteration blessing-transliteration-row">
                <p>ah-roo-reem kohl hahr-shah-eem bi-roo-kheem kohl hah-tzah-dee-keem vi-gahm khahr-voh-nah zah-khoor lah-tohv.</p>
              </div>
            </div>
          ) : (
            <div class="blessing-text shoshanat-yaakov">
              <p>שׁוֹשַׁנַּת יַעֲקֹב צָהֲלָה וְשָׂמֵחָה, בִּרְאוֹתָם יַחַד תְּכֵלֶת מָרְדְּכָי,</p>
              <p>תְּשׁוּעָתָם הָיִיתָ לָנֶצַח, וְתִקְוָתָם בְּכָל דּוֹר וָדוֹר.</p>
              <p>לְהוֹדִיעַ שֶׁכָּל קֹוֶיךָ לֹא יֵבֹשׁוּ וְלֹא יִכָּלְמוּ לָנֶצַח כָּל הַחוֹסִים בָּךְ.</p>
              <p>אָרוּר הָמָן אֲשֶׁר בִּקֵשׁ לְאַבְּדִי, בָּרוּךְ מָרְדְּכַי הַיְּהוּדִי.</p>
              <p>אֲרוּרָה זֶרֶשׁ אֵשֶׁת מַפְחִידִי, בְּרוּכָה אֶסְתֵּר בַּעֲדִי.</p>
              <p>אֲרוּרִים כָּל הָרְשָׁעִים, בְּרוּכִים כָּל הַצַּדִּיקִים,</p>
              <p>וְגַם חַרְבוֹנָה זָכוּר לַטּוֹב.</p>
            </div>
          )}
        </div>
      </div>

      <div class="whats-next-area">
        {showBottomHintEdit ? null : customBottomHint ? (
          <div class="whats-next custom-bottom-content" dir={lang === 'he' ? 'rtl' : 'ltr'} dangerouslySetInnerHTML={{ __html: customBottomHint }} />
        ) : lang === 'he' ? (
          <div class="whats-next" dir="rtl">
            <h2 class="whats-next-title">מה הלאה?</h2>
            <p class="whats-next-intro">חוץ מקריאת המגילה, ישנן עוד שלוש מצוות שיש לקיים אותן ביום פורים:</p>
            <div class="whats-next-item">
              <h3>🎁 מתנות לאביונים – איך עושים?</h3>
              <p>במהלך יום הפורים כל איש ואישה – ורצוי שגם הילדים ישתתפו – נותנים סכום כסף או מתנה לשני אנשים נזקקים (איש או אישה). המינימום הוא לתת לשני עניים, ולפחות שווי של פרוטה לכל אחד. כל המרבה – הרי זה משובח.</p>
              <p>יש להרבות במתנות לאביונים יותר מיתר מצוות הפורים, כי השמחה המפוארת והגדולה ביותר היא לשמח את לב העניים, היתומים, האלמנות והגרים.</p>
            </div>
            <div class="whats-next-item">
              <h3>🍱 משלוח מנות – איך עושים?</h3>
              <p>ביום הפורים שולחים לחברים ולידידים – ואפשר גם לכאלה שיהיו ידידים בעתיד 😉 – שני מוצרי מזון לאדם אחד לפחות.</p>
              <p>ניתן לשלוח כל סוג של מזון, ובלבד שיהיה דבר אכיל: פירות או ירקות, משקאות או מאפים, תבשילים או מוצרים קנויים.</p>
              <p>כל גבר צריך לשלוח לגבר אחד לפחות, וכל אישה לאישה אחת לפחות. אפשר, ואף מומלץ, לשלוח ליותר אנשים. כל המרבה – הרי זה משובח.</p>
            </div>
            <div class="whats-next-item">
              <h3>🎉 משתה ושמחה – סעודת פורים</h3>
              <p>ביום הפורים מצווה לקיים סעודה ומשתה מתוך שמחה מיוחדת וגדולה. פורים הוא מהימים השמחים ביותר בלוח השנה היהודי, ואם שמחים בו כראוי – זוכים להמשיך את השמחה גם לימים הבאים.</p>
              <p>חז"ל קבעו: "חייב אדם לבסומי בפוריא עד דלא ידע בין ארור המן לברוך מרדכי".</p>
              <p>סעודת הפורים מתקיימת ביום, ללא עריכת קידוש. מכבדים את היום בפריסת מפה נאה על השולחן, במאכלים משובחים, ויש הנוהגים לבצוע חלות יפות ולהדליק תאורה או נרות חגיגיים (ללא ברכה).</p>
            </div>
            <p class="whats-next-credit">(באדיבות אתר חב"ד.אורג)</p>
            <p class="whats-next-happy">פורים שמח!</p>
          </div>
        ) : (
          <div class="whats-next custom-bottom-content" dir="ltr" dangerouslySetInnerHTML={{ __html: defaultBottomHints[lang] || defaultBottomHints.en }} />
        )}
        {session?.role === 'admin' && (
          <button class="edit-hint-btn edit-bottom-hint-btn" onClick={() => setShowBottomHintEdit(!showBottomHintEdit)} title={t.editTapHint}>
            <span class="material-icons" style={{ fontSize: '16px' }}>edit</span>
          </button>
        )}
        {showBottomHintEdit && session?.role === 'admin' && (
          <div class="tap-hint-editor">
            <div class="tinymce-container">
              <textarea id="bottom-hint-tinymce" />
            </div>
            <div class="tap-hint-editor-actions">
              <button class="save-btn" onClick={() => {
                const editor = (window as any).tinymce?.get('bottom-hint-tinymce');
                const html = editor?.getContent() || '';
                const val = html.trim() ? html : null;
                setCustomBottomHint(val);
                session.broadcastSetting('customBottomHint', val);
                setShowBottomHintEdit(false);
                editor?.destroy();
              }}>{t.save}</button>
              <button class="reset-btn" onClick={() => {
                setCustomBottomHint(null);
                session.broadcastSetting('customBottomHint', null);
                setShowBottomHintEdit(false);
                const editor = (window as any).tinymce?.get('bottom-hint-tinymce');
                editor?.destroy();
              }}>{t.resetToDefault}</button>
            </div>
          </div>
        )}
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

      {showQR && session && (() => {
        const shareUrl = `https://megillah.app/${session.code}`;
        const directUrl = `https://megillah.app/live/join?code=${session.code}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(directUrl)}`;
        return (
          <div class="qr-overlay" onClick={() => setShowQR(false)}>
            <div class="qr-modal" dir="ltr" onClick={(e: Event) => e.stopPropagation()}>
              <button class="qr-close" onClick={() => setShowQR(false)}>
                <span class="material-icons">close</span>
              </button>
              <img class="qr-img" src={qrUrl} alt="QR Code" width={260} height={260} />
              <div class="qr-url-box">
                <span class="qr-url">{shareUrl}</span>
                <button class="qr-copy-btn" onClick={() => {
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    setQrCopied(true);
                    setTimeout(() => setQrCopied(false), 2000);
                  });
                }}>
                  <span class="material-icons">{qrCopied ? 'check' : 'content_copy'}</span>
                  {qrCopied ? t.copied : t.copyLink}
                </button>
              </div>
              {session.role === 'admin' && (
                <a class="qr-view-follower" href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <span class="material-icons">visibility</span>
                  {t.viewAsFollower}
                </a>
              )}
            </div>
          </div>
        );
      })()}


      {toast && (
        <div class="sync-toast">{toast}</div>
      )}

      <style>{`
        .megillah-reader {
          max-width: 100vw;
        }

        .reader-header {
          background: var(--color-burgundy);
          color: var(--color-white);
          padding: 14px 0;
          text-align: center;
          box-shadow: 0 2px 8px rgba(102, 10, 35, 0.3);
          margin: 0 -16px 0;
          position: relative;
          border-radius: 0 0 12px 12px;
        }

        .reader-header.has-session-bar {
          border-radius: 0;
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

        .join-live-btn {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.65rem;
          font-weight: 400;
          color: var(--color-white);
          text-decoration: none;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          padding: 4px 8px;
          white-space: nowrap;
        }

        [dir="rtl"] .join-live-btn {
          left: auto;
          right: 16px;
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
          height: 28px;
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
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text);
          white-space: nowrap;
          text-shadow: 0 0 3px var(--color-white), 0 0 3px var(--color-white);
        }

        .toolbar-sticky {
          position: sticky;
          top: 28px;
          z-index: 50;
          margin-bottom: 14px;
        }

        .inline-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          background: var(--color-white);
          border-radius: 0 0 12px 12px;
          padding: 6px 10px;
          box-shadow: 0 2px 8px rgba(102, 10, 35, 0.08);
          max-width: 100%;
          overflow: hidden;
        }

        .toolbar-admin {
          gap: 4px;
          padding: 5px 8px;
        }

        .toolbar-admin .toolbar-trans-btn {
          padding: 3px 5px;
          font-size: 0.6rem;
        }

        .toolbar-admin .toolbar-icon-btn {
          padding: 3px;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 1;
          min-width: 0;
        }

        .toolbar-translation-toggle {
          display: flex;
          background: var(--color-cream-dark, #f0e8e0);
          border-radius: 6px;
          overflow: hidden;
        }

        .toolbar-trans-btn {
          border: none;
          background: none;
          cursor: pointer;
          padding: 4px 6px;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--color-text-light);
          transition: background 0.2s, color 0.2s;
          white-space: nowrap;
        }

        .toolbar-trans-btn.active {
          background: var(--color-burgundy);
          color: var(--color-white);
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
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

        .edit-subtitle-btn {
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.7;
          padding: 0;
          vertical-align: middle;
          color: inherit;
        }
        .edit-subtitle-btn:hover {
          opacity: 1;
        }
        .subtitle-popover {
          text-align: start;
        }
        .subtitle-popover .subtitle-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 12px;
          font-size: 0.85rem;
        }
        .subtitle-popover .subtitle-field input {
          width: 100%;
          box-sizing: border-box;
          padding: 6px 8px;
          border: 1px solid var(--color-cream-dark);
          border-radius: 6px;
          font-size: 0.85rem;
          margin: 0;
        }
        .subtitle-popover .save-time-btn {
          width: 100%;
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
          font-weight: 400;
          color: var(--color-text);
        }

        .verses-container.translation-only {
          text-align: start;
          font-family: Arial, 'Heebo', sans-serif;
          font-weight: 400;
          line-height: 1.8;
        }

        .verses-container:not(.with-translation) .verse {
          display: block;
          margin-bottom: 4px;
        }

        .translation-only .verse {
          display: block;
          margin-bottom: 8px;
        }

        .side-by-side .verse-row {
          display: flex;
          flex-wrap: wrap;
          direction: ltr;
          gap: 16px;
          margin-bottom: 12px;
          align-items: flex-start;
          font-size: 0.85em;
        }

        .side-by-side .verse-row > .loud-label {
          flex-basis: 100%;
        }

        .side-by-side .verse-col {
          flex: 1;
          min-width: 0;
        }

        .side-by-side .verse-col-translation {
          flex: 3;
          text-align: left;
          font-weight: 400;
          line-height: 1.6;
        }

        .side-by-side .verse-col-hebrew {
          flex: 2;
          text-align: right;
          line-height: 2;
        }

        .side-by-side .verse-translation {
          display: inline;
          margin: 0;
        }

        .translation-only .verse-translation {
          display: inline;
          margin: 0;
        }

        .size-icon {
          font-size: 20px;
          color: var(--color-burgundy);
        }

        .toolbar-admin .size-icon {
          font-size: 18px;
        }

        .size-slider {
          -webkit-appearance: none;
          appearance: none;
          flex: 1;
          min-width: 30px;
          max-width: 80px;
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

        .toolbar-admin .size-slider {
          max-width: 70px;
          min-width: 24px;
        }

        .toolbar-admin .size-slider::-webkit-slider-thumb {
          width: 20px;
          height: 20px;
        }

        .toolbar-admin .size-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
        }

        .hint-text {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.9rem;
          font-weight: 400;
          margin-bottom: 20px;
          text-align: center;
        }

        .hint-text:not(.custom-hint) {
          color: var(--color-gold);
        }

        .hint-icon {
          font-size: 20px;
        }

        .hint-area {
          position: relative;
          text-align: center;
          margin-bottom: 20px;
        }
        .hint-area .hint-text {
          margin-bottom: 0;
          padding: 0 28px;
        }
        .custom-hint {
          display: block;
          font-size: 0.9rem;
          font-weight: 400;
        }
        .custom-hint p { margin: 4px 0; }
        .custom-hint a[style] { color: #fff; text-decoration: none; }
        .listen-instructions {
          color: #222;
          font-size: 0.85rem;
          margin-top: 14px;
          text-align: left;
          width: 100%;
          padding: 0 20px;
          box-sizing: border-box;
        }
        .listen-title {
          font-weight: 600;
          margin: 0 0 6px 0;
        }
        .listen-instructions ul {
          margin: 0;
          padding-left: 22px;
        }
        .listen-instructions li {
          margin: 3px 0;
          line-height: 1.4;
        }
        .whats-next-area {
          position: relative;
        }
        .custom-bottom-content h2 {
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--color-burgundy);
          margin: 0 0 8px;
        }
        .custom-bottom-content h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-burgundy);
          margin: 14px 0 4px;
        }
        .custom-bottom-content p {
          font-size: 0.85rem;
          color: var(--color-text);
          margin: 0 0 8px;
          line-height: 1.55;
        }
        .custom-bottom-content a { color: var(--color-burgundy); text-decoration: underline; }
        .custom-bottom-content a[style] { color: #fff; text-decoration: none; }
        .whats-next-credit {
          font-size: 0.75rem;
          color: var(--color-text);
          opacity: 0.5;
          text-align: left;
          margin: 12px 0 0;
        }
        .edit-bottom-hint-btn {
          top: 8px;
          right: 8px;
        }
        .edit-hint-btn {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          opacity: 0.6;
          padding: 4px;
          position: absolute;
          top: 0;
          right: 0;
        }
        .edit-hint-btn:hover { opacity: 1; }
        .tap-hint-editor {
          position: relative;
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          margin-top: 12px;
          text-align: start;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        }
        .tap-hint-editor-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .tap-hint-editor-actions button {
          flex: 1;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 400;
        }
        .tap-hint-editor-actions .save-btn {
          background: var(--color-gold);
          color: #1a1a2e;
        }
        .tap-hint-editor-actions .reset-btn {
          background: #eee;
          color: #555;
        }
        .tap-hint-editor-actions .reset-btn:hover {
          background: #ddd;
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
          font-weight: 400;
          font-size: 0.85em;
        }

        .verse-num {
          color: var(--color-gold);
          font-size: 0.55em;
          font-weight: 700;
          margin-inline-end: 2px;
          user-select: none;
        }

        .word-active {
          background: rgba(232, 190, 80, 0.35);
          border-radius: 3px;
          transition: background 0.3s ease;
        }

        .word[data-word] {
          transition: background 0.3s ease;
          border-radius: 3px;
        }

        .megillah-reader .scroll-text.admin-session .word[data-word] {
          cursor: default;
          -webkit-user-select: none;
          user-select: none;
        }

        @media (hover: hover) and (pointer: fine) {
          .megillah-reader .scroll-text.admin-session.tracking-on .verse {
            cursor: pointer;
          }
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
          margin-bottom: 24px;
          text-align: center;
        }

        .blessing-side-by-side {
          display: flex;
          flex-direction: column;
          gap: 8px;
          direction: ltr;
          text-align: initial;
        }

        .blessing-row {
          display: flex;
          flex-wrap: wrap;
          direction: ltr;
          gap: 16px;
          align-items: flex-start;
          font-size: 0.85em;
        }

        .blessing-row .blessing-col {
          flex: 1;
          min-width: 0;
        }

        .blessing-row .blessing-col-translation {
          flex: 3;
          text-align: left;
          font-weight: 400;
          line-height: 1.6;
        }

        .blessing-row .blessing-col-hebrew {
          flex: 2;
          text-align: right;
          line-height: 2;
          font-weight: 400;
        }

        .blessing-text {
          font-family: Arial, 'Heebo', sans-serif;
          font-weight: 700;
          line-height: 2.4;
        }

        .blessing-unit .blessing-text {
          font-weight: 400;
          font-size: 0.85em;
          line-height: 1.8;
        }

        .blessing-side-by-side .blessing-text {
          font-weight: inherit;
          line-height: inherit;
        }

        .blessing-text p {
          margin-bottom: 6px;
        }

        .blessing-unit {
          margin-bottom: 18px;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(102, 10, 35, 0.1);
        }

        .blessing-unit:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .blessing-translation {
          font-size: 0.95em;
          font-weight: 400;
          color: var(--color-text-light);
          line-height: 1.5;
          direction: ltr;
          text-align: left;
        }

        .blessing-translation p {
          margin-bottom: 6px;
        }

        .blessing-transliteration-row {
          margin-top: -4px;
          margin-bottom: 8px;
        }

        .blessing-transliteration {
          font-size: 0.7em;
          font-style: italic;
          line-height: 1.6;
          color: var(--color-text-light, #555);
          margin-top: 4px;
          direction: ltr;
          text-align: center;
        }

        .blessing-transliteration p {
          margin-bottom: 4px;
        }

        .blessing-response,
        .blessing-response-full {
          text-align: center;
          display: block;
          font-size: 0.65em;
          font-weight: 700;
          color: var(--color-gold);
          background: linear-gradient(135deg, rgba(232, 190, 80, 0.15), rgba(232, 190, 80, 0.25));
          border-radius: 6px;
          padding: 6px 10px;
          margin: 6px 0 12px;
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
          margin-top: 4px;
          line-height: 1;
        }

        .transliteration-box {
          display: block;
          background: rgba(232, 190, 80, 0.1);
          border: 1px solid rgba(232, 190, 80, 0.3);
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 6px;
          font-size: 0.7em;
          font-style: italic;
          font-weight: 400;
          line-height: 1.5;
          color: var(--color-text);
          text-align: left;
        }

        .side-by-side .transliteration-box {
          flex-basis: 100%;
        }

        .bnei-haman {
          display: block;
          text-align: center;
        }

        .haman-son {
          display: inline;
          line-height: 2;
        }

        .haman-verse-group {
          display: block;
        }

        .haman-verse-group .haman-son {
          display: inline;
          margin-inline-end: 6px;
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

        .person-name {
          color: var(--color-text);
        }

        .whats-next {
          background: var(--color-cream, #f9f5f0);
          border-radius: 12px;
          padding: 24px 20px;
          margin: 32px 0 16px;
          text-align: start;
          dir: ltr;
        }

        .whats-next-title {
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--color-burgundy);
          margin: 0 0 8px;
        }

        .whats-next-intro {
          font-size: 0.9rem;
          color: var(--color-text);
          margin: 0 0 16px;
          line-height: 1.5;
        }

        .whats-next-item {
          margin-bottom: 14px;
        }

        .whats-next-item:last-child {
          margin-bottom: 0;
        }

        .whats-next-item h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-burgundy);
          margin: 0 0 4px;
        }

        .whats-next-item p {
          font-size: 0.85rem;
          color: var(--color-text);
          margin: 0;
          line-height: 1.55;
        }

        .whats-next[dir="rtl"] .whats-next-intro { font-size: 1rem; }
        .whats-next[dir="rtl"] .whats-next-item h3 { font-size: 1.05rem; }
        .whats-next[dir="rtl"] .whats-next-item p { font-size: 0.95rem; }
        .custom-bottom-content[dir="rtl"] h3 { font-size: 1.05rem; }
        .custom-bottom-content[dir="rtl"] p { font-size: 0.95rem; }

        .whats-next-happy {
          font-size: 1.1rem;
          font-weight: 900;
          color: var(--color-burgundy);
          text-align: center;
          margin: 18px 0 0;
        }

        .sync-toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--color-burgundy);
          color: var(--color-white);
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 0.85rem;
          z-index: 200;
          box-shadow: 0 4px 16px rgba(102, 10, 35, 0.3);
          animation: toast-in 0.25s ease-out;
          text-align: center;
          max-width: 90vw;
        }

        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
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
          font-weight: 400;
          margin: 0 -16px;
          border-radius: 0 0 12px 12px;
        }

        .session-code {
          background: none;
          border: none;
          color: var(--color-white);
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .qr-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .qr-modal {
          background: white;
          border-radius: 16px;
          padding: 28px 24px 20px;
          max-width: 340px;
          width: 100%;
          text-align: center;
          position: relative;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }

        .qr-close {
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          color: var(--color-text-light);
          cursor: pointer;
          padding: 4px;
        }

        .qr-close:hover {
          color: var(--color-text);
        }

        .qr-img {
          display: block;
          margin: 0 auto 16px;
          border-radius: 8px;
        }

        .qr-url-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-cream, #f9f5f0);
          border: 2px solid var(--color-cream-dark, #e8ddd0);
          border-radius: 8px;
          padding: 8px 12px;
        }

        .qr-url {
          flex: 1;
          font-size: 0.8rem;
          color: var(--color-text);
          word-break: break-all;
          text-align: start;
        }

        .qr-copy-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--color-burgundy);
          color: var(--color-white);
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .qr-copy-btn .material-icons {
          font-size: 16px;
        }

        .qr-copy-btn:hover {
          background: var(--color-burgundy-light);
        }

        .qr-view-follower {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 8px;
          padding: 8px 16px;
          font-size: 0.85rem;
          color: var(--color-burgundy);
          border: 1px solid var(--color-burgundy);
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
        }

        .qr-view-follower:hover {
          background: rgba(102, 10, 35, 0.05);
          text-decoration: none;
        }

        .qr-view-follower .material-icons {
          font-size: 16px;
        }

        .session-role {
          opacity: 0.8;
          font-size: 0.8rem;
          background: none;
          border: none;
          color: inherit;
          font-family: inherit;
          padding: 2px 4px;
        }



        .session-leave {
          background: rgba(255,255,255,0.15);
          color: var(--color-white);
          border: none;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.8rem;
          font-weight: 400;
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

        .side-by-side .illustration,
        .side-by-side .illustration.illustration-he {
          float: none;
          width: 60%;
          max-width: 400px;
          margin: 16px auto;
        }

        .illustration img {
          width: 100%;
          border-radius: 8px;
          display: block;
        }

        .illustration-attribution {
          display: block;
          font-size: 0.65rem;
          text-align: center;
          color: var(--color-text-light);
          margin-top: 3px;
          opacity: 0.75;
          text-decoration: none;
        }

        .illustration-attribution:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .verse-active {
          background: rgba(232, 190, 80, 0.18);
          border-radius: 4px;
          transition: background 0.3s ease;
        }

        .toolbar-icon-btn.tracking-active {
          color: var(--color-burgundy);
        }

        .toolbar-icon-btn.sync-pulse {
          animation: sync-glow 1.2s ease-out;
        }

        @keyframes sync-glow {
          0% { color: var(--color-burgundy); }
          50% { color: rgba(102, 10, 35, 0.7); }
          100% { color: var(--color-burgundy); }
        }

        .tracking-popover {
          background: var(--color-white);
          border-radius: 10px;
          padding: 8px;
          margin-bottom: 10px;
          box-shadow: 0 2px 12px rgba(102, 10, 35, 0.12);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tracking-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--color-text);
          font-size: 0.85rem;
          font-weight: 400;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
          text-align: start;
        }

        .tracking-option:hover {
          background: var(--color-cream-dark);
        }

        .tracking-option.active {
          background: var(--color-burgundy);
          color: var(--color-white);
        }

        .tracking-option .material-icons {
          font-size: 20px;
        }

        .mobile-only { display: inline; }

        @media (min-width: 768px) {
          .mobile-only { display: none; }
          .scroll-text {
            padding: 36px 32px;
          }
        }

        .onboarding-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          pointer-events: none;
        }
        .onboarding-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          pointer-events: auto;
        }
        .onboarding-spotlight {
          position: absolute;
          border-radius: 8px;
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.6);
          z-index: 1;
          pointer-events: auto;
        }
        .onboarding-tooltip {
          position: absolute;
          z-index: 2;
          background: #fff;
          color: #333;
          border-radius: 12px;
          padding: 16px 20px;
          max-width: 320px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.25);
          pointer-events: auto;
          font-size: 0.9rem;
          line-height: 1.5;
          direction: ltr;
          text-align: left;
        }
        .onboarding-tooltip[dir="rtl"] {
          direction: rtl;
          text-align: right;
        }
        .onboarding-tooltip-title {
          font-weight: 700;
          font-size: 1rem;
          margin: 0 0 6px;
          color: var(--color-burgundy);
        }
        .onboarding-tooltip-text {
          margin: 0 0 14px;
        }
        .onboarding-tooltip-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .onboarding-dots {
          display: flex;
          gap: 6px;
        }
        .onboarding-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ccc;
        }
        .onboarding-dot.active {
          background: var(--color-burgundy);
        }
        .onboarding-next-btn {
          background: var(--color-burgundy);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 8px 20px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
        }
        .onboarding-skip-btn {
          background: none;
          border: none;
          color: #999;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 4px 8px;
        }
      `}</style>

      {onboardingStep >= 0 && session?.role && (() => {
        const sensorIcon = <span class="material-icons" style="font-size:16px;vertical-align:middle">sensors</span>;
        const splitAtIcon = (text: string) => {
          const parts = text.split('{icon}');
          if (parts.length === 1) return text;
          return <>{parts[0]}{sensorIcon}{parts[1]}</>;
        };
        const followerSteps = [
          { target: '#sync-follow-btn', title: t.onboardingFollowerAutoScroll, text: t.onboardingFollowerAutoScrollText },
          { target: '#menu-toggle-btn', title: t.onboardingFollowerOptions, text: t.onboardingFollowerOptionsText },
        ];
        const adminSteps = [
          { target: '#tracking-mode-btn', title: t.onboardingAdminTracking, text: t.onboardingAdminTrackingText },
          { target: '#reading-time-btn', title: t.onboardingAdminTime, text: t.onboardingAdminTimeText },
          { target: '#menu-toggle-btn', title: t.onboardingAdminSettings, text: t.onboardingAdminSettingsText },
          ...(lang !== 'he' ? [{ target: '#translation-toggle', title: t.onboardingAdminReadingMode, text: t.onboardingAdminReadingModeText }] : []),
          { target: null, title: t.onboardingAdminAnnouncements, text: t.onboardingAdminAnnouncementsText },
        ];
        const steps = session.role === 'follower' ? followerSteps : session.role === 'admin' ? adminSteps : [];
        if (onboardingStep >= steps.length || steps.length === 0) return null;

        const step = steps[onboardingStep];
        const targetEl = step.target ? document.querySelector(step.target) : null;
        const rect = targetEl?.getBoundingClientRect();
        const pad = 6;

        return (
          <div class="onboarding-overlay">
            {rect ? (
              <div class="onboarding-spotlight" onClick={dismissOnboarding} style={{
                top: `${rect.top - pad}px`,
                left: `${rect.left - pad}px`,
                width: `${rect.width + pad * 2}px`,
                height: `${rect.height + pad * 2}px`,
              }} />
            ) : (
              <div class="onboarding-backdrop" onClick={dismissOnboarding} />
            )}
            <div class="onboarding-tooltip" dir={lang === 'he' ? 'rtl' : 'ltr'} style={(() => {
              if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
              const spaceBelow = window.innerHeight - rect.bottom;
              const placeAbove = spaceBelow < 200 && rect.top > 200;
              // If target is in the top third of the screen, push tooltip to the middle
              // so it doesn't cover the highlighted area
              const topThird = rect.bottom < window.innerHeight * 0.33;
              const tooltipTop = topThird
                ? Math.max(rect.bottom + 12, window.innerHeight * 0.4)
                : rect.bottom + 12;
              return {
                left: `${Math.max(16, Math.min(window.innerWidth / 2 - 160, window.innerWidth - 336))}px`,
                ...(placeAbove
                  ? { bottom: `${window.innerHeight - rect.top + 12}px` }
                  : { top: `${tooltipTop}px` }),
              };
            })()}>
              <p class="onboarding-tooltip-title">{step.title}</p>
              <p class="onboarding-tooltip-text">{step.text}</p>
              <div class="onboarding-tooltip-actions">
                <div class="onboarding-dots">
                  {steps.map((_, i) => (
                    <span class={`onboarding-dot${i === onboardingStep ? ' active' : ''}`} />
                  ))}
                </div>
                <div>
                  {onboardingStep < steps.length - 1 && (
                    <button class="onboarding-skip-btn" onClick={dismissOnboarding}>
                      {t.onboardingSkip}
                    </button>
                  )}
                  <button class="onboarding-next-btn" onClick={() => nextOnboardingStep(steps.length)}>
                    {onboardingStep >= steps.length - 1
                      ? t.onboardingGotIt
                      : t.onboardingNext}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
