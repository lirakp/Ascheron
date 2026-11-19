// Erinnerungs-Dungeons: Jede Schleife ist die Erinnerung eines Menschen, der der Fee etwas bezahlt hat.
import type { Appearance } from './types';

export interface Ghost { name: string; app: Partial<Appearance>; dx: number; dy: number; line: string }
export interface LoopDef {
  title: string;
  kind: 'aktiv' | 'inaktiv';
  intro: string;
  ghosts: Ghost[];
  turn: string[]; // Sätze, während die Szene kippt
  anchor?: { name: string; hint: string; dx: number; dy: number };
  clue: string; // Hinweis fürs Endrätsel
  calm: string; // Text, wenn die Schleife gelöst ist
}
export interface MemoryStory {
  id: string;
  owner: string;
  dungeonName: string;
  loops: LoopDef[];
  question: string;
  options: string[];
  answer: number;
  ending: string[];
}

const W = (o: Partial<Appearance>): Partial<Appearance> => o;

export const MEMORIES: MemoryStory[] = [
  {
    id: 'joran', owner: 'Joran, der Fischer', dungeonName: 'Die stille Fischerhütte',
    loops: [
      {
        title: 'Die Hochzeit am Steg', kind: 'inaktiv',
        intro: 'Lampions über dem Wasser. Eine Hochzeit am Steg, Fiedeln, Gelächter. Der Bräutigam hält die Hand einer Frau in Weiß.',
        ghosts: [
          { name: 'Joran', app: W({ gender: 'm', hair: '#3b2a1c', beard: 'kurz', cloth: '#3a4a6a' }), dx: -1, dy: 0, line: '„Sieh mich an, Ilse. Nur einmal noch.“' },
          { name: 'Ilse', app: W({ gender: 'w', hair: '#d8c8a0', hairStyle: 'lang', outfit: 'rock', cloth: '#e8e4dc' }), dx: 1, dy: 0, line: '…' },
          { name: 'Gast', app: W({ gender: 'm', hair: '#6a4426', cloth: '#5a4a3a' }), dx: -3, dy: 2, line: '„Auf das Brautpaar!“' },
          { name: 'Gast', app: W({ gender: 'w', hair: '#1e1612', hairStyle: 'dutt', outfit: 'rock', cloth: '#6a3a2a' }), dx: 3, dy: 2, line: '„Wie schön sie aussieht!“' },
        ],
        turn: ['Die Musik wird schneller. Zu schnell.', 'Die Gäste lachen weiter, während das Wasser über den Steg steigt.', 'Jemand schreit. Niemand hört auf zu tanzen.'],
        clue: 'Die Braut hat kein Gesicht. Wo es sein sollte, ist nur Nebel – und Joran sieht sie trotzdem unverwandt an.',
        calm: 'Die Musik verklingt. Die Gäste lösen sich auf wie Atem in der Kälte.',
      },
      {
        title: 'Der Sturm', kind: 'aktiv',
        intro: 'Ein Boot in schwerer See. Joran klammert sich an das Ruder, ein Kind schreit nach seiner Mutter.',
        ghosts: [
          { name: 'Joran', app: W({ gender: 'm', hair: '#3b2a1c', beard: 'kurz', cloth: '#3a4a6a' }), dx: 0, dy: 0, line: '„Halt dich fest! Wir finden den Weg!“' },
          { name: 'Kind', app: W({ gender: 'w', hair: '#d8c8a0', hairStyle: 'zopf', build: 'schmal', cloth: '#a83a2a' }), dx: 2, dy: 1, line: '„Papa, wie sah Mama aus? Ich weiß es nicht mehr!“' },
        ],
        turn: ['Die Wellen werden rot.', 'Das Boot zerbricht Planke für Planke.', 'Das Kind rutscht über die Reling.'],
        anchor: { name: 'Sturmlaterne', hint: 'Eine Laterne liegt erloschen im Boot. Vielleicht zeigt ihr Licht den Weg.', dx: -2, dy: -1 },
        clue: 'In der Kajüte hängt ein Bild von Jorans Frau. Das Gesicht darauf ist leer, als hätte jemand es weggewischt.',
        calm: 'Die Laterne brennt. Das Meer beruhigt sich, das Kind schläft in Jorans Arm.',
      },
      {
        title: 'Das leere Haus', kind: 'inaktiv',
        intro: 'Eine Hütte voller Bilder. Joran malt, Tag für Tag, dieselbe Frau.',
        ghosts: [
          { name: 'Joran', app: W({ gender: 'm', hair: '#8a8a8a', beard: 'lang', cloth: '#3a4a6a' }), dx: 0, dy: 0, line: '„Ich weiß, dass ich sie geliebt habe. Ich weiß nur nicht mehr, wie sie aussah.“' },
          { name: 'Tochter', app: W({ gender: 'w', hair: '#d8c8a0', hairStyle: 'lang', outfit: 'rock', cloth: '#a83a2a' }), dx: 2, dy: 1, line: '„Hör auf, Vater. Bitte.“' },
        ],
        turn: ['Die Bilder an den Wänden beginnen zu bluten.', 'Joran malt schneller, schneller, mit den Fingern.', 'Alle Gesichter auf allen Bildern sind leer.'],
        clue: 'Hunderte Bilder, alle von derselben Frau – und auf keinem hat sie ein Gesicht. Joran hat es der Fee gegeben, um seine Tochter aus dem Sturm zu holen.',
        calm: 'Joran legt den Pinsel weg. Zum ersten Mal weint er.',
      },
    ],
    question: 'Ein Spiegel ohne Glas. Darüber eingeritzt: „Was hat Joran der Fee gegeben?“',
    options: ['Seine Stimme', 'Das Gesicht seiner Frau', 'Den Namen seiner Tochter', 'Den Weg nach Hause'],
    answer: 1,
    ending: ['Im Spiegel erscheint, für einen Atemzug, das Gesicht einer lächelnden Frau.', 'Irgendwo in Krähenfurt erinnert sich ein alter Fischer an etwas – und weiß nicht, warum er weint.'],
  },
  {
    id: 'merle', owner: 'Merle, die Söldnerin', dungeonName: 'Die vergessene Kaserne',
    loops: [
      {
        title: 'Die Nacht vor der Schlacht', kind: 'inaktiv',
        intro: 'Eine Kaserne bei Kerzenlicht. Junge Soldaten zittern auf ihren Pritschen. Eine Frau singt.',
        ghosts: [
          { name: 'Merle', app: W({ gender: 'w', hair: '#a8522a', hairStyle: 'kurz', build: 'kraeftig', cloth: '#6c6f78' }), dx: 0, dy: 0, line: '„Singt mit! Morgen sind wir Helden!“' },
          { name: 'Rekrut', app: W({ gender: 'm', hair: '#d8b060', build: 'schmal', cloth: '#5a4a3a' }), dx: -2, dy: 1, line: '„Hast du denn keine Angst?“' },
          { name: 'Rekrutin', app: W({ gender: 'w', hair: '#1e1612', hairStyle: 'zopf', cloth: '#5a4a3a' }), dx: 2, dy: 1, line: '„Ich will nach Hause.“' },
        ],
        turn: ['Die Kerzen brennen schwarz.', 'Die Rekruten verwandeln sich, einer nach dem anderen, in das, was sie morgen sein werden.', 'Merle singt weiter.'],
        clue: 'Alle zittern. Nur Merle singt – und sie versteht nicht, warum die anderen weinen.',
        calm: 'Das Lied endet. Die Kerzen erlöschen sanft.',
      },
      {
        title: 'Die Schlacht am Furt', kind: 'aktiv',
        intro: 'Schlamm, Schreie, ein zerrissenes Banner. Merle steht mitten im Getümmel und lacht.',
        ghosts: [
          { name: 'Merle', app: W({ gender: 'w', hair: '#a8522a', hairStyle: 'kurz', build: 'kraeftig', cloth: '#6c6f78' }), dx: 0, dy: 0, line: '„Weiter! Weiter!“' },
          { name: 'Bruder', app: W({ gender: 'm', hair: '#a8522a', beard: 'stoppel', cloth: '#6c6f78' }), dx: 2, dy: 0, line: '„Merle, wir müssen zurück! Merle!“' },
        ],
        turn: ['Der Fluss färbt sich rot.', 'Ihr Bruder fällt, und Merle stürmt an ihm vorbei.', 'Das Banner sinkt in den Schlamm.'],
        anchor: { name: 'Zerrissenes Banner', hint: 'Das Banner sinkt. Wenn es jemand aufrichtet, sammeln sich die Überlebenden.', dx: -2, dy: 1 },
        clue: 'Merle stürmt lachend weiter, während um sie herum alle fliehen. Sie hat nicht einmal gezögert, als ihr Bruder fiel.',
        calm: 'Das Banner steht. Die Überlebenden sammeln sich. Merle bleibt stehen und sieht zurück.',
      },
      {
        title: 'Das Grab', kind: 'inaktiv',
        intro: 'Ein frisches Grab am Waldrand. Trauernde. Merle steht abseits, die Hände im Mantel.',
        ghosts: [
          { name: 'Merle', app: W({ gender: 'w', hair: '#8a8a8a', hairStyle: 'kurz', build: 'kraeftig', cloth: '#2a2a2a' }), dx: 0, dy: 0, line: '„Warum weint ihr alle? Er war tapfer.“' },
          { name: 'Mutter', app: W({ gender: 'w', hair: '#8a8a8a', hairStyle: 'dutt', outfit: 'robe', cloth: '#2a2a2a' }), dx: 2, dy: 0, line: '„Was ist nur aus dir geworden, Kind?“' },
        ],
        turn: ['Die Erde auf dem Grab bewegt sich.', 'Die Trauernden drehen sich zu Merle um, alle zugleich.', 'Sie haben keine Augen mehr.'],
        clue: 'Am Grab ihres Bruders spürt Merle nichts. Vor Jahren hat sie die Fee um Mut gebeten – und dafür etwas anderes vergessen.',
        calm: 'Die Trauernden gehen. Merle bleibt allein, und zum ersten Mal zittern ihre Hände.',
      },
    ],
    question: 'Eine eiserne Tür. Darauf: „Was hat Merle der Fee gegeben?“',
    options: ['Ihr Schwert', 'Ihren Bruder', 'Ihre Angst', 'Ihre Heimat'],
    answer: 2,
    ending: ['Die Tür öffnet sich mit einem Geräusch wie ein Seufzer.', 'Irgendwo in Kaldrion wacht eine alte Söldnerin auf und fürchtet sich zum ersten Mal seit vierzig Jahren vor der Dunkelheit. Sie ist dankbar dafür.'],
  },
  {
    id: 'tessel', owner: 'Tessel, der Waisenjunge', dungeonName: 'Der verlassene Brunnenhof',
    loops: [
      {
        title: 'Der Markt', kind: 'aktiv',
        intro: 'Ein Marktplatz im Frostmond. Ein Junge zerrt eine blasse Frau durch die Menge zum Heiler.',
        ghosts: [
          { name: 'Tessel', app: W({ gender: 'm', hair: '#6a4426', build: 'schmal', cloth: '#5a4a3a' }), dx: 0, dy: 0, line: '„Mama, nur noch ein Stück!“' },
          { name: 'Mutter', app: W({ gender: 'w', hair: '#6a4426', hairStyle: 'lang', outfit: 'rock', cloth: '#8a7a5a' }), dx: 1, dy: 0, line: '„Lass mich ausruhen, mein Kleiner…“' },
          { name: 'Händler', app: W({ gender: 'm', hair: '#3b2a1c', beard: 'lang', build: 'kraeftig', cloth: '#a83a2a' }), dx: -3, dy: 1, line: '„Kein Geld, kein Heiler!“' },
        ],
        turn: ['Die Mutter bricht zusammen.', 'Die Menge läuft weiter, über sie hinweg.', 'Der Schnee wird rot.'],
        anchor: { name: 'Brotlaib', hint: 'Ein Brotlaib liegt im Schnee. Hunger macht sie schwach – vielleicht reicht er, bis sie beim Heiler sind.', dx: 3, dy: -1 },
        clue: 'Niemand auf dem Markt erkennt die kranke Frau, obwohl sie hier ihr Leben lang Brot verkauft hat.',
        calm: 'Die Mutter isst, langsam. Die Menge macht Platz.',
      },
      {
        title: 'Das Krankenbett', kind: 'inaktiv',
        intro: 'Eine kalte Kammer. Die Mutter im Fieber. Tessel hält ihre Hand und flüstert mit jemandem, den man nicht sieht.',
        ghosts: [
          { name: 'Tessel', app: W({ gender: 'm', hair: '#6a4426', build: 'schmal', cloth: '#5a4a3a' }), dx: -1, dy: 0, line: '„Ja. Ja, ich gebe es dir. Mach sie nur gesund.“' },
          { name: 'Mutter', app: W({ gender: 'w', hair: '#6a4426', hairStyle: 'lang', outfit: 'robe', cloth: '#d8d0b8' }), dx: 1, dy: 0, line: '„…“' },
        ],
        turn: ['Das Fieber wird schlimmer, viel zu schnell.', 'Etwas Kleines, Leuchtendes schwebt über dem Bett.', 'Tessel hört auf zu atmen, während die Mutter die Augen öffnet.'],
        clue: 'Die Mutter erwacht gesund – und fragt den Jungen an ihrem Bett höflich, wer er ist.',
        calm: 'Die Kammer wird warm. Das Licht über dem Bett erlischt.',
      },
      {
        title: 'Am Brunnen', kind: 'aktiv',
        intro: 'Der Brunnenhof. Tessel steht am Rand des Brunnens, die Mutter geht an ihm vorbei.',
        ghosts: [
          { name: 'Tessel', app: W({ gender: 'm', hair: '#6a4426', build: 'schmal', cloth: '#5a4a3a' }), dx: 0, dy: 0, line: '„Mama? Mama, ich bin es!“' },
          { name: 'Frau', app: W({ gender: 'w', hair: '#6a4426', hairStyle: 'lang', outfit: 'rock', cloth: '#8a7a5a' }), dx: 2, dy: 0, line: '„Verzeihung, kennen wir uns? Geh nach Hause, Junge, es wird kalt.“' },
        ],
        turn: ['Tessel klettert auf den Brunnenrand.', 'Das Wasser unten ist schwarz und sehr tief.', 'Er lässt los.'],
        anchor: { name: 'Brunnenseil', hint: 'Ein Seil hängt über dem Brunnen. Wer es hält, kann jemanden zurückziehen.', dx: -2, dy: 0 },
        clue: 'Die Fee hat die Mutter gerettet. Seitdem weiß sie nicht mehr, dass sie einen Sohn hat. Die Welt vergisst den Geretteten – oder den, der bezahlt.',
        calm: 'Das Seil hält. Tessel sitzt im Schnee und lebt. Die Frau ist längst weitergegangen.',
      },
    ],
    question: 'Ein zugeschütteter Brunnen. In den Stein geritzt: „Was hat Tessel der Fee gegeben?“',
    options: ['Seine Gesundheit', 'Sein Zuhause', 'Seine Stimme', 'Dass seine Mutter ihn kennt'],
    answer: 3,
    ending: ['Aus dem Brunnen steigt der Geruch von frischem Brot.', 'Im Waisenhaus von Krähenfurt sitzt eine alte Bäckerin am Bett eines Kindes und weiß nicht, warum sie jeden Frostmond hierherkommt.'],
  },
];

