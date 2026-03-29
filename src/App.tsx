/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, RotateCcw, Sparkles, Zap, Heart, Volume2, VolumeX, MousePointer2, CloudRain, Flame, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GoogleGenAI } from "@google/genai";

// --- Constants & Rules ---
const KEYWORDS = ['加班', '傻逼', '老板', '穷', '卷', '烦', '气死', '滚', '无语', '累', '操', '草'];

const WORRY_CATEGORIES = {
  workplace: [
    "傻逼领导！！烦死我了！天天画大饼！",
    "又要加班，这日子没法过了，卷死谁啊！",
    "甲方爸爸又改需求了，我真的会谢...",
    "无语，这破班是一天也不想上了！",
    "工资低到离谱，还要被PUA说年轻人要吃苦！",
    "开会开一下午，正事没干一件全是废话！",
    "部门内斗勾心斗角，累了毁灭吧",
  ],
  life_pressure: [
    "穷疯了，什么时候才能实现财富自由啊啊啊！",
    "累成狗，只想原地躺平，毁灭吧赶紧的。",
    "穷得想发疯，什么时候才能暴富",
    "想辞职不敢辞，根本没底气"
  ],
  relationships: [
    "亲戚催婚烦死了，关你屁事啊！",
    "奇葩室友真无语，天天半夜吵死！",
    "朋友阴阳怪气，表面一套背后一套",
    "社交好累好假，只想一个人待着",
    "被亲戚催生，我生不生关你啥事",
    "同学聚会全是攀比，烦透了"
  ]
};

const CHICKEN_SOUP = [
  "没关系的，天塌下来还有高个子顶着呢。",
  "烦恼是暂时的，快乐才是人生的主旋律。",
  "别让糟糕的人影响你的心情，他们不配。",
  "今天辛苦了，早点休息，明天又是新的一天。",
  "生活虽然有点苦，但你要记得给自己加点糖。",
  "所有的压力都会在这一刻烟消云散。",
  "你已经做得很棒了，别对自己太苛刻。",
  "世界很大，烦恼很小，去吃顿火锅吧！",
  "那些破事配不上你的好心情，别往心里去。",
  "累了就歇会儿，不用一直逼自己坚强。",
  "你已经超棒了，不用事事都做到完美。",
  "不开心就发泄，不用假装情绪稳定。",
  "那些打不倒你的，只会让你更强大。",
];

// --- Procedural Audio Helper ---
const playExplosionSound = (enabled: boolean) => {
  if (!enabled) return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  
  const ctx = new AudioContextClass();
  
  // Deep Bass Boom
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
  gain.gain.setValueAtTime(1.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 1.2);

  // High Frequency Shatter
  const bufferSize = ctx.sampleRate * 0.8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start();
};

