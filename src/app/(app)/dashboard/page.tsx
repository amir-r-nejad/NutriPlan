
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Bot, NotebookText, Target, User, BrainCircuit, SplitSquareHorizontal } from "lucide-react"; // Removed Scaling
import Image from "next/image";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Welcome to NutriPlan!
        </h1>
        <p className="mt-4 text-lg leading-8 text-foreground/80">
          Your personalized guide to healthier eating and achieving your fitness goals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <User className="h-10 w-10 text-accent mb-3" />
            <CardTitle className="text-2xl">Your Profile</CardTitle>
            <CardDescription>Keep your health data and preferences up to date for the best recommendations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile" passHref>
              <Button className="w-full" variant="outline">
                Go to Profile <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <NotebookText className="h-10 w-10 text-accent mb-3" />
            <CardTitle className="text-2xl">Current Meal Plan</CardTitle>
            <CardDescription>View and manage your ongoing weekly meal schedule and track your progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/meal-plan/current" passHref>
              <Button className="w-full" variant="outline">
                View Current Plan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Bot className="h-10 w-10 text-accent mb-3" />
            <CardTitle className="text-2xl">AI-Optimized Plan</CardTitle>
            <CardDescription>Let our AI generate a personalized meal plan tailored to your needs and goals.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/meal-plan/optimized" passHref>
              <Button className="w-full">
                Generate AI Plan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-12 shadow-lg overflow-hidden">
        <div className="grid md:grid-cols-2 items-center">
          <div className="p-8">
            <Target className="h-10 w-10 text-primary mb-4" />
            <h2 className="text-3xl font-semibold text-primary mb-3">Nutrition Tools</h2>
            <p className="text-foreground/80 mb-6">
              Utilize our advanced planners and splitters to fine-tune your nutritional intake and match your fitness ambitions.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/tools/smart-calorie-planner" passHref>
                <Button variant="secondary">
                  <BrainCircuit className="mr-2 h-4 w-4" /> Smart Calorie Planner
                </Button>
              </Link>
              {/* Link to Daily Macro Breakdown removed as it's merged */}
              <Link href="/tools/macro-splitter" passHref>
                <Button variant="secondary">
                  <SplitSquareHorizontal className="mr-2 h-4 w-4" /> Macro Splitter
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative h-64 md:h-full">
            <Image 
              src="https://placehold.co/600x400.png" 
              alt="Healthy food" 
              layout="fill" 
              objectFit="cover"
              data-ai-hint="healthy food nutrition"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

    