export const MEMORY_CODEX = [
  'Erinnerungs-Dungeons entstehen aus Erinnerungen, die die Fee gesammelt hat. Jede Schleife darin ist die Erinnerung eines Menschen, der ihr etwas bezahlt hat.',
  'Sie tarnen sich von außen als Rang D oder C, sind aber immer Rang A bis SS. Anfänger gehen hinein, sterben – und der Dungeon bleibt ungelöst. Darum sind sie die häufigste Ursache für Blutmonde.',
  'Aktive Schleife: Der Druck steigt sofort stark, die Szene kippt langsam. Der Trupp muss eingreifen – den Anker der Szene finden.',
  'Inaktive Schleife: Der Druck steigt langsam, die Szene kippt schnell in ein langes Massaker. Der Trupp darf nicht eingreifen und muss regungslos zusehen.',
  'Störenfried-Bruch: Wer schreit, ohnmächtig wird oder eine Regel bricht, löst einen Schrei aus, der alle lähmt. Der Störenfried stirbt fast immer oder wird Teil der Szene. Ein Kleriker kann ihn mit Stille zum Schweigen bringen, bevor es so weit ist.',
  'Am Ende wartet immer ein Rätsel. Die Hinweise liegen in den Schleifen – wer Räume auslässt, muss zurück.',
];
