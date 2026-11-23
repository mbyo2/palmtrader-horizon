import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

/**
 * Live-camera selfie capture. The face image can ONLY come from the device
 * camera in this moment — there is deliberately no file-upload path
 * (standing face-capture rule). The captured frame is returned as a JPEG
 * blob; nothing is uploaded until the parent form submits.
 */
interface SelfieCaptureProps {
  onCapture: (blob: Blob | null) => void;
}

const SelfieCapture = ({ onCapture }: SelfieCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  useEffect(() => () => stopStream(), []);

  const startCamera = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This device or browser does not expose a camera.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings, then try again — a live selfie is required and cannot be uploaded from your gallery."
          : "We could not open your camera. Check that no other app is using it, then try again — a live selfie is required and cannot be uploaded from your gallery.",
      );
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror the front-camera preview so the saved image matches what the
    // user saw.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPreviewUrl(URL.createObjectURL(blob));
          onCapture(blob);
          stopStream();
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onCapture(null);
    void startCamera();
  };

  if (previewUrl) {
    return (
      <div className="space-y-3">
        <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-border">
          <img src={previewUrl} alt="Your captured selfie" className="w-full" />
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gain">
          <CheckCircle className="h-4 w-4" /> Selfie captured from your live camera
        </div>
        <Button type="button" variant="outline" onClick={retake} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" /> Retake selfie
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-border bg-muted">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />
        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
            <Camera className="h-8 w-8" />
            Position your face in the frame, in good light, with no hat or sunglasses.
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>{error}</span>
        </div>
      )}
      {streaming ? (
        <Button type="button" onClick={capture} className="w-full">
          <Camera className="mr-2 h-4 w-4" /> Take selfie
        </Button>
      ) : (
        <Button type="button" onClick={() => void startCamera()} className="w-full">
          <Camera className="mr-2 h-4 w-4" /> Open camera
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">
        Your selfie must be taken live here — gallery uploads are not accepted for the face photo.
      </p>
    </div>
  );
};

export default SelfieCapture;