export default function App() {
  const [worry, setWorry] = useState('');
  const [analysis, setAnalysis] = useState<{ hp: number; color: string } | null>(null);
  const [hp, setHp] = useState(0);
  const [maxHp, setMaxHp] = useState(0);
  const [isPopped, setIsPopped] = useState(false);
  const [wisdomSeed, setWisdomSeed] = useState('');
  const [shake, setShake] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [combo, setCombo] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [mascotUrl, setMascotUrl] = useState<string | null>(null);
  const [isGeneratingMascot, setIsGeneratingMascot] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; char: string }[]>([]);

  // --- AI Asset Generation ---
  const generateAIAssets = useCallback(async () => {
    if (isGeneratingMascot) return;
    setIsGeneratingMascot(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Generate Mascot matching the user's uploaded image
      const mascotRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: 'A cute pink fluffy cloud character with a sweet smiling face, resting its chin on its hands, surrounded by soft pastel clouds and tiny hearts. Soft aesthetic, hand-drawn anime style, pastel pink and blue colors, high quality.' }],
        },
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
      });
      
      if (mascotRes.candidates?.[0]?.content?.parts) {
        for (const part of mascotRes.candidates[0].content.parts) {
          if (part.inlineData) {
            setMascotUrl(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (error) {
      console.error("AI asset generation failed:", error);
    } finally {
      setIsGeneratingMascot(false);
    }
  }, [isGeneratingMascot]);

  const getRandomSuggestions = useCallback(() => {
    const categories = Object.keys(WORRY_CATEGORIES);
    const shuffledCategories = [...categories].sort(() => 0.5 - Math.random());
    const selectedSuggestions: string[] = [];
    
    // Pick 3 random categories and 1 random worry from each
    shuffledCategories.slice(0, 3).forEach(cat => {
      const pool = WORRY_CATEGORIES[cat as keyof typeof WORRY_CATEGORIES];
      const randomWorry = pool[Math.floor(Math.random() * pool.length)];
      selectedSuggestions.push(randomWorry);
    });
    
    return selectedSuggestions;
  }, []);

  useEffect(() => {
    generateAIAssets();
    setSuggestions(getRandomSuggestions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Recovery Logic ---
  useEffect(() => {
    if (!analysis || isPopped || hp >= maxHp) return;

    const interval = setInterval(() => {
      const now = Date.now();
      // If no click for 1.5 seconds, start recovering
      if (now - lastClickTime > 1500) {
        setHp(prev => Math.min(prev + 1, maxHp));
        setCombo(0); // Reset combo on pause
      }
    }, 100);

    return () => clearInterval(interval);
  }, [analysis, isPopped, hp, maxHp, lastClickTime]);

  const analyzeWorry = useCallback(() => {
    const text = worry.trim();
    if (!text) return;

    let resentmentCount = 0;
    KEYWORDS.forEach(word => {
      const regex = new RegExp(word, 'g');
      const matches = text.match(regex);
      if (matches) resentmentCount += matches.length;
    });

    // --- ADJUSTED HP: 30 to 80 range ---
    const calculatedHp = Math.min(30 + resentmentCount * 10, 100);
    
    // Soft Pastel Palette
    const factor = Math.min(resentmentCount / 6, 1);
    const r = Math.floor(255);
    const g = Math.floor(143 + (100 - 143) * factor);
    const b = Math.floor(163 + (100 - 163) * factor);
    const color = `rgb(${r}, ${g}, ${b})`;

    setAnalysis({ hp: calculatedHp, color });
    setHp(calculatedHp);
    setMaxHp(calculatedHp);
  }, [worry]);

  const handlePop = () => {
    setIsPopped(true);
    playExplosionSound(soundEnabled);
    confetti({
      particleCount: 300,
      spread: 150,
      origin: { y: 0.6 },
      colors: [analysis?.color || '#8b5cf6', '#ec4899', '#ff0000', '#ffffff'],
      scalar: 1.2
    });
    setWisdomSeed(CHICKEN_SOUP[Math.floor(Math.random() * CHICKEN_SOUP.length)]);
  };

  const handleClick = () => {
    if (isPopped || !analysis) return;

    const now = Date.now();
    if (now - lastClickTime < 400) {
      setCombo(prev => prev + 1);
    } else {
      setCombo(1);
    }
    setLastClickTime(now);

    setHp(prev => {
      const next = prev - 1;
      if (next <= 0) {
        handlePop();
        return 0;
      }
      return next;
    });

    // Add particle effect on click
    if (combo > 3) {
      const newParticle = {
        id: Date.now(),
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        char: ['✨', '💖', '⭐', '🌸'][Math.floor(Math.random() * 4)]
      };
      setParticles(prev => [...prev.slice(-15), newParticle]);
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== newParticle.id));
      }, 800);
    }

    setShake(prev => prev + 1);
    setTimeout(() => setShake(prev => Math.max(0, prev - 1)), 100);
  };

  const reset = () => {
    setWorry('');
    setAnalysis(null);
    setHp(0);
    setIsPopped(false);
    setWisdomSeed('');
    setCombo(0);
    setSuggestions(getRandomSuggestions());
    if (!mascotUrl) generateAIAssets();
  };

  const rollback = () => {
    window.location.reload(); // Simple reload for now, but we'll point the user to the backup file
    alert("已记录版本，如需回退请联系开发者或查看备份文件 App.bak.tsx");
  };

  const hpPercent = (hp / maxHp) * 100;
  const isDangerZone = hpPercent <= 30;
  const isCriticalZone = hpPercent <= 10;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-150 ${isCriticalZone && hp > 0 ? 'screen-shake-active bg-red-950/30' : ''}`}>
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(139,92,246,0.05)_0%,_transparent_80%)]" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Sound Toggle */}
      <div className="absolute top-8 right-8 z-50 flex gap-2">
        <button 
          onClick={rollback}
          className="p-3 glass-panel rounded-full text-gray-400 hover:text-pink-500 hover:scale-110 transition-all"
          title="版本记录"
        >
          <History size={20} />
        </button>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-3 glass-panel rounded-full text-gray-400 hover:text-pink-500 hover:scale-110 transition-all"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!analysis && !isPopped && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
            className="z-10 w-full max-w-[546px] glass-panel p-8 md:p-10 rounded-[3rem] shadow-2xl border-white/20 bg-white/80 flex flex-col items-center"
          >
            {/* Mascot */}
            <div className="relative w-32 h-32 mb-4">
              {mascotUrl ? (
                <motion.img 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  src={mascotUrl} 
                  alt="Mascot" 
                  className="w-full h-full object-contain rounded-full shadow-lg border-4 border-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-pink-100 rounded-full animate-pulse flex items-center justify-center text-pink-300">
                  <Sparkles size={32} />
                </div>
              )}
              <motion.div 
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 -right-2 bg-white p-2 rounded-full shadow-md"
              >
                <Heart size={16} className="text-pink-500 fill-pink-500" />
              </motion.div>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-pink-100 rounded-2xl">
                <CloudRain className="text-pink-400" size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-pink-500">烦恼粉碎机</h1>
            </div>
            <p className="text-gray-400 mb-6 text-xs font-semibold tracking-wide uppercase">把不开心都交给小可爱吧 ~</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-6 w-full max-w-[430px]">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setWorry(s)}
                  className="text-[13px] px-4 py-2 bg-pink-50 hover:bg-pink-100 border border-pink-100 rounded-xl text-pink-400 hover:text-pink-600 transition-all active:scale-95 font-bold font-[Arial]"
                >
                  {s.length > 15 ? s.slice(0, 15) + '...' : s}
                </button>
              ))}
            </div>

            <textarea
              value={worry}
              onChange={(e) => setWorry(e.target.value)}
              placeholder="写下你的烦恼..."
              className="w-full h-32 bg-white/50 border border-pink-100 rounded-2xl p-6 text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-pink-100 transition-all resize-none mb-6 text-lg leading-relaxed"
            />

            <button
              onClick={analyzeWorry}
              disabled={!worry.trim()}
              className="w-full max-w-[431px] h-[58px] bg-gradient-to-br from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-4 group shadow-xl shadow-pink-200 active:scale-[0.97] mx-auto text-white"
            >
              注入怨念气球 <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </motion.div>
        )}

        {analysis && !isPopped && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="z-10 flex flex-col items-center w-full"
          >
            {/* Combo Display */}
            <div className="h-24 md:h-32 mb-4 md:mb-8 flex items-center justify-center relative">
              <AnimatePresence>
                {combo > 3 && (
                  <motion.div
                    key={combo}
                    initial={{ scale: 0.5, opacity: 0, rotate: -10, y: 20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
                    exit={{ scale: 1.5, opacity: 0, y: -40 }}
                    className="relative flex flex-col items-center"
                  >
                    {/* Floating Particles */}
                    {particles.map(p => (
                      <motion.span
                        key={p.id}
                        initial={{ opacity: 1, x: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.5, rotate: 45 }}
                        className="absolute pointer-events-none text-2xl"
                      >
                        {p.char}
                      </motion.span>
                    ))}

                    <div className="flex flex-col items-center">
                      <span className="text-7xl md:text-9xl font-black italic bg-gradient-to-br from-pink-400 via-rose-500 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(244,63,94,0.3)] leading-none select-none">
                        {combo}
                      </span>
                      <motion.span 
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="text-xl md:text-3xl font-black italic text-rose-400 tracking-[0.3em] uppercase drop-shadow-sm mt-2 select-none"
                      >
                        COMBO!
                      </motion.span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* The Balloon */}
            <motion.div
              onClick={handleClick}
              animate={{
                x: shake > 0 ? [0, -15, 15, -15, 15, 0] : 0,
                scale: (window.innerWidth < 768 ? 0.8 : 1) + (maxHp - hp) * 0.004 + (combo * 0.01),
                rotate: isDangerZone ? [0, -2, 2, -2, 2, 0] : 0,
              }}
              transition={{ duration: 0.1 }}
              className={`relative cursor-pointer select-none transition-all duration-100 ${isDangerZone ? 'vibrate-intense' : 'balloon-float'} ${isCriticalZone ? 'balloon-glow' : ''}`}
              style={{
                width: window.innerWidth < 768 ? '240px' : '300px',
                height: window.innerWidth < 768 ? '288px' : '360px',
              }}
            >
              <div 
                className="w-full h-full rounded-[50%_50%_50%_50%_/_45%_45%_55%_55%] shadow-2xl flex items-center justify-center p-12 text-center transition-all duration-500"
                style={{ 
                  background: isCriticalZone 
                    ? `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%), #ef4444`
                    : `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 60%), ${analysis.color}`,
                  boxShadow: isCriticalZone
                    ? `inset -30px -30px 60px rgba(0,0,0,0.6), 0 0 100px rgba(239, 68, 68, 0.8)`
                    : `inset -30px -30px 60px rgba(0,0,0,0.5), 0 20px 60px ${analysis.color}44`,
                  filter: isCriticalZone ? 'brightness(1.4) contrast(1.3)' : 'none'
                }}
              >
                <span className="text-white font-black text-2xl break-words leading-tight">
                  {worry}
                </span>
              </div>
              {/* String */}
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-0.5 h-28 bg-gradient-to-b from-white/20 to-transparent" />
              {isCriticalZone && <div className="glow-overlay rounded-[50%_50%_50%_50%_/_45%_45%_55%_55%]" />}
            </motion.div>

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full max-w-[85%] md:max-w-sm px-4 z-50">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex items-center gap-2 font-black tracking-[0.2em] text-xs md:text-base uppercase transition-colors duration-300 ${isCriticalZone ? 'text-rose-500 animate-pulse' : 'text-pink-400'}`}>
                  {isCriticalZone ? <Flame size={16} /> : <MousePointer2 size={16} className="animate-bounce" />} 
                  {isCriticalZone ? '即将引爆！！！' : '疯狂连点'}
                </div>
                <div className="text-[9px] text-gray-400 font-black tracking-[0.2em]">停下点击气球会慢慢恢复</div>
              </div>
              
              {/* HP Bar */}
              <div className="w-full space-y-2">
                <div className="w-full h-3 md:h-5 bg-white rounded-full overflow-hidden border border-pink-100 p-1 shadow-lg">
                  <motion.div 
                    className={`h-full rounded-full transition-colors duration-300 ${isCriticalZone ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)]' : 'bg-gradient-to-r from-pink-400 via-rose-400 to-orange-300'}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${hpPercent}%` }}
                  />
                </div>
                <div className="flex justify-between w-full text-[9px] md:text-xs uppercase tracking-[0.2em] font-black">
                  <span className="text-gray-300">怨念残余</span>
                  <span className={isCriticalZone ? 'text-rose-500 scale-110 transition-transform' : 'text-pink-400'}>
                    {Math.ceil(hpPercent)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isPopped && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(30px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            className="z-10 w-full max-w-lg text-center flex flex-col items-center"
          >
            {/* Petting Animation */}
            <div className="relative h-40 w-64 mb-6 flex items-end justify-center gap-4">
              {/* The Pettee (Rabbit) */}
              <motion.div
                animate={{ 
                  y: [0, 2, 0],
                  scale: [1, 0.98, 1]
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="text-white/60"
              >
                <div className="relative">
                   <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 bg-violet-400/20 rounded-full blur-xl" />
                   <span className="text-6xl">🐰</span>
                </div>
              </motion.div>

              {/* The Petter (Cat) */}
              <motion.div
                animate={{ 
                  rotate: [0, -10, 0],
                  x: [0, -5, 0],
                  y: [0, -10, 0]
                }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="relative"
              >
                <span className="text-7xl">🐱</span>
                {/* The "Hand" (Paw) */}
                <motion.div
                  animate={{ 
                    y: [0, 15, 0],
                    rotate: [0, 20, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute -left-4 top-4 text-3xl"
                >
                  🐾
                </motion.div>
              </motion.div>
            </div>
            
            <h2 className="text-4xl font-black mb-6 text-glow text-white tracking-tight">彻底瓦解！</h2>
            
            <div className="glass-panel p-8 rounded-[3rem] mb-8 min-h-[140px] flex items-center justify-center italic text-xl leading-relaxed text-gray-700 border-pink-100 shadow-2xl relative overflow-hidden bg-white/90">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-300 to-transparent" />
              “{wisdomSeed}”
            </div>

            <button
              onClick={reset}
              className="px-12 py-4 bg-gradient-to-br from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 rounded-[2rem] transition-all flex items-center gap-4 mx-auto font-black text-lg shadow-xl shadow-pink-200 active:scale-95 text-white"
            >
              <RotateCcw size={24} /> 开启新的一天
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      {!analysis && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[12px] text-gray-800 uppercase tracking-[0.6em] font-black pointer-events-none opacity-40 text-center w-full px-4">
          Mindfulness Through Destruction
        </div>
      )}
    </div>
  );
}
