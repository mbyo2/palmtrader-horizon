import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { CheckCircle, CircleDashed, Loader2 } from "lucide-react";

const steps = [
  { id: "personal", title: "Personal Information" },
  { id: "investing", title: "Investment Experience" },
  { id: "preferences", title: "Preferences" },
  { id: "confirmation", title: "Confirmation" },
];

const Onboarding = () => {
  const { user, accountDetails } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isLoading } = useProtectedRoute();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    bio: "",
    experience: "beginner",
    riskTolerance: "moderate",
    investmentGoals: ["retirement"],
    newsPreference: true,
    priceAlerts: true,
    tradingNotifications: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (accountDetails?.onboarding_completed) {
    navigate("/portfolio");
    return null;
  }

  if (isLoading) {
    return <div className="container py-10">Loading...</div>;
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleInvestmentGoalChange = (goal: string) => {
    const currentGoals = [...formData.investmentGoals];
    if (currentGoals.includes(goal)) {
      updateFormData("investmentGoals", currentGoals.filter(g => g !== goal));
    } else {
      updateFormData("investmentGoals", [...currentGoals, goal]);
    }
  };

  const handleNext = () => {
    if (currentStep === 0) {
      if (!formData.firstName || !formData.lastName) {
        toast({
          title: "Required fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setIsSubmitting(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: formData.displayName || `${formData.firstName} ${formData.lastName}`,
          bio: formData.bio,
          investment_experience: formData.experience,
          risk_tolerance: formData.riskTolerance,
          investment_goals: formData.investmentGoals,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      const { error: preferencesError } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          news_preference: formData.newsPreference,
          price_alerts: formData.priceAlerts,
          trading_notifications: formData.tradingNotifications,
          updated_at: new Date().toISOString(),
        });

      if (preferencesError) throw preferencesError;

      const { error: accountError } = await supabase
        .from("account_details")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      if (accountError) throw accountError;

      toast({
        title: "Onboarding complete!",
        description: "Your profile has been set up successfully",
      });

      navigate("/portfolio");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: "There was a problem setting up your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome to BullTrade</h1>
        <p className="text-muted-foreground mt-2">Let's get your account set up</p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`flex flex-col items-center ${
                index <= currentStep ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2">
                {index < currentStep ? (
                  <CheckCircle className="h-6 w-6" />
                ) : index === currentStep ? (
                  <CircleDashed className="h-6 w-6" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="text-sm font-medium hidden md:block">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="relative mt-2">
          <div className="absolute top-0 left-0 h-1 bg-muted w-full"></div>
          <div 
            className="absolute top-0 left-0 h-1 bg-primary transition-all" 
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>
            {currentStep === 0 && "Please provide your personal information"}
            {currentStep === 1 && "Tell us about your investment experience"}
            {currentStep === 2 && "Set your preferences for using BullTrade"}
            {currentStep === 3 && "Review and confirm your information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input 
                    id="firstName" 
                    value={formData.firstName} 
                    onChange={(e) => updateFormData("firstName", e.target.value)} 
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input 
                    id="lastName" 
                    value={formData.lastName} 
                    onChange={(e) => updateFormData("lastName", e.target.value)} 
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input 
                  id="displayName" 
                  value={formData.displayName} 
                  onChange={(e) => updateFormData("displayName", e.target.value)} 
                  placeholder="How you want to be seen by others"
                />
                <p className="text-sm text-muted-foreground">
                  Leave blank to use your full name
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (optional)</Label>
                <Textarea 
                  id="bio" 
                  value={formData.bio} 
                  onChange={(e) => updateFormData("bio", e.target.value)} 
                  placeholder="Tell us a bit about yourself as an investor"
                  rows={3}
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Investment Experience</Label>
                <RadioGroup 
                  value={formData.experience} 
                  onValueChange={(value) => updateFormData("experience", value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beginner" id="beginner" />
                    <Label htmlFor="beginner">Beginner - New to investing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermediate" id="intermediate" />
                    <Label htmlFor="intermediate">Intermediate - Some experience</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="advanced" id="advanced" />
                    <Label htmlFor="advanced">Advanced - Experienced investor</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Risk Tolerance</Label>
                <RadioGroup 
                  value={formData.riskTolerance} 
                  onValueChange={(value) => updateFormData("riskTolerance", value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="conservative" id="conservative" />
                    <Label htmlFor="conservative">Conservative - Prioritize capital preservation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderate" id="moderate" />
                    <Label htmlFor="moderate">Moderate - Balance growth and risk</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="aggressive" id="aggressive" />
                    <Label htmlFor="aggressive">Aggressive - Maximize growth potential</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Investment Goals (select all that apply)</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="retirement" 
                      checked={formData.investmentGoals.includes("retirement")}
                      onCheckedChange={() => handleInvestmentGoalChange("retirement")} 
                    />
                    <Label htmlFor="retirement">Retirement</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="wealth" 
                      checked={formData.investmentGoals.includes("wealth")}
                      onCheckedChange={() => handleInvestmentGoalChange("wealth")} 
                    />
                    <Label htmlFor="wealth">Wealth building</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="income" 
                      checked={formData.investmentGoals.includes("income")}
                      onCheckedChange={() => handleInvestmentGoalChange("income")} 
                    />
                    <Label htmlFor="income">Income generation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="shortterm" 
                      checked={formData.investmentGoals.includes("shortterm")}
                      onCheckedChange={() => handleInvestmentGoalChange("shortterm")} 
                    />
                    <Label htmlFor="shortterm">Short-term trading</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <div>
                    <Label htmlFor="newsPreference">Market News Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates on important market news
                    </p>
                  </div>
                  <Checkbox 
                    id="newsPreference" 
                    checked={formData.newsPreference}
                    onCheckedChange={(checked) => 
                      updateFormData("newsPreference", checked === true)
                    } 
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div>
                    <Label htmlFor="priceAlerts">Price Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when stocks reach your target prices
                    </p>
                  </div>
                  <Checkbox 
                    id="priceAlerts" 
                    checked={formData.priceAlerts}
                    onCheckedChange={(checked) => 
                      updateFormData("priceAlerts", checked === true)
                    } 
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div>
                    <Label htmlFor="tradingNotifications">Trading Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about your trades and orders
                    </p>
                  </div>
                  <Checkbox 
                    id="tradingNotifications" 
                    checked={formData.tradingNotifications}
                    onCheckedChange={(checked) => 
                      updateFormData("tradingNotifications", checked === true)
                    } 
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p>{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Display Name</p>
                    <p>{formData.displayName || `${formData.firstName} ${formData.lastName}`}</p>
                  </div>
                </div>
                {formData.bio && (
                  <div className="mt-2">
                    <p className="text-muted-foreground">Bio</p>
                    <p>{formData.bio}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium mb-2">Investment Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Experience</p>
                    <p className="capitalize">{formData.experience}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Risk Tolerance</p>
                    <p className="capitalize">{formData.riskTolerance}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Investment Goals</p>
                    <p className="capitalize">{formData.investmentGoals.map(g => g).join(", ")}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Market News Updates</p>
                    <p>{formData.newsPreference ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price Alerts</p>
                    <p>{formData.priceAlerts ? "Enabled" : "Disabled"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trading Notifications</p>
                    <p>{formData.tradingNotifications ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border p-4 bg-muted/50">
                <p className="text-sm">
                  By completing this setup, you agree to our Terms of Service and Privacy Policy.
                  You can change these preferences at any time in your account settings.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
          >
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>Continue</Button>
          ) : (
            <Button onClick={handleComplete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Onboarding;
