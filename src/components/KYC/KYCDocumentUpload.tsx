
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, X, Loader2 } from "lucide-react";
import { RealFileUploadService } from "@/services/RealFileUploadService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { devConsole } from "@/utils/consoleCleanup";

const KYCDocumentUpload = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
  }, [user]);

  const documentTypes = [
    { value: "national_id", label: "National ID" },
    { value: "passport", label: "Passport" },
    { value: "drivers_license", label: "Driver's License" },
    { value: "utility_bill", label: "Utility Bill" },
    { value: "bank_statement", label: "Bank Statement" },
    { value: "proof_of_address", label: "Proof of Address" },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a JPEG, PNG, or PDF file");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !user) {
      toast.error("Please select a file and document type");
      return;
    }

    setIsUploading(true);

    try {
      const result = await RealFileUploadService.uploadKYCDocument(
        user.id,
        selectedFile,
        documentType
      );

      if (result.success) {
        toast.success("Document uploaded successfully");
        setSelectedFile(null);
        setDocumentType("");
        // Refresh documents list
        loadDocuments();
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch (error) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const loadDocuments = async () => {
    if (!user) return;

    try {
      const documents = await RealFileUploadService.getUserDocuments(user.id);
      setUploadedDocuments(documents.map(doc => ({
        id: doc.id,
        documentType: doc.document_type,
        fileName: doc.file_name,
        status: doc.verification_status,
        uploadedAt: new Date(doc.created_at)
      })));
    } catch (error) {
      devConsole.error("Error loading documents:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload KYC Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="documentType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="file">Choose File</Label>
            <Input
              id="file"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
            />
            {selectedFile && (
              <div className="mt-2 p-2 bg-muted rounded text-sm">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          <Alert>
            <AlertDescription>
              Supported formats: JPEG, PNG, PDF. Maximum file size: 5MB.
              Ensure documents are clear and all information is visible.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !documentType || isUploading}
            className="w-full"
          >
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload Document
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents uploaded yet
            </div>
          ) : (
            <div className="space-y-3">
              {uploadedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <div className="font-medium">
                        {documentTypes.find(t => t.value === doc.documentType)?.label || doc.documentType}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {doc.fileName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getStatusColor(doc.status)}`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {doc.uploadedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCDocumentUpload;
