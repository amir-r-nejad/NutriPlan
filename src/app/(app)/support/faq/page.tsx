
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SupportChat } from "@/components/SupportChat";
import { HelpCircle, MessageSquareQuote } from "lucide-react"; // Changed from MessageSquareQuestion

const faqItems = [
  {
    question: "How do I update my profile information?",
    answer: "You can update your general medical information and exercise preferences by navigating to the 'Profile' page from the sidebar. For detailed physical metrics (like weight, height, body fat %) or dietary preferences related to meal suggestions, these are typically managed within the 'Smart Calorie Planner' and 'Meal Suggestions' tools respectively."
  },
  {
    question: "How does the Smart Calorie Planner work?",
    answer: "The Smart Calorie Planner estimates your daily calorie and macronutrient needs. It uses the Mifflin-St Jeor equation for BMR, considers your activity level for TDEE, and then adjusts these based on your weight goals, body composition targets (optional), and selected diet goal (e.g., fat loss, muscle gain). You can find a detailed explanation within the 'How is this calculated?' section on the planner page itself."
  },
  {
    question: "Can the AI generate a full meal plan for me?",
    answer: "Yes! Navigate to the 'AI Meal Plan' page from the sidebar. Our AI will generate a personalized weekly meal plan based on your comprehensive profile data, including your goals, preferences, and restrictions."
  },
  {
    question: "How can I get ideas for a specific meal?",
    answer: "Use the 'Meal Suggestions' tool. You can either go there directly and select a meal type, or navigate from the 'Macro Splitter' tool after defining your macro breakdown per meal. The tool will then use AI to suggest meals fitting the target macros and your preferences."
  },
  {
    question: "What's the difference between 'Current Meal Plan' and 'AI Meal Plan'?",
    answer: "'Current Meal Plan' is where you can view and manually manage your weekly meal schedule. You can edit ingredients, custom names, and even AI-optimize individual meals. 'AI Meal Plan' is where our AI generates a complete, optimized weekly plan from scratch based on your profile."
  }
];

export default function FaqAndChatbotPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Frequently Asked Questions</CardTitle>
          </div>
          <CardDescription>
            Find answers to common questions about using NutriPlan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem value={`item-${index + 1}`} key={index}>
                <AccordionTrigger className="text-lg text-left hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
           <div className="flex items-center gap-3 mb-2">
            <MessageSquareQuote className="h-8 w-8 text-primary" /> 
            <CardTitle className="text-3xl font-bold">Still Have Questions?</CardTitle>
          </div>
          <CardDescription>
            If you couldn't find your answer in the FAQ, our support bot is here to help!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupportChat />
        </CardContent>
      </Card>
    </div>
  );
}
