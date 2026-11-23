import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  InhouseKYCService,
  type KYCApplication,
} from "@/services/InhouseKYCService";
import { Shield, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";

/**
 * Admin KYC review (in-house, replaces Didit): the reviewer sees the
 * document photo and the live selfie side by side with the submitted
 * details, then approves or rejects with a reason. Decisions go through
 * the review_kyc_application RPC, which flips the account status too.
 */
const KYCReviewQueue = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<KYCApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KYCApplication | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [deciding, setDeciding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setApplications(await InhouseKYCService.listApplicationsForReview());
    } catch (err) {
      toast({
        title: "Could not load the KYC queue",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openApplication = async (app: KYCApplication) => {
    setSelected(app);
    setReason("");
    setDocUrl(null);
    setSelfieUrl(null);
    const [doc, selfie] = await Promise.all([
      InhouseKYCService.getSignedFileUrl(app.document_file_path),
      InhouseKYCService.getSignedFileUrl(app.selfie_file_path),
    ]);
    setDocUrl(doc);
    setSelfieUrl(selfie);
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (!selected) return;
    if (decision === "rejected" && !reason.trim()) {
      toast({ title: "Reason required", description: "Tell the applicant why, so they can fix it and resubmit.", variant: "destructive" });
      return;
    }
    setDeciding(true);
    try {
      const updated = await InhouseKYCService.reviewApplication(selected.id, decision, reason.trim() || undefined);
      toast({
        title: decision === "approved" ? "Identity approved" : "Application rejected",
        description: `${updated.first_name} ${updated.last_name} has been ${decision}.`,
      });
      setSelected(updated);
      await load();
    } catch (err) {
      toast({
        title: "Decision failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setDeciding(false);
    }
  };

  const pending = applications.filter((a) => a.status === "pending");
  const decided = applications.filter((a) => a.status !== "pending");

  const statusBadge = (status: KYCApplication["status"]) =>
    status === "approved" ? (
      <Badge variant="success">Approved</Badge>
    ) : status === "rejected" ? (
      <Badge variant="destructive">Rejected</Badge>
    ) : (
      <Badge variant="secondary">Pending</Badge>
    );

  const renderRow = (app: KYCApplication) => (
    <button
      key={app.id}
      type="button"
      onClick={() => void openApplication(app)}
      className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
        selected?.id === app.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{app.first_name} {app.last_name}</span>
        <span className="block text-xs text-muted-foreground">
          {app.document_type === "nrc" ? "NRC" : "Passport"} · {app.document_number} · {new Date(app.created_at).toLocaleString()}
        </span>
      </span>
      {statusBadge(app.status)}
    </button>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> KYC Review Queue
              </CardTitle>
              <CardDescription>
                {pending.length} awaiting review · {applications.length} total applications
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading applications…
            </div>
          ) : applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No KYC applications yet.</p>
          ) : (
            <>
              {pending.length > 0 && <div className="space-y-2">{pending.map(renderRow)}</div>}
              {decided.length > 0 && (
                <>
                  <h4 className="pt-2 text-sm font-medium text-muted-foreground">Recently decided</h4>
                  <div className="space-y-2">{decided.slice(0, 10).map(renderRow)}</div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application detail</CardTitle>
          <CardDescription>
            Compare the selfie with the document photo, check the details, then decide.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Select an application from the queue.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <figure className="space-y-1">
                  {docUrl ? (
                    selected.document_file_path.endsWith(".pdf") ? (
                      <a href={docUrl} target="_blank" rel="noreferrer" className="block rounded-lg border border-border p-4 text-center text-sm text-primary underline">
                        Open document PDF
                      </a>
                    ) : (
                      <img src={docUrl} alt="Applicant document" className="w-full rounded-lg border border-border" />
                    )
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground">Loading…</div>
                  )}
                  <figcaption className="text-center text-xs text-muted-foreground">Document</figcaption>
                </figure>
                <figure className="space-y-1">
                  {selfieUrl ? (
                    <img src={selfieUrl} alt="Applicant live selfie" className="w-full rounded-lg border border-border" />
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-lg border border-border text-xs text-muted-foreground">Loading…</div>
                  )}
                  <figcaption className="text-center text-xs text-muted-foreground">Live selfie</figcaption>
                </figure>
              </div>

              <dl className="space-y-1 rounded-lg border border-border p-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{selected.first_name} {selected.last_name}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Document</dt><dd className="font-medium">{selected.document_type === "nrc" ? "NRC" : "Passport"} {selected.document_number}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Date of birth</dt><dd className="font-medium">{selected.date_of_birth ?? "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{selected.phone ?? "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd>{statusBadge(selected.status)}</dd></div>
                {selected.status === "rejected" && selected.rejection_reason && (
                  <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Reason</dt><dd className="text-right font-medium">{selected.rejection_reason}</dd></div>
                )}
              </dl>

              {selected.status === "pending" && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Reason (required to reject — the applicant sees this)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <Button className="flex-1" disabled={deciding} onClick={() => void decide("approved")}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" disabled={deciding} onClick={() => void decide("rejected")}>
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCReviewQueue;
