
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportChat } from "@/components/SupportChat";
import { MessageSquareQuote } from "lucide-react"; // Changed from MessageSquareQuestion

export default function ChatbotSupportPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <MessageSquareQuote className="h-8 w-8 text-primary" /> 
            <CardTitle className="text-3xl font-bold">NutriPlan Support Chat</CardTitle>
          </div>
          <CardDescription>
            Have questions about how to use NutriPlan? Ask our support bot below!
            It can help you navigate features, understand tools, and make the most of your personalized nutrition journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupportChat />
        </CardContent>
      </Card>
    </div>
  );
}
