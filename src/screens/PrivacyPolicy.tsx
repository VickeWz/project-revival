import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <Database className="w-5 h-5" />,
      title: "Data We Collect",
      content: [
        "Activity data (steps, distance, active minutes) from your device's health services",
        "Account information (email, display name) for authentication",
        "Screen time balances and activity logs",
        "Parent-child relationship data for family linking",
      ],
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "How We Protect Your Data",
      content: [
        "All data is encrypted in transit and at rest",
        "Secure authentication with industry-standard protocols",
        "Row-level security ensures users only access their own data",
        "Regular security audits and updates",
      ],
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: "How We Use Your Data",
      content: [
        "To track and reward physical activity with screen time",
        "To enable parent-child account linking and oversight",
        "To power challenges and leaderboards",
        "To improve app performance and features",
      ],
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      title: "Your Rights",
      content: [
        "Access your data anytime through your profile",
        "Request deletion of your account and all associated data",
        "Opt out of notifications at any time",
        "Control HealthKit permissions through device settings",
      ],
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Children's Privacy",
      content: [
        "We comply with COPPA (Children's Online Privacy Protection Act)",
        "Parental consent is required for accounts under 13",
        "Parents can view, manage, and delete their child's data",
        "We never sell children's data to third parties",
      ],
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
          <h1 className="font-display font-bold text-xl text-foreground">Privacy Policy</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 rounded-full gradient-activity mx-auto mb-4 flex items-center justify-center shadow-glow-primary">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">
            Your Privacy Matters
          </h2>
          <p className="text-sm text-muted-foreground">
            GameRun is committed to protecting your personal information. 
            This policy explains how we collect, use, and safeguard your data.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-card rounded-2xl p-5 border border-border/50"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  {section.icon}
                </div>
                <h3 className="font-display font-semibold text-foreground">{section.title}</h3>
              </div>
              <ul className="space-y-2">
                {section.content.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-muted/30 rounded-2xl p-5 text-center"
        >
          <Mail className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground mb-1">Questions about your privacy?</p>
          <a href="mailto:privacy@gamerun.app" className="text-primary font-medium text-sm">
            privacy@gamerun.app
          </a>
        </motion.div>

        {/* Last Updated */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Last updated: January 2026
        </motion.p>
      </main>
    </div>
  );
}
