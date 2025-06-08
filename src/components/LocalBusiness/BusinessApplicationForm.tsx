
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LocalBusinessService, BusinessApplicationData } from "@/services/LocalBusinessService";

interface BusinessApplicationFormProps {
  onSuccess?: (businessId: string) => void;
}

const BusinessApplicationForm = ({ onSuccess }: BusinessApplicationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BusinessApplicationData>({
    symbol: '',
    company_name: '',
    description: '',
    sector: '',
    share_capital: 0,
    total_shares: 0,
    public_shares_percentage: 25,
    total_shareholders: 0,
    management_experience_details: '',
    corporate_governance_details: '',
    business_operations_details: '',
    sponsoring_broker: '',
    underwriter: ''
  });

  const sectors = [
    'Agriculture',
    'Banking & Financial Services',
    'Construction & Real Estate',
    'Consumer Goods',
    'Energy & Utilities',
    'Healthcare',
    'Industrial',
    'Insurance',
    'Mining',
    'Technology',
    'Telecommunications',
    'Tourism & Leisure',
    'Transportation'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.symbol || !formData.company_name || !formData.share_capital || !formData.total_shares) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Check symbol availability
      const isAvailable = await LocalBusinessService.isSymbolAvailable(formData.symbol);
      if (!isAvailable) {
        toast.error("Symbol is already taken. Please choose a different symbol.");
        return;
      }

      // Submit application
      const businessId = await LocalBusinessService.submitBusinessApplication(formData);
      
      if (businessId && onSuccess) {
        onSuccess(businessId);
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof BusinessApplicationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Business Listing Application</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="symbol">Trading Symbol *</Label>
            <Input
              id="symbol"
              value={formData.symbol}
              onChange={(e) => updateFormData('symbol', e.target.value.toUpperCase())}
              placeholder="e.g., ABC"
              maxLength={5}
              required
            />
          </div>

          <div>
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => updateFormData('company_name', e.target.value)}
              placeholder="Full company name"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Business Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Describe your business activities..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="sector">Sector</Label>
          <Select onValueChange={(value) => updateFormData('sector', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select business sector" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map(sector => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="share_capital">Share Capital (K) *</Label>
            <Input
              id="share_capital"
              type="number"
              value={formData.share_capital}
              onChange={(e) => updateFormData('share_capital', parseFloat(e.target.value) || 0)}
              placeholder="500000"
              min="500000"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum K500,000</p>
          </div>

          <div>
            <Label htmlFor="total_shares">Total Shares *</Label>
            <Input
              id="total_shares"
              type="number"
              value={formData.total_shares}
              onChange={(e) => updateFormData('total_shares', parseInt(e.target.value) || 0)}
              placeholder="1000000"
              min="1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="public_shares_percentage">Public Shares Percentage *</Label>
            <Input
              id="public_shares_percentage"
              type="number"
              value={formData.public_shares_percentage}
              onChange={(e) => updateFormData('public_shares_percentage', parseFloat(e.target.value) || 0)}
              placeholder="25"
              min="25"
              max="100"
              step="0.01"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum 25%</p>
          </div>

          <div>
            <Label htmlFor="total_shareholders">Total Shareholders *</Label>
            <Input
              id="total_shareholders"
              type="number"
              value={formData.total_shareholders}
              onChange={(e) => updateFormData('total_shareholders', parseInt(e.target.value) || 0)}
              placeholder="100"
              min="100"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum 100 shareholders</p>
          </div>
        </div>

        <div>
          <Label htmlFor="management_experience">Management Experience Details</Label>
          <Textarea
            id="management_experience"
            value={formData.management_experience_details}
            onChange={(e) => updateFormData('management_experience_details', e.target.value)}
            placeholder="Describe the experience and qualifications of key management..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="corporate_governance">Corporate Governance Details</Label>
          <Textarea
            id="corporate_governance"
            value={formData.corporate_governance_details}
            onChange={(e) => updateFormData('corporate_governance_details', e.target.value)}
            placeholder="Describe your corporate governance framework..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="business_operations">Business Operations Details</Label>
          <Textarea
            id="business_operations"
            value={formData.business_operations_details}
            onChange={(e) => updateFormData('business_operations_details', e.target.value)}
            placeholder="Describe your business operations and revenue model..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sponsoring_broker">Sponsoring Broker</Label>
            <Input
              id="sponsoring_broker"
              value={formData.sponsoring_broker}
              onChange={(e) => updateFormData('sponsoring_broker', e.target.value)}
              placeholder="Name of sponsoring broker"
            />
          </div>

          <div>
            <Label htmlFor="underwriter">Underwriter</Label>
            <Input
              id="underwriter"
              value={formData.underwriter}
              onChange={(e) => updateFormData('underwriter', e.target.value)}
              placeholder="Name of underwriter"
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Submit Application"}
        </Button>
      </form>
    </Card>
  );
};

export default BusinessApplicationForm;
