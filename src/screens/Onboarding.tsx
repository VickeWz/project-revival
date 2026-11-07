import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Smartphone, 
  Target, 
  Footprints, 
  Users, 
  ArrowRight, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const parentSteps: OnboardingStep[] = [
  {
    icon: <Users className="w-8 h-8" />,
    title: "Welcome, Parent!",
    description: "GameRun helps you motivate your kids to stay active while managing their screen time in a healthy way.",
    color: "gradient-hero"
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: "Set Goals",
    description: "Create daily activity challenges for your children. They'll earn screen time by completing steps, distance, or active minutes.",
    color: "gradient-activity"
  },
  {
    icon: <Smartphone className="w-8 h-8" />,
    title: "Monitor Progress",
    description: "Track your children's activity and screen time balance from your dashboard. Grant bonus time for exceptional effort!",
    color: "gradient-reward"
  }
];

const childSteps: OnboardingStep[] = [
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "Welcome to GameRun!",
    description: "Get ready to move, earn, and play! The more you run, the more screen time you earn.",
    color: "gradient-activity"
  },
  {
    icon: <Footprints className="w-8 h-8" />,
    title: "Complete Challenges",
    description: "Walk, run, or play active games to complete daily challenges. Your activity is tracked automatically!",
    color: "gradient-hero"
  },
  {
    icon: <Activity className="w-8 h-8" />,
    title: "Earn Screen Time",
    description: "Every step counts! Reach your goals to unlock screen time and show your parents how active you are.",
    color: "gradient-reward"
  }
];

export default function Onboarding() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const steps = profile?.role === 'parent' ? parentSteps : childSteps;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleComplete = async () => {
    if (!profile) return;
    
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', profile.id);

      if (error) throw error;
      
      toast.success("You're all set! Let's get moving!");
      navigate(profile.role === 'parent' ? '/parent' : '/child');
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 rounded-full gradient-activity opacity-20 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 rounded-full gradient-reward opacity-20 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep 
                  ? 'w-8 bg-primary' 
                  : index < currentStep 
                    ? 'w-2 bg-primary/60' 
                    : 'w-2 bg-muted'
              }`}
              initial={false}
              animate={{ scale: index === currentStep ? 1.1 : 1 }}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-3xl p-8 shadow-card border border-border/50 text-center"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`w-20 h-20 rounded-2xl ${currentStepData.color} flex items-center justify-center mx-auto mb-6 text-primary-foreground`}
            >
              {currentStepData.icon}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-2xl font-bold text-foreground mb-4"
            >
              {currentStepData.title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground leading-relaxed mb-8"
            >
              {currentStepData.description}
            </motion.p>

            {/* Action button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                onClick={handleNext}
                size="lg"
                className="w-full gap-2"
                disabled={isCompleting}
              >
                {isCompleting ? (
                  "Setting up..."
                ) : isLastStep ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Skip button */}
        {!isLastStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 text-center"
          >
            <button
              onClick={handleComplete}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={isCompleting}
            >
              Skip intro
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
