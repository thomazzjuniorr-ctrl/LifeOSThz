function getRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function humanizeVoiceError(code = "") {
  const map = {
    "audio-capture": "O navegador nao conseguiu acessar o microfone.",
    "not-allowed": "Permissao de microfone negada.",
    "service-not-allowed": "O servico de voz nao foi liberado neste navegador.",
    "no-speech": "Nenhuma fala detectada. Tente novamente.",
    aborted: "Captura por voz interrompida.",
    network: "Falha de rede durante a transcricao.",
  };

  return map[code] || "Falha ao capturar voz neste navegador.";
}

export function getVoiceCaptureSupport() {
  const ctor = typeof window !== "undefined" ? getRecognitionCtor() : null;
  return {
    supported: Boolean(ctor),
    mode: ctor ? "native-browser" : "manual-fallback",
  };
}

export function createVoiceRecognizer({
  lang = "pt-BR",
  onStart = () => {},
  onEnd = () => {},
  onError = () => {},
  onResult = () => {},
} = {}) {
  const RecognitionCtor = getRecognitionCtor();

  if (!RecognitionCtor) {
    throw new Error("Reconhecimento de voz nao disponivel neste navegador.");
  }

  const recognition = new RecognitionCtor();
  recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finalTranscript = "";

  recognition.onstart = () => onStart();
  recognition.onend = () => onEnd(finalTranscript.trim());
  recognition.onerror = (event) => onError(humanizeVoiceError(event?.error), event);
  recognition.onresult = (event) => {
    let interimTranscript = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = result?.[0]?.transcript?.trim() || "";

      if (!text) {
        continue;
      }

      if (result.isFinal) {
        finalTranscript = `${finalTranscript} ${text}`.trim();
      } else {
        interimTranscript = `${interimTranscript} ${text}`.trim();
      }
    }

    onResult({
      transcript: finalTranscript.trim(),
      interim: interimTranscript.trim(),
      finalText: `${finalTranscript} ${interimTranscript}`.trim(),
      isFinal: !interimTranscript && Boolean(finalTranscript),
    });
  };

  return {
    start() {
      recognition.start();
    },
    stop() {
      recognition.stop();
    },
    abort() {
      recognition.abort();
    },
  };
}
