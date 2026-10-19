import { useEffect, useRef, useState } from "react";
import { ChevronRight, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseVoiceBooking } from "@/lib/voice-booking";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function VoiceBooking({ onResult, prominent = false, dashboard = false }: { onResult: (result: ReturnType<typeof parseVoiceBooking>) => void; prominent?: boolean; dashboard?: boolean }) {
  const recognition = useRef<Recognition | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  useEffect(() => {
    const w = window as SpeechWindow;
    setSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    return () => { const current = recognition.current; if (current) { current.onresult = null; current.onend = null; current.onerror = null; current.abort(); } };
  }, []);
  function start() {
    const w = window as SpeechWindow;
    const Constructor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Constructor) return;
    const r = new Constructor();
    recognition.current = r;
    r.lang = "de-DE"; r.continuous = false; r.interimResults = false;
    r.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join(" ");
      setTranscript(text);
      const result = parseVoiceBooking(text);
      if (!text.trim()) { setError("Keine Sprache erkannt. Bitte erneut versuchen oder manuell erfassen."); return; }
      onResult(result);
      setError(!result.type || !result.amount ? "Betrag oder Buchungsart nicht eindeutig erkannt. Bitte ergänzen." : "");
    };
    let receivedResult = false;
    const handleResult = r.onresult;
    r.onresult = (event) => { receivedResult = true; handleResult?.(event); };
    r.onerror = (event) => {
      receivedResult = true;
      setListening(false);
      const messages: Record<string, string> = {
        "not-allowed": "Mikrofonzugriff verweigert. Bitte Mikrofon in den Website-Einstellungen deines Browsers erlauben.",
        "service-not-allowed": "Dein Browser erlaubt die Spracherkennung nicht. Bitte einen unterstützten Browser verwenden oder manuell erfassen.",
        "audio-capture": "Kein Mikrofon verfügbar. Bitte Anschluss und Mikrofonfreigabe prüfen.",
        "no-speech": "Keine Sprache erkannt. Bitte erneut versuchen oder manuell erfassen.",
        network: "Spracherkennung konnte keine Verbindung herstellen. Bitte Internetverbindung prüfen oder manuell erfassen.",
        aborted: "Sprachaufnahme abgebrochen. Du kannst erneut starten oder manuell erfassen.",
      };
      setError(messages[event.error] ?? "Spracherkennung nicht verfügbar. Bitte erneut versuchen oder manuell erfassen.");
    };
    r.onend = () => { setListening(false); if (!receivedResult) setError("Keine Sprache erkannt. Bitte erneut versuchen oder manuell erfassen."); };
    setError(""); setTranscript("");
    try { r.start(); setListening(true); } catch { setError("Mikrofon konnte nicht gestartet werden."); }
  }
  return (
    <div className={`space-y-2 ${dashboard ? "dash-voice-card" : prominent ? "w-full sm:w-64" : ""}`}>
      <Button type="button" variant={dashboard ? "ghost" : prominent ? "default" : "outline"} className={dashboard ? "dash-voice-button" : prominent ? "min-h-14 w-full whitespace-normal rounded-xl px-4 text-base [&_svg]:size-6" : ""} disabled={!supported} onClick={() => listening ? recognition.current?.stop() : start()} aria-label={listening ? "Sprachaufnahme stoppen" : dashboard ? "Buchung per Sprache erfassen" : prominent ? "Buchung erfassen" : "Sprachbuchung starten"} aria-pressed={listening}>
        {dashboard ? <><span className="dash-microphone">{listening ? <Square /> : <Mic />}</span><span className="dash-voice-copy"><strong>{listening ? "Aufnahme stoppen" : "Buchung per Sprache erfassen"}</strong><span>Buchungsdaten erkennen und prüfen</span></span><span className={`dash-waveform ${listening ? "is-listening" : ""}`} aria-hidden="true">{[0,1,2,3,4,5,6].map(i => <i key={i} />)}</span><span className="dash-voice-arrow"><ChevronRight /></span></> : <>{listening ? <Square /> : <Mic />} {listening ? "Aufnahme stoppen" : prominent ? "Buchung erfassen" : "Sprachbuchung"}</>}
      </Button>
      {!supported && <p className="text-xs text-muted-foreground">Dieser Browser unterstützt keine Spracherkennung.</p>}
      {supported && !dashboard && <p className="text-xs text-muted-foreground" role="status">{listening ? "Mikrofon aktiv – bitte Buchung sprechen." : "Spracherkennung durch deinen Browser; Audio kann an dessen Anbieter übertragen werden."}</p>}
      {supported && dashboard && listening && <p className="text-xs text-muted-foreground" role="status">Mikrofon aktiv – bitte Buchung sprechen.</p>}
      {transcript && <p className="text-sm text-foreground">„{transcript}“</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}