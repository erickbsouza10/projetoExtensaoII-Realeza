import menuSom from "../assets/menu.mp3";

// Keep the sound outside page components so navigation does not interrupt it.
const audioMenu = new Audio(menuSom);
audioMenu.preload = "auto";
audioMenu.volume = 0.5;
audioMenu.load();

let contexto: AudioContext | null = null;
let bufferMenu: AudioBuffer | null = null;
let inicioSom = 0;
let fonteAtual: AudioBufferSourceNode | null = null;

try {
  contexto = new AudioContext({ latencyHint: "interactive" });
  const contextoAudio = contexto;
  void fetch(menuSom)
    .then((response) => {
      if (!response.ok) throw new Error("Menu audio unavailable");
      return response.arrayBuffer();
    })
    .then((data) => contextoAudio.decodeAudioData(data))
    .then((buffer) => {
      // Skip leading silence so the audible feedback starts with the click.
      let primeiroSample = buffer.length;
      for (let canal = 0; canal < buffer.numberOfChannels; canal++) {
        const samples = buffer.getChannelData(canal);
        const inicio = samples.findIndex((sample) => Math.abs(sample) > 0.001);
        if (inicio >= 0) primeiroSample = Math.min(primeiroSample, inicio);
      }
      inicioSom = primeiroSample < buffer.length ? primeiroSample / buffer.sampleRate : 0;
      bufferMenu = buffer;
    })
    .catch(() => {});
} catch {
  // Keep HTML audio available when Web Audio is unsupported.
}

export function tocarSomMenu() {
  try {
    if (contexto) {
      if (contexto.state === "suspended") void contexto.resume().catch(() => {});
      if (bufferMenu && contexto.state !== "closed") {
        audioMenu.pause();
        fonteAtual?.stop();
        const fonte = contexto.createBufferSource();
        const volume = contexto.createGain();
        fonte.buffer = bufferMenu;
        volume.gain.value = 0.5;
        fonte.connect(volume);
        volume.connect(contexto.destination);
        fonte.onended = () => {
          fonte.disconnect();
          volume.disconnect();
          if (fonteAtual === fonte) fonteAtual = null;
        };
        fonteAtual = fonte;
        fonte.start(0, inicioSom);
        return;
      }
    }
    audioMenu.currentTime = 0;
    void audioMenu.play().catch(() => {});
  } catch {
    // Audio availability must not block a menu action.
  }
}
