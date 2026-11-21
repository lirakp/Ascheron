// Die Reiche von Ascheron: Gebiete mit eigener Karte, Stadt, Gegnern, Wegen und Stimmung.
import type { Rank } from './types';

export type RegionId = 'rabenmark' | 'schlackenhafen' | 'aurelsfeste' | 'kaldrion' | 'veyrath' | 'eschenwacht' | 'nachtkluefte' | 'erstarrt' | 'dornenreich';

export interface RegionDef {
  id: RegionId;
  name: string;
  rank: Rank;
  desc: string;
  bg: string; // Kampfhintergrund
  light: 'normal' | 'dunkel' | 'grau' | 'asche';
  timeStill?: boolean; // Erstarrte Lande: Zeit steht still
  roamers: [string, number][];
  roamerCount: number;
  herb: string;
  npcs: [string, string][];
  travelDays: number;
}

export const REGIONS: Record<RegionId, RegionDef> = {
  rabenmark: {
    id: 'rabenmark', name: 'Rabenmark', rank: 'D', bg: 'moor', light: 'normal', herb: 'moorkraut', travelDays: 1,
    desc: 'Armes Grenzkönigreich aus Mooren und Küste – mit den meisten Dungeons des Kontinents.',
    roamers: [['aschhund', 6], ['bandit', 1]], roamerCount: 7, npcs: [],
  },
  schlackenhafen: {
    id: 'schlackenhafen', name: 'Schlackenhafen', rank: 'C', bg: 'moor', light: 'dunkel', herb: 'moorkraut', travelDays: 0.5,
    desc: 'Ein Hafen aus Teer, Schlacke und Schweigen. Hochburg der Rostigen Münze.',
    roamers: [['bandit', 3], ['kanalwuerger', 1]], roamerCount: 4,
    npcs: [
      ['Hafenarbeiter', 'Frag nicht, was in den Kisten ist. Frag nicht, wer in den Käfigen ist. In Schlackenhafen fragt man nicht.'],
      ['Schmugglerin', 'Die Münze zahlt besser als die Gilde. Und sie nimmt keine Blutsteuer. Nur manchmal Blut.'],
      ['Alter Kapitän', 'Früher fuhren von hier Schiffe nach Veyrath. Heute fahren sie nachts, ohne Licht, und keiner fragt, wohin.'],
      ['Kind', 'Meine Mama sagt, die Kirche reinigt die Klingen, die wir hier verkaufen. Ist das nicht verboten?'],
    ],
  },
  aurelsfeste: {
    id: 'aurelsfeste', name: 'Aurelsfeste', rank: 'C', bg: 'holy', light: 'normal', herb: 'moorkraut', travelDays: 1,
    desc: 'Der Kirchenstaat des Sanktuariums. Weizenfelder, Pilgerwege und die Kathedralenstadt Lumenhall.',
    roamers: [['bandit', 4], ['hohlmann', 1]], roamerCount: 6,
    npcs: [
      ['Pilgerin', 'Aurelion schenkt uns die Magie. Ich bin dreihundert Meilen gelaufen, um in Lumenhall zu beten.'],
      ['Novize', 'Hinter der Kathedrale liegen die Katakomben. Wir dürfen nicht hinunter. Manchmal hört man von dort unten Singen.'],
      ['Inquisitor im Ruhestand', 'Dunkelelfen? Gottlose. Halbwesen? Nützlich. So steht es in der Lehre. Ich habe aufgehört, die Lehre zu lesen.'],
      ['Gildenschreiber', 'Hier ist die Zentrale der Abenteurergilde. Jede Plakette des Kontinents steht in unseren Büchern.'],
      ['Bäuerin', 'Seit die Kirche die Krater läutert, wächst der Weizen wieder. Sie lässt es sich teuer bezahlen.'],
    ],
  },
  kaldrion: {
    id: 'kaldrion', name: 'Kaldrion', rank: 'C', bg: 'snow', light: 'normal', herb: 'moorkraut', travelDays: 1,
    desc: 'Bergkönigreich der Minen. Die Hauptstadt Frosthald und Eisenherz, die Binge der freien Zwerge.',
    roamers: [['frostwolf', 5], ['bandit', 1], ['runenwaechter', 1]], roamerCount: 7,
    npcs: [
      ['Bergmann', 'Die alten Stollen im Osten sind verlassen. Nur die Runenwächter graben noch – nach nichts.'],
      ['Zwergenschmiedin', 'In Eisenherz schmieden wir bis Rang B. Mehr kann ehrlicher Stahl nicht. Mehr will ehrlicher Stahl nicht.'],
      ['Soldat', 'Unter Kaldrion liegen die Nachtklüfte. Die Höhle im Norden führt hinunter. Leergejagt, sagen sie. Nicht ganz.'],
      ['Händler', 'Hinter den östlichen Pässen beginnen die Erstarrten Lande. Kein Wind, kein Verfall. Ich verkaufe dort nichts.'],
    ],
  },
  veyrath: {
    id: 'veyrath', name: 'Veyrath', rank: 'B', bg: 'desert', light: 'normal', herb: 'moorkraut', travelDays: 1,
    desc: 'Das reiche Handelskönigreich im Süden. Goldwacht, Sitz des Konsortiums – und der größte Sklavenmarkt des Kontinents.',
    roamers: [['duenenskorpion', 4], ['sklavenjaeger', 2], ['bandit', 2]], roamerCount: 7,
    npcs: [
      ['Wechsler', 'Zwei vom Hundert bei jedem Wechsel. Klingt wenig. Auf einem Kontinent zahlt jeder, jeden Tag.'],
      ['Freigekaufte Elfe', 'Ich habe vier Jahre in einem Haus gedient, bis jemand meine Freiheit gekauft hat. Ich weiß nicht einmal, wer.'],
      ['Konsortialrat', 'Wer sich mit dem Konsortium anlegt, steht auf der Schwarzen Liste. Dann verkauft ihm niemand mehr ein Brot.'],
      ['Karawanenführerin', 'Die Dünenskorpione graben sich ein und warten. Wer im Sand stehen bleibt, ist Futter.'],
    ],
  },
  eschenwacht: {
    id: 'eschenwacht', name: 'Eschenwacht', rank: 'B', bg: 'forest', light: 'normal', herb: 'moorkraut', travelDays: 1,
    desc: 'Waldkönigreich auf gerodetem Elfenland. Die Grenzfestung Dornwall – und die Elfenjagd als Gewerbe.',
    roamers: [['elfenjaeger', 3], ['rankenweber', 2], ['aschhund', 2]], roamerCount: 7,
    npcs: [
      ['Jäger', 'Zehn Gold für ein Paar Elfenohren. Fünfzig für eine lebende Elfe. Das ist kein Mord, das ist Handel.'],
      ['Holzfällerin', 'Früher war hier alles Elfenwald. Wir fällen die Bäume, sie wachsen nach. Die Elfen nicht.'],
      ['Grenzwächter', 'Östlich der Festung liegt das Aschfeld. Die Verlorene Königin. Niemand greift an, bevor die Frist abgelaufen ist.'],
      ['Alter Elf', 'Bleib leise, Fremder. Ich bin zu alt, um wegzulaufen, und zu wenig wert, um gejagt zu werden.'],
    ],
  },
  nachtkluefte: {
    id: 'nachtkluefte', name: 'Die Nachtklüfte', rank: 'A', bg: 'cave', light: 'dunkel', herb: 'moorkraut', travelDays: 1,
    desc: 'Verlassene Höhlenstädte unter Kaldrion und Eschenwacht. Einst die Heimat der Dunkelelfen, fast leergejagt.',
    roamers: [['schattenlauerer', 4], ['blindwurm', 2]], roamerCount: 6, npcs: [],
  },
  erstarrt: {
    id: 'erstarrt', name: 'Die Erstarrten Lande', rank: 'A', bg: 'frozen', light: 'grau', timeStill: true, herb: 'moorkraut', travelDays: 1,
    desc: 'Die Reste des Königreichs Valmor, verschlungen vom König der Ewigkeit. Zeit steht still, kein Wind, kein Verfall.',
    roamers: [['zeitmotte', 6], ['erstarrter_ritter', 2]], roamerCount: 8, npcs: [],
  },
  dornenreich: {
    id: 'dornenreich', name: 'Das Eiserne Dornenreich', rank: 'S', bg: 'ash', light: 'asche', herb: 'moorkraut', travelDays: 1,
    desc: 'Vor zwei Jahren auf dem Aschfeld aus dem Boden gestampft. Die Verlorene Königin rüstet – die Frist läuft bis 139 n. S.',
    roamers: [], roamerCount: 0,
    npcs: [
      ['Dornsoldat', 'Halt. Die Frist läuft. Wer der Königin vorher schadet, den verschlingt die Prinzessin der Dornen. Geh weiter, Mensch.'],
      ['Rekrutin', 'Wir räumen die Dorn-Dungeons selbst. Jeden Monat werden wir stärker. Euer Kontinent sieht nur zu.'],
      ['Waffenschmied', 'Rohlinge aus den Dorn-Gärten. Maximale Qualität. Für das Heer – nicht für dich.'],
    ],
  },
};

export const REGION_ORDER: RegionId[] = ['rabenmark', 'schlackenhafen', 'aurelsfeste', 'kaldrion', 'veyrath', 'eschenwacht', 'nachtkluefte', 'erstarrt', 'dornenreich'];
