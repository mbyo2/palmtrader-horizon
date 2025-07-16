import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, ArrowRight, ArrowLeft, User, Target, Shield } from 'lucide-react';

interface OnboardingData {
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  investment_experience: string;
  risk_tolerance: string;
  investment_goals: string[];
  bio: string;
}

const Onboarding = () => {
  const { user, accountDetails } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    investment_experience: '',
    risk_tolerance: '',
    investment_goals: [],
    bio: ''
  });

  const totalSteps = 4;
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

    // Pre-fill with existing data
    if (accountDetails) {
      setData(prev => ({
        ...prev,
        first_name: accountDetails.first_name || '',
        last_name: accountDetails.last_name || '',
        phone_number: accountDetails.phone_number || '',
        date_of_birth: accountDetails.date_of_birth || ''
      }));
    }
  }, [user, accountDetails, navigate]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update account details
      const { error: accountError } = await supabase
        .from('account_details')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          date_of_birth: data.date_of_birth,
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (accountError) throw accountError;

      // Create or update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          first_name: data.first_name,
          last_name: data.last_name,
          investment_experience: data.investment_experience,
          risk_tolerance: data.risk_tolerance,
          investment_goals: data.investment_goals,
          bio: data.bio,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      toast({
        title: "Welcome to Palm Cacia!",
        description: "Your profile has been set up successfully.",
      });

      navigate('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Let's start with your basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={data.first_name}
                    onChange={(e) => setData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={data.last_name}
                    onChange={(e) => setData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={data.phone_number}
                    onChange={(e) => setData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+260 XXX XXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={data.date_of_birth}
                    onChange={(e) => setData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Investment Profile
              </CardTitle>
              <CardDescription>
                Help us understand your investment preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Investment Experience</Label>
                <select
                  id="experience"
                  className="w-full p-2 border rounded-md"
                  value={data.investment_experience}
                  onChange={(e) => setData(prev => ({ ...prev, investment_experience: e.target.value }))}
                >
                  <option value="">Select your experience level</option>
                  <option value="beginner">Beginner (0-1 years)</option>
                  <option value="intermediate">Intermediate (2-5 years)</option>
                  <option value="advanced">Advanced (5+ years)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk">Risk Tolerance</Label>
                <select
                  id="risk"
                  className="w-full p-2 border rounded-md"
                  value={data.risk_tolerance}
                  onChange={(e) => setData(prev => ({ ...prev, risk_tolerance: e.target.value }))}
                >
                  <option value="">Select your risk tolerance</option>
                  <option value="conservative">Conservative - I prefer stable returns</option>
                  <option value="moderate">Moderate - I'm comfortable with some risk</option>
                  <option value="aggressive">Aggressive - I'm willing to take higher risks</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Investment Goals (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['retirement', 'wealth_building', 'education', 'emergency_fund'].map((goal) => (
                    <label key={goal} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={data.investment_goals.includes(goal)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setData(prev => ({ ...prev, investment_goals: [...prev.investment_goals, goal] }));
                          } else {
                            setData(prev => ({ ...prev, investment_goals: prev.investment_goals.filter(g => g !== goal) }));
                          }
                        }}
                      />
                      <span className="capitalize">{goal.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                About You
              </CardTitle>
              <CardDescription>
                Tell us a bit about yourself and your financial journey
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  value={data.bio}
                  onChange={(e) => setData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Share your investment goals, interests, or anything you'd like others to know..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Ready to Get Started!
              </CardTitle>
              <CardDescription>
                Review your information and complete your profile setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h3 className="font-medium">Profile Summary:</h3>
                <p><strong>Name:</strong> {data.first_name} {data.last_name}</p>
                <p><strong>Experience:</strong> {data.investment_experience}</p>
                <p><strong>Risk Tolerance:</strong> {data.risk_tolerance}</p>
                <p><strong>Goals:</strong> {data.investment_goals.join(', ')}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                By completing your profile, you agree to our Terms of Service and Privacy Policy.
                You can update this information anytime in your profile settings.
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
        <p className="text-muted-foreground">Let's set up your investment profile</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {renderStep()}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        {currentStep < totalSteps ? (
          <Button
            onClick={handleNext}
            disabled={
              (currentStep === 1 && (!data.first_name || !data.last_name)) ||
              (currentStep === 2 && (!data.investment_experience || !data.risk_tolerance))
            }
            className="gap-2"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={loading}
            className="gap-2"
          >
            {loading ? 'Completing...' : 'Complete Setup'}
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;