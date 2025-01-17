import { Button } from "@/components/ui/button";
import { Share, Twitter, Facebook, Linkedin } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface SocialShareProps {
  symbol: string;
  title?: string;
}

const SocialShare = ({ symbol, title = "Check out this stock!" }: SocialShareProps) => {
  const shareUrl = window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url: shareUrl,
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

  return (
    <div className="flex items-center space-x-2">
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
    </div>
  );
};

export default SocialShare;