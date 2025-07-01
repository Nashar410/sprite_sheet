// src/components/SafeCalibrationPanel.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Target, 
  Eye, 
  Save, 
  FolderOpen,
  Grid3X3,
  User,
  RotateCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SafeCalibrationPanelProps {
  calibration: any;
  isCalibrating: boolean;
  hasModel: boolean;
  modelName?: string;
  onManualCalibrate: () => void;
  onSetFrontFace: () => void;
  onRotateToAngle: (angle: string) => void;
  onSaveProfile: (name: string) => boolean;
  onLoadProfile: (name: string) => boolean;
  availableProfiles: string[];
}

export const SafeCalibrationPanel: React.FC<SafeCalibrationPanelProps> = ({
  calibration,
  isCalibrating,
  hasModel,
  modelName,
  onManualCalibrate,
  onSetFrontFace,
  onRotateToAngle,
  onSaveProfile,
  onLoadProfile,
  availableProfiles
}) => {
  const [profileName, setProfileName] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("");

  const getStatus = () => {
    if (!calibration) return { text: "Non calibré", color: "destructive" };
    if (!calibration.isFrontFaceSet) return { text: "Face à définir", color: "secondary" };
    return { text: "Prêt", color: "default" };
  };

  const { text: statusText, color: statusColor } = getStatus();

  const presetAngles = [
    { key: "face", label: "Face", icon: "👤" },
    { key: "dos", label: "Dos", icon: "🔄" },
    { key: "profil_droit", label: "Profil D", icon: "➡️" },
    { key: "profil_gauche", label: "Profil G", icon: "⬅️" },
    { key: "trois_quart_droite", label: "3/4 D", icon: "↗️" },
    { key: "trois_quart_gauche", label: "3/4 G", icon: "↖️" }
  ];

  const handleSaveProfile = () => {
    if (!profileName.trim()) {
      toast({
        title: "Nom requis",
        description: "Entrez un nom pour le profil",
        variant: "destructive"
      });
      return;
    }

    const success = onSaveProfile(profileName.trim());
    if (success) {
      setProfileName("");
      toast({
        title: "Profil sauvegardé",
        description: `"${profileName}" sauvegardé avec succès`
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive"
      });
    }
  };

  const handleLoadProfile = () => {
    if (!selectedProfile) return;

    const success = onLoadProfile(selectedProfile);
    if (success) {
      toast({
        title: "Profil chargé",
        description: `"${selectedProfile}" chargé avec succès`
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <CardTitle className="text-sm">Calibration Pixel Art</CardTitle>
          </div>
          <Badge variant={statusColor as any} className="text-xs">
            {statusText}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info modèle */}
        {hasModel && (
          <div className="p-2 bg-muted/50 rounded text-xs">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="font-medium">{modelName || "Modèle"}</span>
            </div>
            {calibration && (
              <div className="mt-1 text-muted-foreground">
                Échelle: {calibration.normalizedScale.toFixed(1)}x
              </div>
            )}
          </div>
        )}

        {/* Calibration principale */}
        <div className="space-y-2">
          <Button
            onClick={onManualCalibrate}
            disabled={!hasModel || isCalibrating}
            className="w-full"
            size="sm"
          >
            <Target className="h-3 w-3 mr-2" />
            {isCalibrating ? "Calibrage..." : "Calibrer modèle"}
          </Button>
        </div>

        {/* Définition face */}
        {calibration && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">Orientation</Label>
              <Button
                onClick={onSetFrontFace}
                variant={calibration.isFrontFaceSet ? "default" : "outline"}
                className="w-full"
                size="sm"
              >
                <Eye className="h-3 w-3 mr-2" />
                {calibration.isFrontFaceSet ? "Redéfinir face" : "Définir face"}
              </Button>
              
              {calibration.isFrontFaceSet && (
                <div className="text-xs text-green-600 dark:text-green-400">
                  ✓ Face définie à {(calibration.frontFaceRotation * 180 / Math.PI).toFixed(0)}°
                </div>
              )}
            </div>
          </>
        )}

        {/* Angles prédéfinis */}
        {calibration?.isFrontFaceSet && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">Angles rapides</Label>
              <div className="grid grid-cols-3 gap-1">
                {presetAngles.map((angle) => (
                  <Button
                    key={angle.key}
                    onClick={() => onRotateToAngle(angle.key)}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                  >
                    <span className="mr-1">{angle.icon}</span>
                    {angle.label}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Profils */}
        <Separator />
        <div className="space-y-2">
          <Label className="text-xs">Profils</Label>
          
          {/* Sauvegarde */}
          <div className="flex gap-1">
            <Input
              placeholder="Nom profil..."
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="text-xs h-8"
              disabled={!calibration}
            />
            <Button
              onClick={handleSaveProfile}
              disabled={!calibration || !profileName.trim()}
              size="sm"
              className="h-8 px-2"
            >
              <Save className="h-3 w-3" />
            </Button>
          </div>

          {/* Chargement */}
          {availableProfiles.length > 0 && (
            <div className="flex gap-1">
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Charger..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((profile) => (
                    <SelectItem key={profile} value={profile} className="text-xs">
                      {profile}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleLoadProfile}
                disabled={!selectedProfile}
                size="sm"
                className="h-8 px-2"
              >
                <FolderOpen className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
          <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
            📋 Étapes:
          </div>
          <ol className="text-blue-700 dark:text-blue-300 space-y-0.5 list-decimal list-inside">
            <li>Calibrer le modèle</li>
            <li>Tourner vers la face souhaitée</li>
            <li>Définir cette orientation</li>
            <li>Utiliser les angles rapides</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};