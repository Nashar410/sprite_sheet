// src/hooks/useSafeModelCalibration.tsx
import { useState, useCallback } from "react";
import * as THREE from "three";

export interface SafeModelCalibration {
  originalScale: number;
  normalizedScale: number;
  groundOffset: number;
  frontFaceRotation: number;
  isFrontFaceSet: boolean;
  originalSize: { width: number; height: number; depth: number };
  targetHeight: number;
}

export const useSafeModelCalibration = () => {
  const [calibration, setCalibration] = useState<SafeModelCalibration | null>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Analyse un modèle pour créer une calibration
  const analyzeModel = useCallback((model: any) => {
    if (!model?.scene) return null;

    try {
      const box = new THREE.Box3().setFromObject(model.scene);
      const size = new THREE.Vector3();
      box.getSize(size);

      const originalHeight = size.y;
      let targetHeight = 1.5; // Hauteur cible plus conservative
      
      // Échelle limitée pour éviter les problèmes
      let normalizedScale = originalHeight > 0 ? targetHeight / originalHeight : 1;
      normalizedScale = Math.min(normalizedScale, 20); // Max 20x
      normalizedScale = Math.max(normalizedScale, 0.5); // Min 0.5x

      const groundOffset = -box.min.y * normalizedScale;

      const newCalibration: SafeModelCalibration = {
        originalScale: 1,
        normalizedScale,
        groundOffset,
        frontFaceRotation: 0,
        isFrontFaceSet: false,
        originalSize: {
          width: size.x,
          height: size.y,
          depth: size.z
        },
        targetHeight
      };

      console.log("📊 Model analyzed:", {
        originalHeight: originalHeight.toFixed(3),
        scale: normalizedScale.toFixed(3),
        groundOffset: groundOffset.toFixed(3)
      });

      return newCalibration;
    } catch (error) {
      console.error("Error analyzing model:", error);
      return null;
    }
  }, []);

  // Applique la calibration de manière sécurisée
  const applyCalibration = useCallback((newCalibration: SafeModelCalibration) => {
    try {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      const scene = (canvas as any).__r3f?.fiber?.scene;
      
      if (!scene) {
        console.warn("Scene not available for calibration");
        return false;
      }

      const container = scene.getObjectByName("importedModel");
      if (!container) {
        console.warn("Model container not found");
        return false;
      }

      // Application progressive pour éviter les glitches
      container.scale.setScalar(newCalibration.normalizedScale);
      container.position.y = newCalibration.groundOffset;
      
      if (newCalibration.isFrontFaceSet) {
        container.rotation.y = newCalibration.frontFaceRotation;
      }

      setCalibration(newCalibration);
      console.log("✅ Calibration applied successfully");
      return true;
    } catch (error) {
      console.error("Error applying calibration:", error);
      return false;
    }
  }, []);

  // Calibration manuelle déclenchée par l'utilisateur
  const manualCalibrate = useCallback((model: any) => {
    if (!model) return;

    setIsCalibrating(true);
    
    // Délai pour éviter les conflits avec le rendu
    setTimeout(() => {
      const newCalibration = analyzeModel(model);
      if (newCalibration) {
        const success = applyCalibration(newCalibration);
        if (!success) {
          console.warn("Failed to apply calibration");
        }
      }
      setIsCalibrating(false);
    }, 100);
  }, [analyzeModel, applyCalibration]);

  // Définit la face de référence
  const setFrontFace = useCallback(() => {
    if (!calibration) return;

    try {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      const scene = (canvas as any).__r3f?.fiber?.scene;
      const container = scene?.getObjectByName("importedModel");
      
      if (container) {
        const updatedCalibration = {
          ...calibration,
          frontFaceRotation: container.rotation.y,
          isFrontFaceSet: true
        };
        
        setCalibration(updatedCalibration);
        console.log("👤 Front face set to:", (container.rotation.y * 180 / Math.PI).toFixed(1), "degrees");
      }
    } catch (error) {
      console.error("Error setting front face:", error);
    }
  }, [calibration]);

  // Rotation vers un angle prédéfini
  const rotateToAngle = useCallback((angleName: string) => {
    if (!calibration?.isFrontFaceSet) return;

    const angles: Record<string, number> = {
      face: calibration.frontFaceRotation,
      dos: calibration.frontFaceRotation + Math.PI,
      profil_droit: calibration.frontFaceRotation + Math.PI / 2,
      profil_gauche: calibration.frontFaceRotation - Math.PI / 2,
      trois_quart_droite: calibration.frontFaceRotation + Math.PI / 4,
      trois_quart_gauche: calibration.frontFaceRotation - Math.PI / 4
    };

    const targetAngle = angles[angleName];
    if (targetAngle === undefined) return;

    try {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      const scene = (canvas as any).__r3f?.fiber?.scene;
      const container = scene?.getObjectByName("importedModel");
      
      if (container) {
        container.rotation.y = targetAngle;
        console.log(`🔄 Rotated to ${angleName}:`, (targetAngle * 180 / Math.PI).toFixed(1), "degrees");
      }
    } catch (error) {
      console.error("Error rotating model:", error);
    }
  }, [calibration]);

  // Sauvegarde de profil
  const saveProfile = useCallback((name: string) => {
    if (!calibration) return;

    try {
      const profiles = JSON.parse(localStorage.getItem('sprite-calibration-profiles') || '{}');
      profiles[name] = {
        calibration,
        timestamp: Date.now(),
        version: "1.0"
      };
      localStorage.setItem('sprite-calibration-profiles', JSON.stringify(profiles));
      console.log("💾 Profile saved:", name);
      return true;
    } catch (error) {
      console.error("Error saving profile:", error);
      return false;
    }
  }, [calibration]);

  // Chargement de profil
  const loadProfile = useCallback((name: string) => {
    try {
      const profiles = JSON.parse(localStorage.getItem('sprite-calibration-profiles') || '{}');
      const profile = profiles[name];
      
      if (profile?.calibration) {
        const success = applyCalibration(profile.calibration);
        if (success) {
          console.log("📂 Profile loaded:", name);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error loading profile:", error);
      return false;
    }
  }, [applyCalibration]);

  // Liste des profils disponibles
  const getProfiles = useCallback(() => {
    try {
      const profiles = JSON.parse(localStorage.getItem('sprite-calibration-profiles') || '{}');
      return Object.keys(profiles);
    } catch {
      return [];
    }
  }, []);

  // Reset
  const reset = useCallback(() => {
    setCalibration(null);
    setIsCalibrating(false);
  }, []);

  return {
    // État
    calibration,
    isCalibrating,
    
    // Actions principales
    manualCalibrate,
    setFrontFace,
    rotateToAngle,
    
    // Profils
    saveProfile,
    loadProfile,
    getProfiles,
    
    // Utilitaires
    reset
  };
};