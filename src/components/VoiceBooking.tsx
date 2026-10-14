import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
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

export function VoiceBooking({ onResult }: { onResult: (result: ReturnType<typeof parseVoiceBooking>) => void }) {
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
      onResult(result);
      setError(!result.type || !result.amount ? "Betrag oder Buchungsart nicht eindeutig erkannt. Bitte ergänzen." : "");
    };
    r.onerror = (event) => { setListening(false); setError(event.error === "not-allowed" ? "Mikrofonzugriff verweigert. Bitte die Browserfreigabe prüfen." : "Spracherkennung nicht verfügbar. Bitte manuell erfassen."); };
    r.onend = () => setListening(false);
    setError(""); setTranscript("");
    try { r.start(); setListening(true); } catch { setError("Mikrofon konnte nicht gestartet werden."); }
  }
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={!supported} onClick={() => listening ? recognition.current?.stop() : start()} aria-label={listening ? "Sprachaufnahme stoppen" : "Sprachbuchung starten"}>
        {listening ? <Square /> : <Mic />} {listening ? "Aufnahme stoppen" : "Sprachbuchung"}
      </Button>
      {!supported && <p className="text-xs text-muted-foreground">Dieser Browser unterstützt keine Spracherkennung.</p>}
      {supported && <p className="text-xs text-muted-foreground">Spracherkennung durch deinen Browser; Audio kann an dessen Anbieter übertragen werden.</p>}
      {transcript && <p className="text-sm text-foreground">„{transcript}“</p>}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}