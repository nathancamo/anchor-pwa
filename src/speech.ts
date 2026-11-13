interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechSupported(): boolean {
  return getSpeechCtor() !== null;
}

export function startVoiceDictation(callbacks: {
  onTranscript: (text: string) => void;
  onError: (msg: string) => void;
  onEnd: () => void;
}): (() => void) | null {
  const Ctor = getSpeechCtor();
  if (!Ctor) {
    callbacks.onError('Voice dictation is not supported in this browser.');
    callbacks.onEnd();
    return null;
  }

  const rec = new Ctor();
  rec.lang = 'en-AU';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  rec.onresult = (event) => {
    const first = event.results?.[0]?.[0]?.transcript;
    if (first) {
      callbacks.onTranscript(first.trim());
    }
  };

  rec.onerror = (event) => {
    const msg =
      event.error === 'not-allowed'
        ? 'Microphone access was denied.'
        : 'Could not hear clearly — try typing or tapping mic again.';
    callbacks.onError(msg);
  };

  rec.onend = () => {
    callbacks.onEnd();
  };

  try {
    rec.start();
  } catch {
    callbacks.onError('Could not start voice dictation.');
    callbacks.onEnd();
    return null;
  }

  return () => {
    try {
      rec.stop();
    } catch {
      // Ignore
    }
  };
}
