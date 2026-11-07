import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/lib/router-compat";
import { ArrowLeft, ChevronDown } from "lucide-react";
const questions = [
  ["Hur tjänar jag skärmtid?", "Stegen under ett pass hämtas från din iPhone. Varje 200 steg ger 1 minut. När du avslutar passet stäms stegen av mot Hälsa och tiden sparas."],
  ["Varför uppdateras inte stegen?", "Kontrollera att GameRun får läsa steg och distans i iPhones Hälsa-inställningar. Rörelsesensorn ger snabbare uppdateringar under pass, men iPhone kan leverera uppgifterna med fördröjning."],
  ["Hur kopplar jag mitt konto till en förälder?", "Din förälder kan välja Lägg till barn och koppla ditt konto med dina inloggningsuppgifter."],
  ["Hur ber jag om extra tid?", "Öppna din profil, välj antal minuter och skicka en förfrågan till din kopplade förälder."],
];
export default function HelpSupport() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);
  return <div className="min-h-screen bg-background"><header className="px-6 pt-12 pb-6 flex items-center gap-4"><Button variant="ghost" size="icon" aria-label="Tillbaka" onClick={() => navigate("/settings")}><ArrowLeft className="w-5 h-5" /></Button><h1 className="font-display text-xl font-bold">Hjälp och support</h1></header><main className="px-6 max-w-lg mx-auto space-y-4"><h2 className="font-semibold">Vanliga frågor</h2>{questions.map(([question, answer], i) => <div key={question} className="border-b border-border pb-4"><Button variant="ghost" className="w-full h-auto whitespace-normal justify-between text-left" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{question}<ChevronDown className="w-4 h-4 shrink-0 ml-3" /></Button>{open === i && <p className="text-sm text-muted-foreground mt-3">{answer}</p>}</div>)}</main></div>;
}
