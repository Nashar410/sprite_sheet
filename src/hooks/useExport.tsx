import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";

// Ajoutez ceci dans src/hooks/useExport.tsx ou créez un nouveau fichier src/types/electron.d.ts

interface ElectronAPI {
  openFileDialog: () => Promise<string | null>;
  saveFileDialog: (options: any) => Promise<string | null>;
  saveFile: (data: any) => Promise<any>;
  getThemePreference: () => Promise<string>;
  setThemePreference: (theme: string) => Promise<string>;
  selectDirectory: () => Promise<string | null>;
  createDirectory: (path: string) => Promise<boolean>;
  saveImageFile: (path: string, data: string) => Promise<boolean>;
  
  // NEW APIs for Frame Editor
  readDirectory: (path: string) => Promise<string[]>;
  readImageFile: (path: string) => Promise<string | null>;
}

declare global {
  interface Window {
    electron?: {
      selectDirectory: () => Promise<string | null>;
      saveFile: (path: string, data: string) => Promise<boolean>;
      createDirectory: (path: string) => Promise<boolean>;
      
      // NEW APIs for Frame Editor
      readDirectory: (path: string) => Promise<string[]>;
      readImageFile: (path: string) => Promise<string | null>;
    };
    electronAPI?: ElectronAPI;
  }
}

