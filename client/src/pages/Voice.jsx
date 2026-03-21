import { useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";

export default function Voice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      if (transcript) {
        setResponse(
          "Thanks for your voice query! This is a placeholder response. Once the backend is connected, I'll process your speech and provide real-time voice assistance for product recommendations and support."
        );
      }
    } else {
      setIsListening(true);
      setResponse("");
      setTranscript("Listening...");
      // Simulated transcript
      setTimeout(() => {
        setTranscript("Show me the best industrial robots for welding");
      }, 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-3">Voice Interaction</h1>
        <p className="text-slate-400">
          Talk to our AI assistant naturally. Ask about robots, get recommendations,
          or request support — all through voice.
        </p>
      </div>

      {/* Voice visualization area */}
      <div className="flex flex-col items-center">
        {/* Mic button */}
        <button
          onClick={toggleListening}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? "bg-red-500/20 border-2 border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.3)]"
              : "bg-accent/20 border-2 border-accent hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]"
          }`}
        >
          {/* Pulse rings when listening */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-ping" />
              <span className="absolute inset-[-10px] rounded-full border border-red-500/20 animate-pulse" />
            </>
          )}
          {isListening ? (
            <MicOff size={40} className="text-red-400" />
          ) : (
            <Mic size={40} className="text-accent" />
          )}
        </button>

        <p className="mt-6 text-slate-400 text-sm">
          {isListening ? "Listening... Tap to stop" : "Tap the microphone to start"}
        </p>

        {/* Transcript */}
        {transcript && (
          <div className="mt-8 w-full max-w-lg">
            <div className="bg-surface rounded-xl p-5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Mic size={14} className="text-neon" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Your speech
                </span>
              </div>
              <p className="text-white">{transcript}</p>
            </div>
          </div>
        )}

        {/* AI Response */}
        {response && (
          <div className="mt-4 w-full max-w-lg">
            <div className="bg-accent/5 rounded-xl p-5 border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 size={14} className="text-accent" />
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  AI Response
                </span>
              </div>
              <p className="text-slate-200">{response}</p>
            </div>
          </div>
        )}

        {/* Feature note */}
        <div className="mt-12 p-6 bg-surface/50 rounded-xl border border-white/5 max-w-lg text-center">
          <h3 className="text-white font-semibold mb-2">Coming Soon</h3>
          <p className="text-slate-400 text-sm">
            Full voice interaction powered by Web Speech API and AI voice agents.
            Real-time speech-to-text, intelligent processing, and text-to-speech responses.
          </p>
        </div>
      </div>
    </div>
  );
}
