import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useNavigate } from "@/lib/router-compat";
import { ArrowLeft } from "lucide-react";
export default function Challenges() {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background pb-24">
    <header className="px-6 pt-12 pb-6 flex items-center gap-4"><Button variant="ghost" size="icon" aria-label="Tillbaka" onClick={() => navigate("/child")}><ArrowLeft className="w-5 h-5" /></Button><h1 className="font-display text-xl font-bold">Utmaningar</h1></header>
    <main className="px-6 max-w-lg mx-auto"><p className="text-muted-foreground mb-6">Inga utmaningar finns ännu.</p><Button onClick={() => navigate("/pass")}>Till pass</Button></main>
    <BottomNav />
  </div>;
}