export const useExport = () => {
  const [width, setWidth] = useState(128);
  const [height, setHeight] = useState(128);
  const [backgroundColor, setBackgroundColor] = useState("#121212"); // Default dark background
  const [renderSteps, setRenderSteps] = useState(1); // Default to export all frames
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  
  // Helper function to verify image dimensions from a data URL
  const verifyImageDimensions = useCallback((dataURL: string, expectedWidth: number, expectedHeight: number): Promise<{width: number, height: number, matches: boolean}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const matches = img.width === expectedWidth && img.height === expectedHeight;
        console.log("Image dimensions verification:", {
          expected: { width: expectedWidth, height: expectedHeight },
          actual: { width: img.width, height: img.height },
          matches
        });
        resolve({
          width: img.width,
          height: img.height,
          matches
        });
      };
      img.src = dataURL;
    });
  }, []);
  
  // Helper function to create a properly sized canvas for export
  const createExportCanvas = useCallback((sourceCanvas: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement => {
    // Create a new canvas with the exact dimensions we want
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    
    // Get the context for the new canvas
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) {
      console.error("Could not get 2D context for export canvas");
      return sourceCanvas; // Fallback to source canvas
    }
    
    // Get the export preview rect if available
    const exportPreviewRect = (sourceCanvas as any).__exportPreviewRect;
    
    if (exportPreviewRect) {
      // If we have export preview rect information, use it to crop the source canvas
      // to match what's shown in the preview
      const { left, top, width: previewWidth, height: previewHeight } = exportPreviewRect;
      
      // Ensure we're only sampling from within the preview boundary
      // Round values to avoid subpixel rendering issues
      const roundedLeft = Math.round(left);
      const roundedTop = Math.round(top);
      const roundedWidth = Math.round(previewWidth);
      const roundedHeight = Math.round(previewHeight);
      
      // Log the exact coordinates we're sampling from
      console.log("Strictly sampling from export preview boundary:", {
        source: {
          x: roundedLeft,
          y: roundedTop,
          width: roundedWidth,
          height: roundedHeight
        },
        destination: {
          width,
          height
        }
      });
      
      // Clear the canvas with a transparent background first
      ctx.clearRect(0, 0, width, height);
      
      // Draw only the portion of the source canvas that corresponds to the preview area
      ctx.drawImage(
        sourceCanvas,
        roundedLeft, roundedTop, roundedWidth, roundedHeight,  // Source rectangle
        0, 0, width, height                                   // Destination rectangle
      );
    } else {
      // Fallback to using the entire canvas
      console.warn("No export preview rect available, using entire canvas. This may not match the preview.");
      ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, width, height);
    }
    
    return exportCanvas;
  }, []);
  
  // Debug: Log available electron APIs on mount
  useEffect(() => {
    console.log("Window electron API available:", {
      electron: typeof window.electron,
      electronAPI: typeof window.electronAPI,
      electronSelectDirectory: typeof window.electron?.selectDirectory,
      electronAPISelectDirectory: typeof window.electronAPI?.selectDirectory,
      electronCreateDirectory: typeof window.electron?.createDirectory,
      electronAPICreateDirectory: typeof window.electronAPI?.createDirectory,
      electronSaveFile: typeof window.electron?.saveFile,
      electronAPISaveImageFile: typeof window.electronAPI?.saveImageFile
    });
  }, []);
  
  // Function to select output folder
  const selectOutputFolder = useCallback(async () => {
    try {
      console.log("Attempting to select output folder");
      console.log("Available APIs:", {
        electron: typeof window.electron,
        electronAPI: typeof window.electronAPI
      });
      
      // Try window.electron first
      if (window.electron && typeof window.electron.selectDirectory === 'function') {
        console.log("Using window.electron.selectDirectory");
        const selectedFolder = await window.electron.selectDirectory();
        console.log("Selected folder (electron):", selectedFolder);
        
        if (selectedFolder) {
          setOutputFolder(selectedFolder);
          toast({
            title: "Output folder selected",
            description: selectedFolder,
          });
          return;
        }
      }
      
      // Try window.electronAPI as fallback
      if (window.electronAPI && typeof window.electronAPI.selectDirectory === 'function') {
        console.log("Using window.electronAPI.selectDirectory");
        const selectedFolder = await window.electronAPI.selectDirectory();
        console.log("Selected folder (electronAPI):", selectedFolder);
        
        if (selectedFolder) {
          setOutputFolder(selectedFolder);
          toast({
            title: "Output folder selected",
            description: selectedFolder,
          });
          return;
        }
      }
      
      // Try window.electronAPI.openFileDialog as last resort
      if (window.electronAPI && typeof window.electronAPI.openFileDialog === 'function') {
        console.log("Using window.electronAPI.openFileDialog");
        const selectedFolder = await window.electronAPI.openFileDialog();
        console.log("Selected folder (openFileDialog):", selectedFolder);
        
        if (selectedFolder) {
          setOutputFolder(selectedFolder);
          toast({
            title: "Output folder selected",
            description: selectedFolder,
          });
          return;
        }
      }
      
      // If we get here, none of the methods worked
      console.error("No working directory selection method available");
      
      // Log all available window properties
      console.log("Available window properties:");
      for (const prop in window) {
        if (typeof window[prop] === 'object' && window[prop] !== null) {
          console.log(`- ${prop}`);
        }
      }
      
      throw new Error('No working directory selection method available');
    } catch (error: any) {
      console.error("Error selecting output folder:", error);
      toast({
        title: "Error",
        description: `Failed to select output folder: ${error.message}`,
        variant: "destructive"
      });
    }
  }, []);

  // Function to render a single frame
  const renderFrame = useCallback(async (frameIndex: number, scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): Promise<string> => {
    // Store original renderer settings
    const originalSize = renderer.getSize(new THREE.Vector2());
    const originalClearColor = renderer.getClearColor(new THREE.Color());
    const originalClearAlpha = renderer.getClearAlpha();
    const originalBackgroundColor = scene.background;
    const originalPixelRatio = renderer.getPixelRatio();
    
    // Store original camera settings
    const originalCameraPosition = camera.position.clone();
    const originalCameraRotation = camera.rotation.clone();
    const originalCameraZoom = (camera as any).zoom;
    
    // Store camera-specific properties based on camera type
    let originalCameraAspect: number | undefined;
    let originalCameraFov: number | undefined;
    let originalCameraFar: number | undefined;
    let originalCameraNear: number | undefined;
    let originalCameraLeft: number | undefined;
    let originalCameraRight: number | undefined;
    let originalCameraTop: number | undefined;
    let originalCameraBottom: number | undefined;
    
    if (camera instanceof THREE.PerspectiveCamera) {
      originalCameraAspect = camera.aspect;
      originalCameraFov = camera.fov;
      originalCameraFar = camera.far;
      originalCameraNear = camera.near;
    } else if (camera instanceof THREE.OrthographicCamera) {
      originalCameraLeft = camera.left;
      originalCameraRight = camera.right;
      originalCameraTop = camera.top;
      originalCameraBottom = camera.bottom;
      originalCameraFar = camera.far;
      originalCameraNear = camera.near;
    }
    
    try {
      // Set renderer size to match the desired export dimensions
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(1); // Use a pixel ratio of 1 for consistent exports
      
      // Always use transparent background for exports
      renderer.setClearColor(0x000000, 0); // Set transparent background
      scene.background = null; // Remove scene background
      
      // Update camera aspect ratio to match export dimensions
      const aspectRatio = width / height;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera) {
        const currentHeight = camera.top - camera.bottom;
        const currentWidth = camera.right - camera.left;
        const currentAspect = currentWidth / currentHeight;
        
        // Adjust orthographic camera to maintain the same view height but correct aspect ratio
        const newWidth = currentHeight * aspectRatio;
        const widthDiff = newWidth - currentWidth;
        
        camera.left -= widthDiff / 2;
        camera.right += widthDiff / 2;
        camera.updateProjectionMatrix();
      }
      
      // Get the EffectComposer from the canvas if available
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      const composer = (canvas as any).__effectComposer as EffectComposer;
      
      if (composer) {
        // Update composer size to match export dimensions
        composer.setSize(width, height);
        
        // Reset the render targets to ensure correct resolution
        composer.passes.forEach(pass => {
          if (pass.setSize) {
            pass.setSize(width, height);
          }
        });
        
        // Render with the composer to include all effects
        composer.render();
      } else {
        // Fallback to direct rendering if composer is not available
        renderer.render(scene, camera);
      }
      
      // Create a properly sized canvas for export
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      
      // Get the context for the new canvas
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get 2D context for export canvas");
      }
      
      // Clear the canvas with a transparent background
      ctx.clearRect(0, 0, width, height);
      
      // Draw the rendered scene to the export canvas, ensuring correct aspect ratio
      const rendererCanvas = renderer.domElement;
      const rendererAspect = rendererCanvas.width / rendererCanvas.height;
      const targetAspect = width / height;
      
      let sourceWidth = rendererCanvas.width;
      let sourceHeight = rendererCanvas.height;
      let sourceX = 0;
      let sourceY = 0;
      
      // If aspect ratios don't match, calculate the correct source rectangle
      if (Math.abs(rendererAspect - targetAspect) > 0.01) {
        if (rendererAspect > targetAspect) {
          // Renderer is wider than target, crop width
          sourceWidth = Math.round(sourceHeight * targetAspect);
          sourceX = Math.round((rendererCanvas.width - sourceWidth) / 2);
        } else {
          // Renderer is taller than target, crop height
          sourceHeight = Math.round(sourceWidth / targetAspect);
          sourceY = Math.round((rendererCanvas.height - sourceHeight) / 2);
        }
      }
      
      // Log the source and destination rectangles for debugging
      console.log("Drawing to export canvas:", {
        source: { x: sourceX, y: sourceY, width: sourceWidth, height: sourceHeight },
        destination: { width, height },
        rendererAspect,
        targetAspect
      });
      
      // Draw the image with the correct aspect ratio
      ctx.drawImage(
        rendererCanvas,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, width, height
      );
      
      // Get the rendered content from the export canvas
      const dataURL = exportCanvas.toDataURL("image/png");
      
      // Verify the exported image dimensions
      await verifyImageDimensions(dataURL, width, height);
      
      return dataURL;
    } finally {
      // Restore original renderer settings
      renderer.setSize(originalSize.width, originalSize.height, false);
      renderer.setClearColor(originalClearColor, originalClearAlpha);
      renderer.setPixelRatio(originalPixelRatio);
      scene.background = originalBackgroundColor;
      
      // Restore original camera settings
      camera.position.copy(originalCameraPosition);
      camera.rotation.copy(originalCameraRotation);
      (camera as any).zoom = originalCameraZoom;
      
      // Restore camera-specific properties
      if (camera instanceof THREE.PerspectiveCamera && originalCameraAspect !== undefined) {
        camera.aspect = originalCameraAspect;
        camera.fov = originalCameraFov!;
        camera.far = originalCameraFar!;
        camera.near = originalCameraNear!;
        camera.updateProjectionMatrix();
      } else if (camera instanceof THREE.OrthographicCamera && originalCameraLeft !== undefined) {
        camera.left = originalCameraLeft;
        camera.right = originalCameraRight!;
        camera.top = originalCameraTop!;
        camera.bottom = originalCameraBottom!;
        camera.far = originalCameraFar!;
        camera.near = originalCameraNear!;
        camera.updateProjectionMatrix();
      }
      
      // If we used the composer, restore its size too
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      const composer = (canvas as any).__effectComposer as EffectComposer;
      if (composer) {
        composer.setSize(originalSize.width, originalSize.height);
        
        // Reset the render targets to original size
        composer.passes.forEach(pass => {
          if (pass.setSize) {
            pass.setSize(originalSize.width, originalSize.height);
          }
        });
      }
    }
  }, [width, height, verifyImageDimensions]);
  
  // Function to export a single frame
  const exportFrame = useCallback(async () => {
    // Get the THREE.js renderer and scene from the viewport
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const renderer = (canvas as any).__r3f?.fiber?.renderer as THREE.WebGLRenderer;
    const scene = (canvas as any).__r3f?.fiber?.scene as THREE.Scene;
    const camera = (canvas as any).__r3f?.fiber?.camera as THREE.Camera;
    
    if (!canvas || !renderer || !scene || !camera) {
      toast({
        title: "Error",
        description: "Could not access the 3D scene",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Log the current pixel ratio and dimensions for debugging
      console.log("Export dimensions:", {
        requestedWidth: width,
        requestedHeight: height,
        currentPixelRatio: renderer.getPixelRatio(),
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        aspectRatio: width / height
      });
      
      // Log camera information for debugging
      if (camera instanceof THREE.PerspectiveCamera) {
        console.log("Camera (Perspective):", {
          aspect: camera.aspect,
          fov: camera.fov,
          position: camera.position.toArray()
        });
      } else if (camera instanceof THREE.OrthographicCamera) {
        console.log("Camera (Orthographic):", {
          left: camera.left,
          right: camera.right,
          top: camera.top,
          bottom: camera.bottom,
          aspect: (camera.right - camera.left) / (camera.top - camera.bottom),
          position: camera.position.toArray()
        });
      }
      
      // Render the frame using the current camera settings with effects
      const dataURL = await renderFrame(0, scene, camera, renderer);
      
      // Create and trigger download
      const link = document.createElement("a");
      link.download = `sprite-export-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
      link.href = dataURL;
      link.click();
      
      toast({
        title: "Success",
        description: "Frame exported successfully with effects applied",
      });
    } catch (error: any) {
      console.error("Error exporting frame:", error);
      toast({
        title: "Error",
        description: `Failed to export frame: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [renderFrame, width, height]);
  
  // NEW: Function to export sprite sheet
  const exportSpriteSheet = useCallback(async (
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    currentAnimation: string,
    totalFrames: number,
    framesToRender: number[]
  ) => {
    try {
      // Calculer la disposition de la grille
      const frameCount = framesToRender.length;
      const columns = Math.ceil(Math.sqrt(frameCount));
      const rows = Math.ceil(frameCount / columns);
      
      // Créer un canvas pour le sprite sheet
      const spriteSheetCanvas = document.createElement('canvas');
      spriteSheetCanvas.width = width * columns;
      spriteSheetCanvas.height = height * rows;
      
      const ctx = spriteSheetCanvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get 2D context for sprite sheet");
      }
      
      // Effacer le canvas avec un fond transparent
      ctx.clearRect(0, 0, spriteSheetCanvas.width, spriteSheetCanvas.height);
      
      toast({
        title: "Creating Sprite Sheet",
        description: `Rendering ${frameCount} frames in a ${columns}x${rows} grid...`,
      });
      
      // Rendre chaque frame
      for (let i = 0; i < framesToRender.length; i++) {
        const frameIndex = framesToRender[i];
        
        // Dispatcher un événement pour mettre à jour l'animation à la frame actuelle
        const frameEvent = new CustomEvent('frame-change', { 
          detail: { frame: frameIndex, totalFrames } 
        });
        window.dispatchEvent(frameEvent);
        
        // Attendre un peu pour que l'animation se mette à jour
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Rendre la frame avec les effets appliqués
        const dataURL = await renderFrame(frameIndex, scene, camera, renderer);
        
        // Créer une image temporaire pour cette frame
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataURL;
        });
        
        // Calculer la position dans la grille
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = col * width;
        const y = row * height;
        
        // Dessiner la frame dans le sprite sheet
        ctx.drawImage(img, x, y, width, height);
      }
      
      // Convertir en base64
      const spriteSheetDataURL = spriteSheetCanvas.toDataURL('image/png');
      const base64Data = spriteSheetDataURL.replace(/^data:image\/png;base64,/, "");
      
      // Nettoyer le nom de l'animation pour Windows
      const sanitizedAnimationName = currentAnimation.replace(/[<>:"|?*\/\\]/g, '_');
      const filename = `${outputFolder}/${sanitizedAnimationName}_spritesheet_${columns}x${rows}.png`;
      
      // Vérifier quelle API est disponible
      const hasElectronAPI = window.electron && typeof window.electron.saveFile === 'function';
      const hasElectronAPIFallback = window.electronAPI && typeof window.electronAPI.saveImageFile === 'function';
      
      // Sauvegarder le fichier
      let fileSaved = false;
      
      // Essayer window.electron d'abord
      if (hasElectronAPI) {
        fileSaved = await window.electron.saveFile(filename, base64Data);
      }
      
      // Essayer window.electronAPI comme fallback
      if (!fileSaved && hasElectronAPIFallback) {
        fileSaved = await window.electronAPI.saveImageFile(filename, base64Data);
      }
      
      if (!fileSaved) {
        throw new Error(`Failed to save sprite sheet: ${filename}`);
      }
      
      toast({
        title: "Sprite Sheet Exported",
        description: `Saved as ${columns}x${rows} grid with ${frameCount} frames`,
      });
      
      return filename;
    } catch (error: any) {
      console.error("Error exporting sprite sheet:", error);
      throw error;
    }
  }, [renderFrame, width, height, outputFolder]);
  
  // Function to export sequence of frames
  const exportSequence = useCallback(async (
    currentAnimation: string | null, 
    totalFrames: number
  ) => {
    if (!outputFolder) {
      toast({
        title: "Error",
        description: "Please select an output folder first",
        variant: "destructive"
      });
      return;
    }

    if (!currentAnimation) {
      toast({
        title: "Error",
        description: "No animation selected",
        variant: "destructive"
      });
      return;
    }

    // Check if any file system API is available
    const hasElectronAPI = window.electron && 
      typeof window.electron.saveFile === 'function' && 
      typeof window.electron.createDirectory === 'function';
    
    const hasElectronAPIFallback = window.electronAPI && 
      typeof window.electronAPI.saveImageFile === 'function' && 
      typeof window.electronAPI.createDirectory === 'function';
    
    if (!hasElectronAPI && !hasElectronAPIFallback) {
      console.error("No file system API available:", { 
        electron: window.electron, 
        electronAPI: window.electronAPI 
      });
      toast({
        title: "Error",
        description: "File system access is not available",
        variant: "destructive"
      });
      return;
    }

    // Get the THREE.js renderer and scene from the viewport
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const renderer = (canvas as any).__r3f?.fiber?.renderer as THREE.WebGLRenderer;
    const scene = (canvas as any).__r3f?.fiber?.scene as THREE.Scene;
    const camera = (canvas as any).__r3f?.fiber?.camera as THREE.Camera;
    
    if (!canvas || !renderer || !scene || !camera) {
      toast({
        title: "Error",
        description: "Could not access the 3D scene",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create animation folder
      const sanitizedAnimationName = currentAnimation.replace(/[<>:"|?*\/\\]/g, '_');
      const animationFolder = `${outputFolder}/${sanitizedAnimationName}`;      
      console.log("Creating directory:", animationFolder);
      
      let directoryCreated = false;
      
      // Try window.electron first
      if (hasElectronAPI) {
        console.log("Using window.electron.createDirectory");
        directoryCreated = await window.electron.createDirectory(animationFolder);
      }
      
      // Try window.electronAPI as fallback
      if (!directoryCreated && hasElectronAPIFallback) {
        console.log("Using window.electronAPI.createDirectory");
        directoryCreated = await window.electronAPI.createDirectory(animationFolder);
      }
      
      if (!directoryCreated) {
        throw new Error(`Failed to create directory: ${animationFolder}`);
      }

      // Calculate which frames to render based on render steps
      const framesToRender: number[] = [];
      if (renderSteps === 1 || renderSteps >= totalFrames) {
        // Export toutes les frames
        for (let i = 0; i < totalFrames; i++) {
          framesToRender.push(i);
        }
      } else {
        // Échantillonnage selon renderSteps
        const step = Math.max(1, Math.floor(totalFrames / renderSteps));
        for (let i = 0; i < totalFrames; i += step) {
          framesToRender.push(i);
        }
      }
      
      // Make sure the last frame is included
      if (framesToRender[framesToRender.length - 1] !== totalFrames - 1) {
        framesToRender.push(totalFrames - 1);
      }
      
      // Get the export view settings once before starting the export
      // This ensures all frames use the same camera settings
      const exportViewSettings = (canvas as any).__getExportViewSettings?.();
      
      // Show progress toast
      toast({
        title: "Export Started",
        description: `Exporting ${framesToRender.length} frames with effects applied...`,
      });
      
      // Export each frame
      for (let i = 0; i < framesToRender.length; i++) {
        const frameIndex = framesToRender[i];
        
        // Dispatch a custom event to update the animation mixer to the current frame
        const frameEvent = new CustomEvent('frame-change', { 
          detail: { frame: frameIndex, totalFrames } 
        });
        window.dispatchEvent(frameEvent);
        
        // Wait a bit for the animation to update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Render the frame with effects applied
        const dataURL = await renderFrame(frameIndex, scene, camera, renderer);
        
        // Remove the data:image/png;base64, prefix
        const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
        
        // Generate filename with padding
        const paddedIndex = frameIndex.toString().padStart(4, '0');
        const filename = `${animationFolder}/frame_${paddedIndex}.png`;
        
        console.log(`Saving frame ${frameIndex + 1}/${framesToRender.length} to ${filename} with effects applied`);
        
        let fileSaved = false;
        
        // Try window.electron first
        if (hasElectronAPI) {
          console.log("Using window.electron.saveFile");
          fileSaved = await window.electron.saveFile(filename, base64Data);
        }
        
        // Try window.electronAPI as fallback
        if (!fileSaved && hasElectronAPIFallback) {
          console.log("Using window.electronAPI.saveImageFile");
          fileSaved = await window.electronAPI.saveImageFile(filename, base64Data);
        }
        
        if (!fileSaved) {
          throw new Error(`Failed to save file: ${filename}`);
        }
        
        // Update progress toast
        toast({
          title: "Export Progress",
          description: `Frame ${i + 1}/${framesToRender.length} exported with effects`,
        });
      }
      
      // NEW: Exporter aussi le sprite sheet
      toast({
        title: "Creating Sprite Sheet",
        description: "Combining frames into a single image...",
      });
      
      await exportSpriteSheet(scene, camera, renderer, currentAnimation, totalFrames, framesToRender);
      
      toast({
        title: "Export Complete",
        description: `${framesToRender.length} frames + sprite sheet exported to ${animationFolder}`,
      });
    } catch (error: any) {
      console.error("Error exporting sequence:", error);
      toast({
        title: "Error",
        description: `Failed to export sequence: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [renderFrame, outputFolder, renderSteps, exportSpriteSheet]);
  
  return {
    width,
    height,
    backgroundColor,
    renderSteps,
    outputFolder,
    setWidth,
    setHeight,
    setBackgroundColor,
    setRenderSteps,
    selectOutputFolder,
    exportFrame,
    exportSequence
  };
};