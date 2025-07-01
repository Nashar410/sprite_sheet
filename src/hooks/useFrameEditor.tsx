import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

interface Frame {
  id: string;
  filename: string;
  data: string; // base64
  enabled: boolean;
  width: number;
  height: number;
}

export const useFrameEditor = () => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  // Import frames from folder
  const importFramesFromFolder = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Starting frame import...");
      
      // Check if Electron APIs are available
      const hasElectronAPI = window.electron && typeof window.electron.selectDirectory === 'function';
      const hasElectronAPIFallback = window.electronAPI && typeof window.electronAPI.selectDirectory === 'function';
      
      console.log("Available APIs:", {
        hasElectronAPI,
        hasElectronAPIFallback,
        electronFunctions: hasElectronAPI ? Object.keys(window.electron) : [],
        electronAPIFunctions: hasElectronAPIFallback ? Object.keys(window.electronAPI) : []
      });
      
      if (!hasElectronAPI && !hasElectronAPIFallback) {
        toast({
          title: "Error",
          description: "File system access is not available",
          variant: "destructive"
        });
        return;
      }

      // Select directory
      let folderPath: string | null = null;
      if (hasElectronAPI) {
        folderPath = await window.electron.selectDirectory();
      } else if (hasElectronAPIFallback) {
        folderPath = await window.electronAPI.selectDirectory();
      }

      if (!folderPath) {
        console.log("No folder selected");
        setIsLoading(false);
        return;
      }

      console.log("Selected folder:", folderPath);

      // Read directory files
      let files: string[] = [];
      if (hasElectronAPI && window.electron.readDirectory) {
        files = await window.electron.readDirectory(folderPath);
      } else if (hasElectronAPIFallback && window.electronAPI.readDirectory) {
        files = await window.electronAPI.readDirectory(folderPath);
      }

      console.log("Files found:", files.length);

      // Filter PNG files and sort them
      const imageFiles = files
        .filter(f => f.toLowerCase().endsWith('.png'))
        .sort((a, b) => {
          // Try to sort by frame number if present in filename
          const aMatch = a.match(/\d+/);
          const bMatch = b.match(/\d+/);
          const aNum = aMatch ? parseInt(aMatch[0]) : 0;
          const bNum = bMatch ? parseInt(bMatch[0]) : 0;
          return aNum - bNum;
        });

      console.log("PNG files found:", imageFiles.length);

      if (imageFiles.length === 0) {
        toast({
          title: "No frames found",
          description: "No PNG files found in the selected folder",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Load frames with progress updates
      const loadedFrames: Frame[] = [];
      const totalFiles = imageFiles.length;
      
      // Show initial loading toast
      toast({
        title: "Loading frames",
        description: `Loading ${totalFiles} frames...`,
      });
      
      for (let i = 0; i < imageFiles.length; i++) {
        const filename = imageFiles[i];
        // Use path.join for proper path handling across platforms
        const filePath = folderPath + (folderPath.endsWith('/') || folderPath.endsWith('\\') ? '' : '/') + filename;
        
        console.log(`Loading frame ${i + 1}/${totalFiles}: ${filename}`);
        console.log(`Full path: ${filePath}`);
        
        try {
          let imageData: string | null = null;
          
          if (hasElectronAPI && window.electron.readImageFile) {
            console.log(`Calling window.electron.readImageFile for ${filename}`);
            imageData = await window.electron.readImageFile(filePath);
          } else if (hasElectronAPIFallback && window.electronAPI.readImageFile) {
            console.log(`Calling window.electronAPI.readImageFile for ${filename}`);
            imageData = await window.electronAPI.readImageFile(filePath);
          }

          if (!imageData) {
            console.error(`No image data returned for: ${filename}`);
            continue;
          }

          console.log(`Received image data for ${filename}, length: ${imageData.length}`);

          if (imageData) {
            // Get image dimensions
            const img = new Image();
            const loadPromise = new Promise<void>((resolve, reject) => {
              img.onload = () => {
                console.log(`Image loaded successfully: ${filename} (${img.width}x${img.height})`);
                resolve();
              };
              img.onerror = (error) => {
                console.error(`Failed to load image: ${filename}`, error);
                reject(new Error(`Failed to load image: ${filename}`));
              };
            });
            
            img.src = imageData;
            await loadPromise;

            loadedFrames.push({
              id: `frame-${Date.now()}-${i}`,
              filename,
              data: imageData,
              enabled: true,
              width: img.width,
              height: img.height
            });
            
            // Update progress every 5 frames
            if ((i + 1) % 5 === 0 || i === totalFiles - 1) {
              console.log(`Loaded ${i + 1}/${totalFiles} frames`);
            }
          } else {
            console.error(`Failed to load image data for: ${filename}`);
          }
        } catch (error) {
          console.error(`Error loading frame ${filename}:`, error);
          // Continue with next frame instead of failing completely
        }
      }

      console.log("Total frames loaded:", loadedFrames.length);

      if (loadedFrames.length === 0) {
        toast({
          title: "Error", 
          description: "Failed to load any frames",
          variant: "destructive"
        });
      } else {
        console.log("Setting frames state with:", loadedFrames);
        setFrames(loadedFrames);
        setCurrentFrame(0);
        console.log("Frames state updated successfully");
        
        toast({
          title: "Success",
          description: `Loaded ${loadedFrames.length} frames`,
        });
      }
      
    } catch (error: any) {
      console.error("Error importing frames:", error);
      toast({
        title: "Error",
        description: `Failed to import frames: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle frame enabled state
  const toggleFrame = useCallback((index: number) => {
    setFrames(prev => {
      const newFrames = [...prev];
      newFrames[index] = {
        ...newFrames[index],
        enabled: !newFrames[index].enabled
      };
      return newFrames;
    });
  }, []);

  // Get active frames (enabled only)
  const getActiveFrames = useCallback(() => {
    return frames.filter(f => f.enabled);
  }, [frames]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        lastFrameTimeRef.current = null;
      }
      return;
    }

    const activeFrames = getActiveFrames();
    if (activeFrames.length === 0) {
      setIsPlaying(false);
      return;
    }

    const frameTime = 1000 / fps; // Time per frame in ms

    const updateFrame = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed >= frameTime) {
        setCurrentFrame((prev) => {
          const nextFrame = (prev + 1) % activeFrames.length;
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
  }, [isPlaying, fps, getActiveFrames]);

  // Export as sprite sheet
  const exportAsSpriteSheet = useCallback(async () => {
    const activeFrames = getActiveFrames();
    
    if (activeFrames.length === 0) {
      toast({
        title: "Error",
        description: "No active frames to export",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get dimensions from first frame
      const frameWidth = activeFrames[0].width;
      const frameHeight = activeFrames[0].height;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth * activeFrames.length;
      canvas.height = frameHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Show progress
      toast({
        title: "Exporting",
        description: "Creating sprite sheet...",
      });

      // Draw each frame
      for (let i = 0; i < activeFrames.length; i++) {
        const img = new Image();
        const loadPromise = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load frame ${i}`));
        });
        
        img.src = activeFrames[i].data;
        await loadPromise;
        
        ctx.drawImage(img, i * frameWidth, 0, frameWidth, frameHeight);
      }

      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.download = `spritesheet-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
      link.href = dataURL;
      link.click();

      toast({
        title: "Success",
        description: `Exported sprite sheet with ${activeFrames.length} frames`,
      });

    } catch (error: any) {
      console.error("Error exporting sprite sheet:", error);
      toast({
        title: "Error",
        description: `Failed to export sprite sheet: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [getActiveFrames]);

  // Export as animated GIF using canvas frames
  const exportAsGif = useCallback(async () => {
    // For a true GIF export, we would need a library like gif.js
    // For now, we'll export as a series of PNGs with instructions
    
    const activeFrames = getActiveFrames();
    
    if (activeFrames.length === 0) {
      toast({
        title: "Error",
        description: "No active frames to export",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "GIF Export",
      description: "GIF export requires external tools. Use the sprite sheet export instead, or use an online tool to convert the sprite sheet to GIF.",
    });
  }, [getActiveFrames]);

  return {
    // State
    frames,
    isLoading,
    currentFrame,
    isPlaying,
    fps,
    
    // Actions
    importFramesFromFolder,
    toggleFrame,
    setCurrentFrame,
    setIsPlaying,
    setFps,
    exportAsSpriteSheet,
    exportAsGif,
    getActiveFrames
  };
};