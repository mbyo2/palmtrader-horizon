import { supabase } from "@/integrations/supabase/client";

/**
 * PalmCacia in-house KYC (replaces Didit).
 *
 * Users submit a document photo (NRC or Passport) plus a live-camera selfie
 * and their details. A PalmCacia admin reviews every submission by hand —
 * there is no automated liveness/OCR decision. Statuses live on
 * public.kyc_applications; account_details.kyc_status mirrors the outcome
 * via the review_kyc_application RPC.
 */

export type KYCApplicationStatus = "pending" | "approved" | "rejected";
export type KYCDocumentType = "nrc" | "passport";

export interface KYCApplication {
  id: string;
  user_id: string;
  document_type: KYCDocumentType;
  document_number: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  document_file_path: string;
  selfie_file_path: string;
  status: KYCApplicationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KYCSubmissionInput {
  documentType: KYCDocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  documentFile: File;
  selfieBlob: Blob;
}

const BUCKET = "kyc-documents";
// kyc_applications is newer than the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function extFromName(name: string, fallback: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 5 ? ext : fallback;
}

export class InhouseKYCService {
  /** Latest application for the signed-in user (RLS scopes the read). */
  static async getMyLatestApplication(userId: string): Promise<KYCApplication | null> {
    const { data, error } = await db
      .from("kyc_applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as KYCApplication) ?? null;
  }

  /**
   * Upload the document + selfie to the private KYC bucket and record the
   * application as pending human review.
   */
  static async submitApplication(userId: string, input: KYCSubmissionInput): Promise<KYCApplication> {
    const stamp = Date.now();
    const documentPath = `${userId}/application_${stamp}_document.${extFromName(input.documentFile.name, "jpg")}`;
    const selfiePath = `${userId}/application_${stamp}_selfie.jpg`;

    const { error: docError } = await supabase.storage
      .from(BUCKET)
      .upload(documentPath, input.documentFile, { contentType: input.documentFile.type || "image/jpeg" });
    if (docError) throw new Error(`Document upload failed: ${docError.message}`);

    const { error: selfieError } = await supabase.storage
      .from(BUCKET)
      .upload(selfiePath, input.selfieBlob, { contentType: "image/jpeg" });
    if (selfieError) throw new Error(`Selfie upload failed: ${selfieError.message}`);

    const { data, error } = await db
      .from("kyc_applications")
      .insert({
        user_id: userId,
        document_type: input.documentType,
        document_number: input.documentNumber.trim(),
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone.trim() || null,
        date_of_birth: input.dateOfBirth || null,
        document_file_path: documentPath,
        selfie_file_path: selfiePath,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(`Could not record your application: ${error.message}`);

    // Mirror the pending state onto the account + profile details the
    // platform keeps (names/phone/DOB are written back so they are never
    // re-asked — the BMaGlass verifyKyc pattern).
    await supabase
      .from("account_details")
      .update({
        kyc_status: "pending",
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone_number: input.phone.trim() || undefined,
        date_of_birth: input.dateOfBirth || undefined,
      })
      .eq("id", userId);

    return data as KYCApplication;
  }

  /** Admin: every application, newest first (RLS admin policy scopes this). */
  static async listApplicationsForReview(): Promise<KYCApplication[]> {
    const { data, error } = await db
      .from("kyc_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data as KYCApplication[]) ?? [];
  }

  /** Admin: short-lived signed URL for a document/selfie in the private bucket. */
  static async getSignedFileUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  /** Admin: approve/reject via the atomic review RPC. */
  static async reviewApplication(
    applicationId: string,
    decision: "approved" | "rejected",
    reason?: string,
  ): Promise<KYCApplication> {
    const { data, error } = await db.rpc("review_kyc_application", {
      p_application_id: applicationId,
      p_decision: decision,
      p_reason: reason ?? null,
    });
    if (error) throw new Error(error.message);
    return data as KYCApplication;
  }
}

/** Zambian NRC: 6 digits / 2 digits / 1 digit (slashes optional on input). */
export function normalizeNRCNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 9) return null;
  return `${digits.slice(0, 6)}/${digits.slice(6, 8)}/${digits.slice(8)}`;
}

/** Passport: 6–12 letters/digits. */
export function isValidPassportNumber(raw: string): boolean {
  return /^[A-Za-z0-9]{6,12}$/.test(raw.trim());
}

export function validateDocumentNumber(type: KYCDocumentType, raw: string): string | null {
  if (!raw.trim()) return "Enter the document number exactly as printed.";
  if (type === "nrc") {
    return normalizeNRCNumber(raw)
      ? null
      : "Zambian NRC numbers are 9 digits, printed as 123456/78/9.";
  }
  return isValidPassportNumber(raw)
    ? null
    : "Passport numbers are 6–12 letters and digits, as printed on the passport.";
}
