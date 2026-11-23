import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import {
  InhouseKYCService,
  normalizeNRCNumber,
  validateDocumentNumber,
  type KYCApplication,
  type KYCDocumentType,
} from "@/services/InhouseKYCService";
import SelfieCapture from "./SelfieCapture";
import {
  CreditCard,
  BookUser,
  Upload,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

/**
 * PalmCacia's own guided identity verification (replaces Didit).
 * Steps: document type → document photo → live selfie → your details →
 * review & submit. Every submission is reviewed by a person on our team;
 * the copy says exactly that.
 */

const MAX_DOC_BYTES = 10 * 1024 * 1024;

/** Cheap sharpness estimate (variance of a Laplacian pass on a downscaled
 *  grayscale frame). Returns null when it cannot be measured (e.g. PDF). */
async function estimateSharpness(file: File): Promise<number | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = 160;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const gray = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
      gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = y * size + x;
        const lap = gray[idx - 1] + gray[idx + 1] + gray[idx - size] + gray[idx + size] - 4 * gray[idx];
        sum += lap;
        sumSq += lap * lap;
        n++;
      }
    }
    const mean = sum / n;
    return sumSq / n - mean * mean;
  } catch {
    return null;
  }
}

interface KYCVerificationFlowProps {
  onSubmitted?: (application: KYCApplication) => void;
}

const STEPS = ["Document", "Photo", "Selfie", "Details", "Review"];

