// src/components/SafeMultiExport.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Grid3X3, 
  Eye,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SafeMultiExportProps {
  hasCalibration: boolean;
  isFrontFaceSet: boolean;
  currentAnimation: string | null;
  totalFrames: number;
  outputFolder: string | null;
  onRotateToAngle: (angle: string) => void;
  onExportSequence: (animation: string, frames: number) => Promise<void>;
}

export const SafeMultiExport: React.FC<SafeMultiExportProps> = ({
  hasCalibration,
  isFrontFaceSet,
  currentAnimation,
  totalFrames,
  outputFolder,
  onRotateToAngle,
  onExportSequence
}) => {
  const [selectedAngles, setSelectedAngles] = useState<string[]>(["face", "profil_droit", "profil_gauche", "dos"]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentAngle, setCurrentAngle] = useState<string | null>(null);

  const availableAngles = [
    { key: "face", label: "Face", icon: "👤", description: "Vue de face" },
    { key: "dos", label: "Dos", icon: "🔄", description: "Vue arrière" },
    { key: "profil_droit", label: "Profil Droit", icon: "➡️", description: "Côté droit" },
    { key: "profil_gauche", label: "Profil Gauche", icon: "⬅️", description: "Côté gauche" },
    { key: "trois_quart_droite", label: "3/4 Droite", icon: "↗️", description: "3/4 face droite" },
    { key: "trois_quart_gauche", label: "3/4 Gauche", icon: "↖️", description: "3/4 face gauche" }
  ];

  const toggleAngle = (angleKey: string) => {
    setSelectedAngles(prev => 
      prev.includes(angleKey)
        ? prev.filter(a => a !== angleKey)
        : [...prev, angleKey]
    );
  };

  const selectPreset = (preset: string) => {
    switch (preset) {
      case "standard":
        setSelectedAngles(["face", "profil_droit", "profil_gauche", "dos"]);
        break;
      case "all":
        setSelectedAngles(availableAngles.map(a => a.key));
        break;
      case "none":
        setSelectedAngles([]);
        break;
    }
  };

  const canExport = hasCalibration && 
                   isFrontFaceSet && 
                   outputFolder && 
                   currentAnimation && 
                   totalFrames > 0 && 
                   selectedAngles.length > 0;

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      for (let i = 0; i < selectedAngles.length; i++) {
        const angleKey = selectedAngles[i];
        setCurrentAngle(angleKey);
        
        // Rotation vers l'angle
        onRotateToAngle(angleKey);
        
        // Délai pour la rotation
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Export de la séquence
        await onExportSequence(currentAnimation!, totalFrames);
        
        // Mise à jour du progrès
        const progress = ((i + 1) / selectedAngles.length) * 100;
        setExportProgress(progress);
        
        // Petit délai entre les exports
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      toast({
        title: "Export terminé",
        description: `${selectedAngles.length} angles exportés avec succès`
      });

    } catch (error: any) {
      toast({
        title: "Erreur d'export",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setCurrentAngle(null);
    }
  };

  const getStatusInfo = () => {
    if (!hasCalibration) return { color: "destructive", text: "Modèle non calibré", icon: AlertTriangle };
    if (!isFrontFaceSet) return { color: "secondary", text: "Face non définie", icon: AlertTriangle };
    if (!outputFolder) return { color: "secondary", text: "Dossier requis", icon: AlertTriangle };
    if (!currentAnimation) return { color: "secondary", text: "Animation requise", icon: AlertTriangle };
    if (selectedAngles.length === 0) return { color: "secondary", text: "Aucun angle", icon: AlertTriangle };
    return { color: "default", text: "Prêt", icon: CheckCircle };
  };

  const { color, text, icon: StatusIcon } = getStatusInfo();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            <CardTitle className="text-sm">Export Multi-Angles</CardTitle>
          </div>
          <Badge variant={color as any} className="text-xs">
            <StatusIcon className="h-3 w-3 mr-1" />
            {text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Sélection rapide */}
        <div className="space-y-2">
          <Label className="text-xs">Sélection rapide</Label>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectPreset("standard")}
              className="text-xs"
            >
              Standard
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectPreset("all")}
              className="text-xs"
            >
              Tous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => selectPreset("none")}
              className="text-xs"
            >
              Aucun
            </Button>
          </div>
        </div>

        {/* Liste des angles */}
        <div className="space-y-2">
          <Label className="text-xs">Angles à exporter ({selectedAngles.length})</Label>
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {availableAngles.map((angle) => {
                const isSelected = selectedAngles.includes(angle.key);
                return (
                  <div
                    key={angle.key}
                    className={`flex items-center justify-between p-2 rounded border text-xs ${
                      isSelected ? 'bg-accent/50 border-accent' : 'bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAngle(angle.key)}
                        disabled={!isFrontFaceSet}
                      />
                      <span>{angle.icon}</span>
                      <div>
                        <div className="font-medium">{angle.label}</div>
                        <div className="text-muted-foreground">{angle.description}</div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRotateToAngle(angle.key)}
                      disabled={!isFrontFaceSet}
                      className="h-6 w-6 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Info export */}
        {canExport && (
          <div className="p-2 bg-muted/30 rounded text-xs">
            <div className="font-medium mb-1">Aperçu export</div>
            <div className="space-y-0.5 text-muted-foreground">
              <div>Angles: {selectedAngles.length}</div>
              <div>Animation: {currentAnimation}</div>
              <div>Frames: {totalFrames}</div>
            </div>
          </div>
        )}

        {/* Barre de progression */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Export en cours...</span>
              <span>{Math.round(exportProgress)}%</span>
            </div>
            <Progress value={exportProgress} className="h-2" />
            {currentAngle && (
              <div className="text-xs text-muted-foreground">
                Angle: {availableAngles.find(a => a.key === currentAngle)?.label}
              </div>
            )}
          </div>
        )}

        {/* Bouton export */}
        <Button
          onClick={handleExport}
          disabled={!canExport || isExporting}
          className="w-full"
          size="sm"
        >
          <Download className="h-3 w-3 mr-2" />
          {isExporting ? "Export..." : `Exporter ${selectedAngles.length} angles`}
        </Button>

        {/* Messages d'aide */}
        {!canExport && (
          <div className="text-xs text-muted-foreground space-y-1">
            {!hasCalibration && <div>• Calibrez le modèle</div>}
            {!isFrontFaceSet && <div>• Définissez la face</div>}
            {!outputFolder && <div>• Sélectionnez un dossier de sortie</div>}
            {!currentAnimation && <div>• Sélectionnez une animation</div>}
            {selectedAngles.length === 0 && <div>• Choisissez au moins un angle</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};