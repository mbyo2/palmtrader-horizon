import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, ArrowRight, ArrowLeft, User, Target, Shield, 
  Upload, FileCheck, AlertTriangle, Fingerprint, CreditCard
} from 'lucide-react';

interface OnboardingData {
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  investment_experience: string;
  risk_tolerance: string;
  investment_goals: string[];
  bio: string;
  tax_id: string;
  country: string;
  address: string;
  agreed_to_terms: boolean;
  agreed_to_risk_disclosure: boolean;
}

const Onboarding = () => {
  const { user, accountDetails } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setSaving] = useState(false);
  const [kycStatus, setKycStatus] = useState<'not_started' | 'pending' | 'verified' | 'rejected'>('not_started');
  const [data, setData] = useState<OnboardingData>({
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    investment_experience: '',
    risk_tolerance: '',
    investment_goals: [],
    bio: '',
    tax_id: '',
    country: 'ZM',
    address: '',
    agreed_to_terms: false,
    agreed_to_risk_disclosure: false,
  });

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (accountDetails?.onboarding_completed) {
      navigate('/');
      return;
    }
    if (accountDetails) {
      setData(prev => ({
        ...prev,
        first_name: accountDetails.first_name || '',
        last_name: accountDetails.last_name || '',
        phone_number: accountDetails.phone_number || '',
        date_of_birth: accountDetails.date_of_birth || '',
        tax_id: accountDetails.tax_id || '',
      }));
      setKycStatus(accountDetails.kyc_status as any || 'not_started');
    }
  }, [user, accountDetails, navigate]);

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1: return !!(data.first_name && data.last_name && data.phone_number && data.date_of_birth);
      case 2: return !!(data.country && data.address);
      case 3: return !!(data.investment_experience && data.risk_tolerance);
      case 4: return true; // KYC is optional to proceed but shown
      case 5: return data.agreed_to_terms && data.agreed_to_risk_disclosure;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleStartKYC = async () => {
    if (!user) return;
    try {
      const { data: result, error } = await supabase.functions.invoke('sumsub-kyc', {
        body: { action: 'create_applicant' },
      });
      if (error) throw error;

      if (result?.status === 'dev_mode') {
        toast({
          title: "KYC Demo Mode",
          description: "Sumsub is not configured yet. KYC verification will work once SUMSUB_APP_TOKEN is set.",
        });
        setKycStatus('pending');
      } else {
        toast({ title: "KYC Started", description: "Please complete the identity verification." });
        setKycStatus('pending');
      }
    } catch (err) {
      console.error('KYC error:', err);
      toast({ title: "KYC Error", description: "Failed to start verification. Try again later.", variant: "destructive" });
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: accountError } = await supabase
        .from('account_details')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          date_of_birth: data.date_of_birth,
          tax_id: data.tax_id || null,
          onboarding_completed: true,
          account_status: 'active' as any,
        })
        .eq('id', user.id);

      if (accountError) throw accountError;

      toast({ title: "Welcome to Palm Cacia!", description: "Your account is now active." });
      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({ title: "Error", description: "Failed to complete onboarding.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = [
    { icon: User, label: 'Personal' },
    { icon: CreditCard, label: 'Address' },
    { icon: Target, label: 'Investor' },
    { icon: Fingerprint, label: 'Identity' },
    { icon: Shield, label: 'Terms' },
    { icon: CheckCircle, label: 'Complete' },
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Personal Information
              </CardTitle>
              <CardDescription>We need this to comply with financial regulations (KYC/AML)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input id="first_name" value={data.first_name}
                    onChange={(e) => setData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Your legal first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input id="last_name" value={data.last_name}
                    onChange={(e) => setData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Your legal last name" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" value={data.phone_number}
                    onChange={(e) => setData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+260 97X XXX XXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input id="dob" type="date" value={data.date_of_birth}
                    onChange={(e) => setData(prev => ({ ...prev, date_of_birth: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">NRC / Tax ID (Optional)</Label>
                <Input id="tax_id" value={data.tax_id}
                  onChange={(e) => setData(prev => ({ ...prev, tax_id: e.target.value }))}
                  placeholder="National Registration Card number" />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Residential Address
              </CardTitle>
              <CardDescription>Required for regulatory compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Country of Residence *</Label>
                <Select value={data.country} onValueChange={(v) => setData(prev => ({ ...prev, country: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZM">Zambia</SelectItem>
                    <SelectItem value="ZW">Zimbabwe</SelectItem>
                    <SelectItem value="KE">Kenya</SelectItem>
                    <SelectItem value="NG">Nigeria</SelectItem>
                    <SelectItem value="ZA">South Africa</SelectItem>
                    <SelectItem value="TZ">Tanzania</SelectItem>
                    <SelectItem value="UG">Uganda</SelectItem>
                    <SelectItem value="GH">Ghana</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address *</Label>
                <Textarea id="address" value={data.address}
                  onChange={(e) => setData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address, city, province/state" rows={3} />
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Investment Profile
              </CardTitle>
              <CardDescription>Helps us tailor your experience and ensure suitability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Investment Experience *</Label>
                <Select value={data.investment_experience}
                  onValueChange={(v) => setData(prev => ({ ...prev, investment_experience: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select experience level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No experience</SelectItem>
                    <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
                    <SelectItem value="intermediate">Intermediate (2-5 years)</SelectItem>
                    <SelectItem value="advanced">Advanced (5+ years)</SelectItem>
                    <SelectItem value="professional">Professional / Licensed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risk Tolerance *</Label>
                <Select value={data.risk_tolerance}
                  onValueChange={(v) => setData(prev => ({ ...prev, risk_tolerance: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select risk tolerance" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative — Preserve capital</SelectItem>
                    <SelectItem value="moderate">Moderate — Balanced growth</SelectItem>
                    <SelectItem value="aggressive">Aggressive — Maximum growth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Investment Goals</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'retirement', label: 'Retirement Planning' },
                    { id: 'wealth_building', label: 'Wealth Building' },
                    { id: 'income', label: 'Passive Income' },
                    { id: 'education', label: 'Education Fund' },
                    { id: 'trading', label: 'Active Trading' },
                    { id: 'hedging', label: 'Portfolio Hedging' },
                  ].map((goal) => (
                    <label key={goal.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-muted transition-colors">
                      <Checkbox
                        checked={data.investment_goals.includes(goal.id)}
                        onCheckedChange={(checked) => {
                          setData(prev => ({
                            ...prev,
                            investment_goals: checked
                              ? [...prev.investment_goals, goal.id]
                              : prev.investment_goals.filter(g => g !== goal.id)
                          }));
                        }}
                      />
                      <span className="text-sm">{goal.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-primary" /> Identity Verification
              </CardTitle>
              <CardDescription>
                Verify your identity to unlock full trading access. Required by Zambian Securities Act 2016.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    kycStatus === 'verified' ? 'default' :
                    kycStatus === 'pending' ? 'secondary' :
                    kycStatus === 'rejected' ? 'destructive' : 'outline'
                  }>
                    {kycStatus === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {kycStatus === 'pending' && <Upload className="h-3 w-3 mr-1" />}
                    {kycStatus === 'rejected' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {kycStatus === 'not_started' && <FileCheck className="h-3 w-3 mr-1" />}
                    {kycStatus.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                {kycStatus === 'not_started' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You'll need a valid government-issued ID (passport, NRC, or driver's license) and a selfie for verification.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-background rounded">
                        <FileCheck className="h-4 w-4 text-primary" />
                        <span>Government ID</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-background rounded">
                        <User className="h-4 w-4 text-primary" />
                        <span>Selfie Photo</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-background rounded">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span>Proof of Address</span>
                      </div>
                    </div>
                    <Button onClick={handleStartKYC} className="w-full">
                      <Fingerprint className="h-4 w-4 mr-2" /> Start Identity Verification
                    </Button>
                  </div>
                )}

                {kycStatus === 'pending' && (
                  <div className="space-y-2">
                    <p className="text-sm">Your documents are being reviewed. This usually takes 1-24 hours.</p>
                    <p className="text-xs text-muted-foreground">You can continue setting up your account while we verify your identity. Some features may be limited until verification is complete.</p>
                  </div>
                )}

                {kycStatus === 'verified' && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✓ Your identity has been verified. Full trading access is enabled.
                  </p>
                )}

                {kycStatus === 'rejected' && (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Your verification was unsuccessful. Please try again with clear documents.
                    </p>
                    <Button variant="outline" onClick={handleStartKYC}>Retry Verification</Button>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                <p>Without verification, you can still:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Use demo trading with virtual funds</li>
                  <li>View market data and research</li>
                  <li>Set up price alerts and watchlists</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Legal Agreements
              </CardTitle>
              <CardDescription>Please review and accept the following before continuing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-muted transition-colors">
                <Checkbox
                  checked={data.agreed_to_terms}
                  onCheckedChange={(checked) => setData(prev => ({ ...prev, agreed_to_terms: !!checked }))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Terms of Service & Privacy Policy *</p>
                  <p className="text-xs text-muted-foreground">
                    I have read and agree to the <a href="/terms" target="_blank" className="underline text-primary">Terms of Service</a> and <a href="/privacy" target="_blank" className="underline text-primary">Privacy Policy</a>.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-muted transition-colors">
                <Checkbox
                  checked={data.agreed_to_risk_disclosure}
                  onCheckedChange={(checked) => setData(prev => ({ ...prev, agreed_to_risk_disclosure: !!checked }))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Risk Disclosure *</p>
                  <p className="text-xs text-muted-foreground">
                    I understand that trading involves risk of loss. Past performance is not indicative of future results. I may lose some or all of my invested capital.
                  </p>
                </div>
              </label>

              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Trading financial instruments carries a high degree of risk. You should only invest money that you can afford to lose. Palm Cacia is regulated under the Zambian Securities Act 2016.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" /> Ready to Trade!
              </CardTitle>
              <CardDescription>Review your profile and get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Profile Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Name:</span> <strong>{data.first_name} {data.last_name}</strong></div>
                  <div><span className="text-muted-foreground">Phone:</span> <strong>{data.phone_number}</strong></div>
                  <div><span className="text-muted-foreground">Experience:</span> <strong>{data.investment_experience}</strong></div>
                  <div><span className="text-muted-foreground">Risk:</span> <strong>{data.risk_tolerance}</strong></div>
                  <div><span className="text-muted-foreground">KYC:</span> <Badge variant={kycStatus === 'verified' ? 'default' : 'secondary'}>{kycStatus}</Badge></div>
                  <div><span className="text-muted-foreground">Country:</span> <strong>{data.country}</strong></div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">What happens next:</h4>
                <ul className="text-sm space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Demo account with $100,000 virtual funds
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Access to real-time market data
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Professional TradingView charts
                  </li>
                  {kycStatus === 'verified' ? (
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" /> Full live trading access
                    </li>
                  ) : (
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" /> Live trading after KYC approval
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to Palm Cacia</h1>
        <p className="text-muted-foreground">Set up your trading account in a few steps</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between px-2">
        {stepLabels.map((step, i) => {
          const Icon = step.icon;
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isComplete = stepNum < currentStep;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                isComplete ? 'bg-primary text-primary-foreground' :
                isActive ? 'bg-primary/20 text-primary border-2 border-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {isComplete ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-[10px] hidden sm:block ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <Progress value={progress} className="w-full" />

      {renderStep()}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {currentStep < totalSteps ? (
          <Button onClick={handleNext} disabled={!canProceedFromStep(currentStep)} className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={loading} className="gap-2">
            {loading ? 'Setting up...' : 'Start Trading'}
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
