import { useState, useEffect, useCallback, useRef } from "react";

export const useAnimation = (model: any) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const [animations, setAnimations] = useState<string[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  
  // Update available animations when model changes
  useEffect(() => {
    if (!model || !model.animations) {
      setAnimations([]);
      setCurrentAnimation(null);
      setTotalFrames(0);
      setCurrentFrame(0);
      return;
    }
    
    const animNames = model.animations.map((anim: any) => anim.name);
    setAnimations(animNames);
    
    if (animNames.length > 0 && !currentAnimation) {
      setCurrentAnimation(animNames[0]);
    }
  }, [model]);

  // FIX: Mettre à jour totalFrames quand currentAnimation change
  useEffect(() => {
    if (!model || !model.animations || !currentAnimation) {
      setTotalFrames(0);
      setCurrentFrame(0);
      return;
    }
    
    // Trouver l'animation sélectionnée
    const selectedAnim = model.animations.find((anim: any) => anim.name === currentAnimation);
    if (selectedAnim) {
      const fps = 30; // Assume 30 fps
      const frames = Math.floor(selectedAnim.duration * fps);
      console.log(`Animation "${currentAnimation}" - Duration: ${selectedAnim.duration}s, Frames: ${frames}`);
      setTotalFrames(frames);
      setCurrentFrame(0); // Reset à la première frame quand on change d'animation
    }
  }, [model, currentAnimation]); // Dépendances importantes: model ET currentAnimation
  
  // Handle animation playback
  useEffect(() => {
    if (!isPlaying || !model || !model.animations || !currentAnimation || totalFrames === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    const fps = 30; // Frames per second
    const anim = model.animations.find((a: any) => a.name === currentAnimation);
    if (!anim) return;
    
    const frameTime = 1000 / fps; // Time per frame in ms
    
    const updateFrame = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - lastFrameTimeRef.current;
      
      if (elapsed >= frameTime) {
        setCurrentFrame((prevFrame) => {
          const nextFrame = (prevFrame + 1) % totalFrames;
          return nextFrame;
        });
        
        lastFrameTimeRef.current = timestamp;
      }
      
      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateFrame);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, model, currentAnimation, totalFrames]);
  
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);
  
  const previousFrame = useCallback(() => {
    setCurrentFrame((prev) => {
      if (prev <= 0) return totalFrames - 1;
      return prev - 1;
    });
  }, [totalFrames]);
  
  const nextFrame = useCallback(() => {
    setCurrentFrame((prev) => {
      if (prev >= totalFrames - 1) return 0;
      return prev + 1;
    });
  }, [totalFrames]);
  
  // FIX: Simplifier la fonction setAnimation
  const setAnimation = useCallback((animation: string) => {
    console.log(`Changing animation to: ${animation}`);
    setCurrentAnimation(animation);
    // Le useEffect se chargera de mettre à jour totalFrames et currentFrame
  }, []);
  
  return {
    isPlaying,
    currentAnimation,
    animations,
    currentFrame,
    totalFrames,
    togglePlayPause,
    previousFrame,
    nextFrame,
    setCurrentAnimation: setAnimation,
    setCurrentFrame
  };
};