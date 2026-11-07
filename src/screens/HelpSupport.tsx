import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  HelpCircle, 
  MessageCircle, 
  ChevronDown,
  Zap,
  Users,
  Heart,
  Clock,
  Mail,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

export default function HelpSupport() {
  const navigate = useNavigate();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      icon: <Zap className="w-4 h-4" />,
      question: "How do I earn screen time?",
      answer: "Start an Activity Pass from your dashboard and get moving! Every 100 meters you walk or run earns you 1 minute of screen time. The app uses your device's HealthKit to track your activity automatically.",
    },
    {
      icon: <Users className="w-4 h-4" />,
      question: "How do I link my account to a parent?",
      answer: "Ask your parent to add you as a child from their dashboard. They'll enter your email address, and once linked, they can approve screen time requests and monitor your activity.",
    },
    {
      icon: <Clock className="w-4 h-4" />,
      question: "How do screen time requests work?",
      answer: "Go to your Profile page and tap 'Ask for Time'. Select how many minutes you'd like and your parent will receive a notification. They can approve, modify the amount, or decline your request.",
    },
    {
      icon: <Heart className="w-4 h-4" />,
      question: "Why isn't HealthKit tracking my steps?",
      answer: "Make sure HealthKit is enabled in Settings. On iOS, go to Settings > Privacy > Health > GameRun and enable all permissions. Your device must have motion tracking enabled.",
    },
    {
      icon: <Zap className="w-4 h-4" />,
      question: "How do challenges work?",
      answer: "Challenges are fun goals you can complete to earn bonus rewards. Some are personal (reach a step goal) and some are social (compete with friends). Check the Challenges tab to see what's available!",
    },
    {
      icon: <Users className="w-4 h-4" />,
      question: "How do I add friends?",
      answer: "Go to the Friends tab and search for users by their username. You can also share your profile via social media to let friends find you.",
    },
  ];

  const contactOptions = [
    {
      icon: <Mail className="w-5 h-5" />,
      title: "Email Support",
      description: "Get help within 24 hours",
      action: () => {
        window.location.href = "mailto:support@gamerun.app";
      },
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Live Chat",
      description: "Chat with our team",
      action: () => {
        toast.info("Live chat coming soon!");
      },
    },
    {
      icon: <ExternalLink className="w-5 h-5" />,
      title: "Community Forum",
      description: "Connect with other users",
      action: () => {
        toast.info("Community forum coming soon!");
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 gradient-glass border-b border-border/50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold text-xl text-foreground">Help & Support</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 rounded-full gradient-hero mx-auto mb-4 flex items-center justify-center shadow-glow-primary">
            <HelpCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">
            How can we help?
          </h2>
          <p className="text-sm text-muted-foreground">
            Find answers to common questions or get in touch with our support team.
          </p>
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-card rounded-xl border border-border/50 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      {faq.icon}
                    </div>
                    <span className="font-medium text-foreground text-sm">{faq.question}</span>
                  </div>
                  <motion.div
                    animate={{ rotate: openFAQ === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-sm text-muted-foreground">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
            Contact Us
          </h3>
          <div className="space-y-3">
            {contactOptions.map((option, index) => (
              <motion.button
                key={option.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                onClick={option.action}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  {option.icon}
                </div>
                <div>
                  <p className="font-medium text-foreground">{option.title}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* App Version */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          GameRun v1.0.0 • Made with ❤️ for active families
        </motion.p>
      </main>
    </div>
  );
}
