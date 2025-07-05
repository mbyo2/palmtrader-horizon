
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageSquare, Phone, Mail, BookOpen } from "lucide-react";

const Help = () => {
  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <HelpCircle className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Help & Support</h1>
      </div>
      
      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="guides" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Guides
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Support
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Find answers to common questions about Palm Cacia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I start trading on Palm Cacia?</AccordionTrigger>
                  <AccordionContent>
                    To start trading, you need to create an account, complete KYC verification, 
                    deposit funds, and then you can start buying and selling stocks through our platform.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>What are the trading fees?</AccordionTrigger>
                  <AccordionContent>
                    Palm Cacia offers zero commission trading for most stocks and ETFs. 
                    Some premium features may have associated fees.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I deposit money into my account?</AccordionTrigger>
                  <AccordionContent>
                    You can deposit money through bank transfers, mobile money (MTN, Airtel), 
                    or by linking your bank account. Go to the Banking section to manage deposits.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Is my money safe with Palm Cacia?</AccordionTrigger>
                  <AccordionContent>
                    Yes, your funds are protected by bank-level security measures, encryption, 
                    and regulatory compliance. We follow strict financial regulations in Zambia.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>Can I trade international stocks?</AccordionTrigger>
                  <AccordionContent>
                    Yes, Palm Cacia provides access to both local Zambian stocks and international markets, 
                    including US stocks, crypto, and other global markets.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
              <CardDescription>
                Get in touch with our support team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="What can we help you with?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="Describe your issue or question..."
                  className="min-h-[100px]"
                />
              </div>
              <Button className="w-full">Send Message</Button>
            </CardContent>
          </Card>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Phone className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Phone Support</h3>
                <p className="text-sm text-muted-foreground">+260 XXX XXX XXX</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Email Support</h3>
                <p className="text-sm text-muted-foreground">support@palmcacia.com</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold">Live Chat</h3>
                <p className="text-sm text-muted-foreground">Available 24/7</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="guides" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• How to create your account</li>
                  <li>• Completing KYC verification</li>
                  <li>• Making your first deposit</li>
                  <li>• Placing your first trade</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Trading Basics</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Understanding market orders</li>
                  <li>• Setting up price alerts</li>
                  <li>• Reading stock charts</li>
                  <li>• Risk management</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Advanced Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Options trading</li>
                  <li>• Crypto investments</li>
                  <li>• IPO applications</li>
                  <li>• Portfolio analytics</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Two-factor authentication</li>
                  <li>• Account security tips</li>
                  <li>• Recognizing scams</li>
                  <li>• Safe trading practices</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>24/7 Support</CardTitle>
              <CardDescription>
                Our support team is here to help you anytime
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <div className="text-4xl">🎧</div>
                <h3 className="text-xl font-semibold">Need immediate help?</h3>
                <p className="text-muted-foreground">
                  Our support team is available 24/7 to assist you
                </p>
                <div className="flex justify-center space-x-4">
                  <Button>Start Live Chat</Button>
                  <Button variant="outline">Schedule Call</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Help;
