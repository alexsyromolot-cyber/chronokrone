/**
 * Logische Auflösung des Schlachtfelds: Alle Spielkoordinaten (Logik, Klicks, Effekte) leben
 * in 320×180. Gezeichnet wird intern in doppelter Auflösung (640×360): Die neuen 32×32-Figuren
 * liegen mit Faktor ½ in der doppelt skalierten Welt – ein Bildpixel = ein Leinwandpixel.
 * So bleibt die Logik unverändert und die Grafik wird doppelt so detailliert.
 */
export const VIEW_W = 320;
export const VIEW_H = 180;
export const RENDER_SCALE = 2;
export const RENDER_W = VIEW_W * RENDER_SCALE;
export const RENDER_H = VIEW_H * RENDER_SCALE;
