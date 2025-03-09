
import { Button } from "@/components/ui/button";
import { Share, Twitter, Facebook, Linkedin, Mail, Copy, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";

interface SocialShareProps {
  symbol: string;
  title?: string;
  description?: string;
}

const SocialShare = ({ 
  symbol, 
  title = "Check out this stock!", 
  description = "I found this interesting stock on TradeHub. Take a look!" 
}: SocialShareProps) => {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDescription}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&summary=${encodedDescription}&title=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        toast({
          title: "Shared successfully",
          description: "Content has been shared via your device",
        });
      } else {
        throw new Error("Web Share API not supported");
      }
    } catch (error) {
      console.log("Sharing failed:", error);
      toast({
        title: "Sharing not supported",
        description: "Please use the social media buttons instead.",
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "The link has been copied to your clipboard",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again or use the share buttons",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground"
        onClick={handleShare}
      >
        <Share className="h-4 w-4 mr-2" />
        Share
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="text-[#1DA1F2]"
        onClick={() => window.open(shareLinks.twitter, "_blank")}
      >
        <Twitter className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="text-[#4267B2]"
        onClick={() => window.open(shareLinks.facebook, "_blank")}
      >
        <Facebook className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="text-[#0077B5]"
        onClick={() => window.open(shareLinks.linkedin, "_blank")}
      >
        <Linkedin className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground"
        onClick={() => window.open(shareLinks.email, "_blank")}
      >
        <Mail className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground"
        onClick={copyToClipboard}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default SocialShare;
