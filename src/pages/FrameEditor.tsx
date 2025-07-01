import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  FolderOpen, 
  Download, 
  Film,
  SkipBack,
  SkipForward,
  ArrowLeft
} from "lucide-react";
import { useFrameEditor } from "@/hooks/useFrameEditor";
import { useNavigate } from "react-router-dom";

const FrameEditor = () => {
  const navigate = useNavigate();
  const {
    frames,
    isLoading,
    currentFrame,
    isPlaying,
    fps,
    importFramesFromFolder,
    toggleFrame,
    setCurrentFrame,
    setIsPlaying,
    setFps,
    exportAsSpriteSheet,
    exportAsGif,
    getActiveFrames
  } = useFrameEditor();

  const activeFrames = getActiveFrames();
  const hasFrames = frames.length > 0;
  const currentActiveFrame = activeFrames[currentFrame];

  const handlePreviousFrame = () => {
    if (activeFrames.length === 0) return;
    setCurrentFrame((prev) => (prev - 1 + activeFrames.length) % activeFrames.length);
  };

  const handleNextFrame = () => {
    if (activeFrames.length === 0) return;
    setCurrentFrame((prev) => (prev + 1) % activeFrames.length);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to 3D Mode
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-lg font-semibold">Frame Editor</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={importFramesFromFolder}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Import Frames
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 flex items-center justify-center p-8 min-h-0">
          {currentActiveFrame ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              <img
                src={currentActiveFrame.data}
                alt={`Frame ${currentFrame + 1}`}
                className="max-w-full max-h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="absolute bottom-4 left-4 bg-black/75 text-white px-3 py-1 rounded text-sm">
                Frame {currentFrame + 1} / {activeFrames.length}
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No frames loaded</h2>
              <p className="text-muted-foreground mb-4">
                Import PNG frames from a folder to get started
              </p>
              <Button onClick={importFramesFromFolder} disabled={isLoading}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Import Frames
              </Button>
            </Card>
          )}
        </div>

        {/* Controls */}
        {hasFrames && (
          <div className="border-t">
            {/* Playback Controls */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousFrame}
                    disabled={isPlaying || activeFrames.length === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant={isPlaying ? "outline" : "default"}
                    size="icon"
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={activeFrames.length === 0}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextFrame}
                    disabled={isPlaying || activeFrames.length === 0}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <Separator orientation="vertical" className="h-8" />

                <div className="flex items-center gap-3">
                  <Label htmlFor="fps-slider" className="min-w-[100px]">
                    Speed: {fps} FPS
                  </Label>
                  <Slider
                    id="fps-slider"
                    value={[fps]}
                    onValueChange={([value]) => setFps(value)}
                    min={1}
                    max={60}
                    step={1}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAsSpriteSheet}
                  disabled={activeFrames.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Sprite Sheet
                </Button>
              </div>
            </div>

            {/* Frame Timeline */}
            <div className="border-t p-4 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {frames.map((frame, index) => {
                  const isActive = activeFrames.findIndex(f => f.id === frame.id) === currentFrame;
                  
                  return (
                    <div
                      key={frame.id}
                      className={`relative cursor-pointer transition-all ${
                        !frame.enabled ? 'opacity-50' : ''
                      }`}
                      onClick={() => {
                        if (frame.enabled) {
                          const activeIndex = activeFrames.findIndex(f => f.id === frame.id);
                          if (activeIndex !== -1) {
                            setCurrentFrame(activeIndex);
                          }
                        }
                      }}
                    >
                      <div className={`relative border-2 rounded overflow-hidden ${
                        isActive ? 'border-primary ring-2 ring-primary/50' : 'border-border'
                      }`}>
                        <img
                          src={frame.data}
                          alt={frame.filename}
                          className="w-20 h-20 object-cover"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="absolute top-1 right-1">
                          <Checkbox
                            checked={frame.enabled}
                            onCheckedChange={() => toggleFrame(index)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-background/80"
                          />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white text-xs px-1 py-0.5 text-center">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {frames.length > 0 && (
                <div className="mt-4 text-sm text-muted-foreground">
                  {activeFrames.length} of {frames.length} frames active
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrameEditor;