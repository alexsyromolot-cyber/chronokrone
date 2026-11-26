/**
 * Deutsche Texte. Deutsch ist die Referenzsprache: Neue Schlüssel entstehen hier,
 * `en.ts` muss dieselben Schlüssel haben (das prüft TypeScript über `Messages`).
 */
export const de = {
  'app.title': 'Chronokrone',
  'app.tagline': 'Ein Meteor. Alberne Aliens. Drei Bauern mit Mistgabeln.',
  'app.milestone': 'Meilenstein 1: Grundgerüst',
  'hud.ticks': 'Logik-Ticks',
  'hud.gold': 'Gold',
  'narrator.boot':
    'Der Erzähler gähnt. „Ah, ein neuer Spieler. Das Spiel ist noch nicht fertig. Ich auch nicht.“',
  'lang.switch': 'English',
} as const;

export type MessageKey = keyof typeof de;
export type Messages = Record<MessageKey, string>;
