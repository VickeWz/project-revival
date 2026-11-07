import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <Database className="w-5 h-5" />,
      title: "Uppgifter som används",
      content: [
        "Steg, distans och aktivitetsminuter från Hälsa och rörelsesensorn",
        "E-postadress och namn för ditt konto",
        "Skärmtidssaldo och sparad aktivitet",
        "Kopplingar mellan föräldrar och barn",
      ],
    },
    {
      icon: <Lock className="w-5 h-5" />,
      title: "Skydd för dina uppgifter",
      content: [
        "Uppgifterna skickas genom krypterade anslutningar",
        "Inloggning skyddar ditt konto",
        "Åtkomstregler skyddar kontots uppgifter och familjekopplingar",
        "",
      ],
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: "Så används uppgifterna",
      content: [
        "För att omvandla fysisk aktivitet till skärmtid",
        "För att koppla barn och föräldrar",
        "",
        "För appens funktioner",
      ],
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      title: "Dina val",
      content: [
        "Se ditt konto och din sparade aktivitet i appen",
        "",
        "",
        "Hantera åtkomst till Hälsa i iPhones inställningar",
      ],
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Barns uppgifter",
      content: [
        "Barnets hälsouppgifter används för aktivitet och skärmtid.",
        "",
        "Kopplade föräldrar kan se barnets sparade aktivitet och hantera skärmtidsförfrågningar.",
        "AI-sammanfattningen använder bara dagens stegantal.",
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
          <h1 className="font-display font-bold text-xl text-foreground">Integritet</h1>
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
            Din integritet
          </h2>
          <p className="text-sm text-muted-foreground">
            Här beskriver vi vilka uppgifter GameRun använder. 
            
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
                {section.content.filter(Boolean).map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

      </main>
    </div>
  );
}
