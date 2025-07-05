import { useState, useRef } from 'react';
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Camera,
  AlertTriangle,
  Phone,
  Mail
} from "lucide-react";

const Verification = () => {
  const { isLoading } = useProtectedRoute();
  const { user, accountDetails } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<{ [key: string]: File | null }>({
    id_document: null,
    proof_of_address: null,
    selfie: null
  });
  const fileInputRefs = {
    id_document: useRef<HTMLInputElement>(null),
    proof_of_address: useRef<HTMLInputElement>(null),
    selfie: useRef<HTMLInputElement>(null)
  };

  const verificationSteps = [
    { id: 1, title: "Personal Information", status: "completed" },
    { id: 2, title: "Identity Verification", status: "current" },
    { id: 3, title: "Address Verification", status: "pending" },
    { id: 4, title: "Selfie Verification", status: "pending" },
    { id: 5, title: "Review & Submit", status: "pending" }
  ];

  const handleFileSelect = (documentType: string, file: File) => {
    setDocuments(prev => ({ ...prev, [documentType]: file }));
  };

  const uploadDocument = async (documentType: string, file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${documentType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save document record
      const { error: dbError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          verification_status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully",
      });

      return true;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  const submitVerification = async () => {
    if (!user) return;

    setUploading(true);
    try {
      // Upload all documents
      const uploads = await Promise.all([
        documents.id_document && uploadDocument('id_document', documents.id_document),
        documents.proof_of_address && uploadDocument('proof_of_address', documents.proof_of_address),
        documents.selfie && uploadDocument('selfie', documents.selfie)
      ]);

      if (uploads.every(Boolean)) {
        // Update KYC status
        const { error } = await supabase
          .from('account_details')
          .update({ kyc_status: 'pending' })
          .eq('id', user.id);

        if (error) throw error;

        toast({
          title: "Verification submitted",
          description: "Your verification documents have been submitted for review. We'll notify you within 2-3 business days.",
        });
      }
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast({
        title: "Submission failed",
        description: "Failed to submit verification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const sendVerificationEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email || ''
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Please check your email and click the verification link.",
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast({
        title: "Failed to send email",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  const kycProgress = accountDetails?.kyc_status === 'approved' ? 100 : 
                     accountDetails?.kyc_status === 'pending' ? 75 : 25;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Account Verification</h1>
          <p className="text-muted-foreground">Complete your verification to unlock all features</p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Progress</CardTitle>
          <CardDescription>
            Complete all steps to fully verify your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">{kycProgress}%</span>
            </div>
            <Progress value={kycProgress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Email & Phone Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  {accountDetails?.is_email_verified ? 'Verified' : 'Verification required'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {accountDetails?.is_email_verified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <Button size="sm" onClick={sendVerificationEmail}>
                      Send Verification Email
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{accountDetails?.phone_number || 'No phone number'}</p>
                <p className="text-sm text-muted-foreground">
                  {accountDetails?.is_phone_verified ? 'Verified' : 'Verification required'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {accountDetails?.is_phone_verified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <Badge className="bg-green-100 text-green-800">Verified</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <Button size="sm">
                      Verify Phone
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KYC Document Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Identity Verification
          </CardTitle>
          <CardDescription>
            Upload required documents for identity verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {accountDetails?.kyc_status === 'approved' ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-700">Verification Complete</h3>
              <p className="text-muted-foreground">Your identity has been successfully verified</p>
            </div>
          ) : accountDetails?.kyc_status === 'pending' ? (
            <div className="text-center py-8">
              <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-yellow-700">Under Review</h3>
              <p className="text-muted-foreground">Your documents are being reviewed. We'll notify you within 2-3 business days.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ID Document */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <h4 className="font-medium">Government-issued ID</h4>
                  <Badge variant="outline">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a clear photo of your national ID, passport, or driver's license
                </p>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRefs.id_document.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </Button>
                  {documents.id_document && (
                    <span className="text-sm text-muted-foreground">
                      {documents.id_document.name}
                    </span>
                  )}
                  <input
                    ref={fileInputRefs.id_document}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect('id_document', e.target.files[0])}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Proof of Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <h4 className="font-medium">Proof of Address</h4>
                  <Badge variant="outline">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a utility bill, bank statement, or government document dated within the last 3 months
                </p>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRefs.proof_of_address.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </Button>
                  {documents.proof_of_address && (
                    <span className="text-sm text-muted-foreground">
                      {documents.proof_of_address.name}
                    </span>
                  )}
                  <input
                    ref={fileInputRefs.proof_of_address}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect('proof_of_address', e.target.files[0])}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Selfie */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  <h4 className="font-medium">Selfie Verification</h4>
                  <Badge variant="outline">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Take a clear selfie holding your ID document next to your face
                </p>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRefs.selfie.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Take Selfie
                  </Button>
                  {documents.selfie && (
                    <span className="text-sm text-muted-foreground">
                      {documents.selfie.name}
                    </span>
                  )}
                  <input
                    ref={fileInputRefs.selfie}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect('selfie', e.target.files[0])}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  onClick={submitVerification}
                  disabled={uploading || !documents.id_document || !documents.proof_of_address || !documents.selfie}
                  className="w-full"
                >
                  {uploading ? 'Submitting...' : 'Submit for Verification'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• All documents must be clear, legible, and in color</li>
            <li>• Documents should not be expired</li>
            <li>• Proof of address must be dated within the last 3 months</li>
            <li>• Verification typically takes 2-3 business days</li>
            <li>• You'll receive an email notification once verification is complete</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verification;