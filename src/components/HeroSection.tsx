import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, HeartHandshake, Bot, Play, Pause, Scissors, Volume2, VolumeX, Maximize2, Film } from 'lucide-react';
import { motion } from 'motion/react';
import { HERO_VIDEO_FRAME } from '../data/images';
import { Reveal } from './motion/Reveal';

export const HeroSection: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(18); // 18s smooth HD loop
  const [videoLoaded, setVideoLoaded] = useState(false);

  const bgVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return;

    video.muted = isMuted;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay prevented or video buffering, forcing muted play:', err);
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying, isMuted]);

  useEffect(() => {
    let animationFrameId: number;

    const updateTime = () => {
      if (bgVideoRef.current && !bgVideoRef.current.paused) {
        setCurrentTime(bgVideoRef.current.currentTime);
        if (bgVideoRef.current.duration && !isNaN(bgVideoRef.current.duration)) {
          setDuration(bgVideoRef.current.duration);
        }
      }
      animationFrameId = requestAnimationFrame(updateTime);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateTime);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (bgVideoRef.current) {
      if (nextState) bgVideoRef.current.play().catch(() => {});
      else bgVideoRef.current.pause();
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);

    if (bgVideoRef.current) bgVideoRef.current.muted = nextMute;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="relative min-h-screen pt-24 pb-16 flex items-center bg-[#050403] text-white overflow-hidden select-none">
      
      {/* Animated Glowing Light Orbs in Background */}
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
        className="absolute top-1/4 left-10 w-96 h-96 bg-[#C8753D]/30 rounded-full blur-[100px] pointer-events-none z-10"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[#D49A63]/20 rounded-full blur-[120px] pointer-events-none z-10"
      />

      {/* Background High-Definition Cinematic Video Layer — Caring For Hair */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          ref={bgVideoRef}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-105 saturate-110 scale-105 transition-opacity duration-1000"
          poster={HERO_VIDEO_FRAME}
        >
          <source src="https://assets.mixkit.co/videos/41582/41582-720.mp4" type="video/mp4" />
          <source src="https://assets.mixkit.co/videos/41579/41579-720.mp4" type="video/mp4" />
          <source src="https://assets.mixkit.co/videos/41581/41581-720.mp4" type="video/mp4" />
          <source src="https://assets.mixkit.co/videos/41580/41580-720.mp4" type="video/mp4" />
        </video>


        {/* Cinematic Vignettes & KURLA Golden Bronze Lighting Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050403] via-[#050403]/60 to-[#050403]/30 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,117,61,0.25),transparent_65%)] pointer-events-none z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(58,34,24,0.45),transparent_70%)] pointer-events-none z-10" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20">
        
        {/* Top Video Player Bar Control with Smooth HD Progress Loop */}
        <Reveal delay={0.02}>
          <div className="mb-8 pt-2">
            <div className="p-3 sm:px-5 sm:py-3.5 rounded-2xl bg-[#1A0F0A]/90 border border-[#C8753D]/40 backdrop-blur-md shadow-2xl max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#FFF7EF]/90">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#C8753D]/30 border border-[#C8753D]/50 flex items-center justify-center shrink-0">
                  <Film className="w-3.5 h-3.5 text-[#D49A63] animate-pulse" />
                </div>
                <div>
                  <span className="font-semibold text-[#D49A63] flex items-center gap-1.5">
                    Vidéo Cinématique HD (18s Boucle Continuous)
                    <span className="px-1.5 py-0.5 rounded bg-[#C8753D]/30 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">4K HD</span>
                  </span>
                  <p className="text-[11px] text-[#FFF7EF]/70 font-light">
                    Soin des cheveux texturés & rituel au peigne afro
                  </p>
                </div>
              </div>

              {/* Playback Controls & Scrubber Counter */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#D49A63] bg-[#050403]/60 px-2.5 py-1 rounded-full border border-white/10">
                  <span>{formatTime(currentTime)}</span>
                  <span className="text-white/40">/</span>
                  <span className="text-white/70">{formatTime(duration)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 active:scale-95"
                    title={isPlaying ? "Mettre en pause" : "Lancer la vidéo"}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#D49A63]" /> : <Play className="w-3.5 h-3.5 text-[#D49A63]" />}
                    <span className="font-medium">{isPlaying ? 'Pause' : 'Lecture'}</span>
                  </button>
                  <button
                    onClick={toggleMute}
                    className="hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 active:scale-95"
                    title={isMuted ? "Activer le son" : "Couper le son"}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#D49A63]" /> : <Volume2 className="w-3.5 h-3.5 text-[#D49A63]" />}
                    <span className="font-medium">{isMuted ? 'Muet' : 'Son'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Smooth Video Loop Progress Bar */}
            <div className="max-w-2xl mx-auto mt-2 h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
              <div
                className="h-full bg-gradient-to-r from-[#C8753D] via-[#D49A63] to-[#FFF7EF] transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(200,117,61,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </Reveal>

        {/* Main Editorial Content Grid */}
        <div className="max-w-4xl mx-auto text-left">

          {/* Core Brand Messaging & Diagnostic Action */}
          <div className="flex flex-col justify-center space-y-6">

            <Reveal delay={0.05}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#1A0F0A]/90 border border-[#C8753D]/50 backdrop-blur-md text-[#D49A63] text-xs font-semibold tracking-wider uppercase w-fit shadow-lg"
              >
                <Scissors className="w-3.5 h-3.5 text-[#D49A63]" />
                <span>RITUEL DÉMÊLAGE & HYDRATATION EN PROFONDEUR</span>
              </motion.div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-title font-extrabold text-white tracking-tight leading-[1.08]">
                Sublimez l'éclat de vos{' '}
                <motion.span
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                  className="bg-gradient-to-r from-[#FFF7EF] via-[#D49A63] to-[#C8753D] bg-[length:200%_auto] bg-clip-text text-transparent italic font-normal inline-block"
                >
                  cheveux texturés & crépus.
                </motion.span>
              </h1>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="text-base sm:text-lg text-[#FFF7EF]/90 max-w-[680px] leading-relaxed font-light">
                Une femme noire prenant soin de sa chevelure avec amour : gestuelle douce au peigne afro à dents larges, nutriments botaniques certifiés et scellage d'hydratation pour préserver la santé des cheveux 3A à 4C.
              </p>
            </Reveal>

            {/* Feature Highlights */}
            <Reveal delay={0.2}>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {['Démêlage doux au peigne afro', 'Hydratation certifiée 3A-4C', 'Protection anti-casse', 'Formules 100% végétales'].map((bullet, i) => (
                  <motion.span
                    key={i}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs text-[#FFF7EF] font-medium flex items-center gap-1.5 shadow-sm hover:border-[#C8753D]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D49A63]" />
                    {bullet}
                  </motion.span>
                ))}
              </div>
            </Reveal>

            {/* Action Buttons */}
            <Reveal delay={0.25}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <motion.a
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  href="/diagnostic/cheveux"
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-[#C8753D] to-[#b06330] hover:from-[#d48246] hover:to-[#c8753d] text-white font-semibold text-base tracking-wide shadow-xl shadow-[#C8753D]/30 transition-all flex items-center justify-center gap-3 group"
                >
                  Trouver ma routine
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.a>

                <motion.a
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  href="/boutique"
                  className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-semibold text-base tracking-wide transition-all text-center"
                >
                  Découvrir la boutique
                </motion.a>

                <motion.a
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  href="/assistant-beaute"
                  className="px-6 py-4 rounded-full bg-[#1A0F0A]/90 hover:bg-[#3A2218] text-[#D49A63] border border-[#C8753D]/40 backdrop-blur-md font-medium text-sm tracking-wide transition-all flex items-center justify-center gap-2"
                >
                  <Bot className="w-4 h-4 text-[#D49A63] animate-spin-slow" />
                  <span>Assistant IA</span>
                </motion.a>
              </div>
            </Reveal>

            {/* Reassuring Badges */}
            <Reveal delay={0.3}>
              <div className="pt-6 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-[#FFF7EF]/70">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D49A63]" /> Diagnostic 3 min personnalisé
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D49A63]" /> Produits Végétaux & Éthiques
                </span>
                <span className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-[#D49A63]" /> Conçu pour toute la famille
                </span>
              </div>
            </Reveal>

          </div>

        </div>

      </div>
    </section>
  );
};


