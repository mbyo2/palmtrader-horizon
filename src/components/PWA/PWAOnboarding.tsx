
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Bell, 
  Download, 
  Wifi, 
  Zap, 
  Shield,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface PWAOnboardingProps {
  onComplete: () => void;
}

const PWAOnboarding: React.FC<PWAOnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const benefits = [
    {
      icon: <Smartphone className="h-8 w-8 text-blue-500" />,
      title: "App-like Experience",
      description: "Install PalmCacia on your device for quick access without opening a browser."
    },
    {
      icon: <Bell className="h-8 w-8 text-green-500" />,
      title: "Real-time Notifications",
      description: "Get instant alerts for price changes, trade confirmations, and market updates."
    },
    {
      icon: <Wifi className="h-8 w-8 text-purple-500" />,
      title: "Offline Access",
      description: "View your portfolio and market data even when you're offline."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      title: "Lightning Fast",
      description: "Cached data and optimized performance for instant loading."
    },
    {
      icon: <Shield className="h-8 w-8 text-red-500" />,
      title: "Secure & Private",
      description: "Your data is encrypted and stored securely on your device."
    }
  ];

  const steps = [
    {
      title: "Welcome to PalmCacia PWA",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Transform your trading experience with our Progressive Web App features.
          </p>
          <div className="grid gap-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                {benefit.icon}
                <div>
                  <h4 className="font-medium">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Install the App",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Install PalmCacia on your device for the best experience.
          </p>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Download className="h-5 w-5 text-primary" />
              <span className="font-medium">How to Install</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Mobile</Badge>
                <span>Tap the share button and select "Add to Home Screen"</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Desktop</Badge>
                <span>Click the install icon in your browser's address bar</span>
              </div>
            </div>
          </Card>
        </div>
      )
    },
    {
      title: "Enable Notifications",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Stay informed with real-time notifications about your investments.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Price Alerts</div>
                <div className="text-sm text-muted-foreground">When your target prices are reached</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Trade Confirmations</div>
                <div className="text-sm text-muted-foreground">When your orders are executed</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-medium">Portfolio Updates</div>
                <div className="text-sm text-muted-foreground">Significant changes to your holdings</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>
              Step {currentStep + 1} of {steps.length}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          {steps[currentStep].content}
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleSkip}>
            Skip Tour
          </Button>
          <Button onClick={handleNext}>
            {currentStep < steps.length - 1 ? (
              <>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAOnboarding;