const KYCVerificationFlow = ({ onSubmitted }: KYCVerificationFlowProps) => {
  const { user, accountDetails } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState<KYCDocumentType>("nrc");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [docWarning, setDocWarning] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [details, setDetails] = useState(() => ({
    firstName: accountDetails?.first_name ?? "",
    lastName: accountDetails?.last_name ?? "",
    phone: accountDetails?.phone_number ?? "",
    dateOfBirth: accountDetails?.date_of_birth ?? "",
    documentNumber: "",
  }));
  const [detailsTouched, setDetailsTouched] = useState(false);

  // Late-arriving account details prefill the form once (never re-asked
  // after the user has started editing).
  if (!detailsTouched && accountDetails && !details.firstName && accountDetails.first_name) {
    setDetails({
      firstName: accountDetails.first_name ?? "",
      lastName: accountDetails.last_name ?? "",
      phone: accountDetails.phone_number ?? "",
      dateOfBirth: accountDetails.date_of_birth ?? "",
      documentNumber: "",
    });
  }

  const documentNumberError = useMemo(
    () => validateDocumentNumber(documentType, details.documentNumber),
    [documentType, details.documentNumber],
  );

  const handleDocumentFile = async (file: File) => {
    setDocWarning(null);
    if (file.size > MAX_DOC_BYTES) {
      toast({ title: "File too large", description: "Documents must be 10 MB or smaller.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast({ title: "Unsupported file", description: "Upload a photo (JPG/PNG) or a PDF of your document.", variant: "destructive" });
      return;
    }
    setDocumentFile(file);
    if (documentPreview) URL.revokeObjectURL(documentPreview);
    setDocumentPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    const sharpness = await estimateSharpness(file);
    if (sharpness !== null && sharpness < 40) {
      setDocWarning("This photo looks blurry. A reviewer must be able to read every word — retake it in good light if you can.");
    }
  };

  const canProceed = (() => {
    switch (step) {
      case 0: return true;
      case 1: return !!documentFile;
      case 2: return !!selfieBlob;
      case 3:
        return (
          !!details.firstName.trim() &&
          !!details.lastName.trim() &&
          !!details.phone.trim() &&
          !!details.dateOfBirth &&
          !documentNumberError
        );
      default: return true;
    }
  })();

  const handleSubmit = async () => {
    if (!user || !documentFile || !selfieBlob) return;
    setSubmitting(true);
    try {
      const documentNumber =
        documentType === "nrc"
          ? (normalizeNRCNumber(details.documentNumber) ?? details.documentNumber.trim())
          : details.documentNumber.trim().toUpperCase();
      const application = await InhouseKYCService.submitApplication(user.id, {
        documentType,
        documentNumber,
        firstName: details.firstName,
        lastName: details.lastName,
        phone: details.phone,
        dateOfBirth: details.dateOfBirth,
        documentFile,
        selfieBlob,
      });
      setSubmitted(true);
      toast({
        title: "Verification submitted",
        description: "A member of our team will review your documents and selfie. You'll see the outcome here.",
      });
      onSubmitted?.(application);
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
        Sign in to verify your identity.
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-4 rounded-xl border border-border p-6 text-center">
        <CheckCircle className="mx-auto h-14 w-14 text-gain" />
        <h3 className="text-xl font-semibold">Application received</h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Your document and selfie are with our review team. Every application is checked by a
          person — not an automated system — and most reviews finish within 1–2 business days.
          Your status will update on this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step + 1} of {STEPS.length} — {STEPS[step]}</span>
          <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Reviewed by a person on our team</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="w-full" />
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Which document will you use?</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDocumentType("nrc")}
              className={`rounded-xl border p-4 text-left transition-colors ${documentType === "nrc" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <CreditCard className="mb-2 h-6 w-6 text-primary" />
              <div className="font-medium">Zambian National Registration Card</div>
              <div className="text-sm text-muted-foreground">The green NRC issued by the Department of National Registration.</div>
            </button>
            <button
              type="button"
              onClick={() => setDocumentType("passport")}
              className={`rounded-xl border p-4 text-left transition-colors ${documentType === "passport" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <BookUser className="mb-2 h-6 w-6 text-primary" />
              <div className="font-medium">Passport</div>
              <div className="text-sm text-muted-foreground">A valid passport, opened at the photo page.</div>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            These are the only two documents we accept. The name on the document must match your account.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold">
            Photo of your {documentType === "nrc" ? "National Registration Card" : "passport"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Take a clear colour photo of the whole document — all four corners visible, no glare,
            nothing covered. You can also upload a scan or PDF.
          </p>
          {documentPreview ? (
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-border">
              <img src={documentPreview} alt="Your document" className="w-full" />
            </div>
          ) : documentFile ? (
            <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <FileCheck className="h-5 w-5 text-gain" /> {documentFile.name}
            </div>
          ) : null}
          {docWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>{docWarning}</span>
            </div>
          )}
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            {documentFile ? "Choose a different file" : "Choose document photo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleDocumentFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Take a live selfie</h3>
          <p className="text-sm text-muted-foreground">
            Our reviewer compares this selfie with the photo on your document, so use good light
            and look straight at the camera.
          </p>
          <SelfieCapture onCapture={setSelfieBlob} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Your details, exactly as printed</h3>
          <p className="text-sm text-muted-foreground">
            Anything we already have on your account is filled in — just check it matches your document.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kyc-first-name">First name</Label>
              <Input
                id="kyc-first-name"
                value={details.firstName}
                onChange={(e) => { setDetailsTouched(true); setDetails({ ...details, firstName: e.target.value }); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kyc-last-name">Last name</Label>
              <Input
                id="kyc-last-name"
                value={details.lastName}
                onChange={(e) => { setDetailsTouched(true); setDetails({ ...details, lastName: e.target.value }); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kyc-doc-number">{documentType === "nrc" ? "NRC number" : "Passport number"}</Label>
              <Input
                id="kyc-doc-number"
                placeholder={documentType === "nrc" ? "123456/78/9" : "e.g. ZN123456"}
                value={details.documentNumber}
                onChange={(e) => { setDetailsTouched(true); setDetails({ ...details, documentNumber: e.target.value }); }}
              />
              {details.documentNumber && documentNumberError && (
                <p className="text-xs text-destructive">{documentNumberError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="kyc-dob">Date of birth</Label>
              <Input
                id="kyc-dob"
                type="date"
                value={details.dateOfBirth}
                onChange={(e) => { setDetailsTouched(true); setDetails({ ...details, dateOfBirth: e.target.value }); }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="kyc-phone">Phone number</Label>
              <Input
                id="kyc-phone"
                type="tel"
                placeholder="+260 9XX XXX XXX"
                value={details.phone}
                onChange={(e) => { setDetailsTouched(true); setDetails({ ...details, phone: e.target.value }); }}
              />
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Check everything, then submit</h3>
          <dl className="space-y-2 rounded-xl border border-border p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Document</dt><dd className="font-medium">{documentType === "nrc" ? "National Registration Card" : "Passport"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Number</dt><dd className="font-medium">{documentType === "nrc" ? (normalizeNRCNumber(details.documentNumber) ?? details.documentNumber) : details.documentNumber.toUpperCase()}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{details.firstName} {details.lastName}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Date of birth</dt><dd className="font-medium">{details.dateOfBirth}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{details.phone}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Document photo</dt><dd className="font-medium">{documentFile?.name}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Selfie</dt><dd className="font-medium">Captured live</dd></div>
          </dl>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
            Your photos are stored privately and only our review team can see them. A person —
            not an automated system — checks that your selfie matches your document and that the
            details line up.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0 || submitting}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" disabled={!canProceed} onClick={() => setStep((s) => s + 1)}>
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
            Submit for review
          </Button>
        )}
      </div>
    </div>
  );
};

export default KYCVerificationFlow;
