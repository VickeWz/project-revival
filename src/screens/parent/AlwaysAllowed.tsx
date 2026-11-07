// @ts-nocheck -- imported code written for a looser TypeScript config
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Plus,
  Trash2,
  Phone,
  MessageSquare,
  Camera,
  Map,
  Clock,
  Music,
  BookOpen,
  Heart
} from "lucide-react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AllowedApp {
  id: string;
  app_name: string;
  category: string;
}

const PRESET_APPS = [
  { name: "Phone", category: "Communication", icon: Phone },
  { name: "Messages", category: "Communication", icon: MessageSquare },
  { name: "FaceTime", category: "Communication", icon: Camera },
  { name: "Maps", category: "Utilities", icon: Map },
  { name: "Clock", category: "Utilities", icon: Clock },
  { name: "Health", category: "Health", icon: Heart },
  { name: "Apple Music", category: "Entertainment", icon: Music },
  { name: "Books", category: "Education", icon: BookOpen },
  { name: "Podcasts", category: "Entertainment", icon: Music },
  { name: "Camera", category: "Utilities", icon: Camera },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Communication": return "bg-green-500";
    case "Entertainment": return "bg-pink-500";
    case "Health": return "bg-red-500";
    case "Education": return "bg-blue-500";
    default: return "bg-gray-500";
  }
};

export default function AlwaysAllowed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get("childId");
  const { profile } = useAuth();
  
  const [allowedApps, setAllowedApps] = useState<AllowedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [childName, setChildName] = useState("");

  useEffect(() => {
    if (profile?.id && childId) {
      fetchAllowedApps();
      fetchChildName();
    }
  }, [profile?.id, childId]);

  const fetchChildName = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", childId)
      .maybeSingle();
    
    if (data) setChildName(data.display_name);
  };

  const fetchAllowedApps = async () => {
    if (!profile?.id || !childId) return;
    
    const { data } = await supabase
      .from("always_allowed_apps")
      .select("*")
      .eq("parent_id", profile.id)
      .eq("child_id", childId);

    if (data) setAllowedApps(data);
    setLoading(false);
  };

  const handleAddApp = async (appName: string, category: string) => {
    if (!profile?.id || !childId) return;
    
    const { error } = await supabase
      .from("always_allowed_apps")
      .insert({
        parent_id: profile.id,
        child_id: childId,
        app_name: appName,
        category: category,
      });

    if (error) {
      if (error.code === "23505") {
        toast.error("This app is already in the always allowed list");
      } else {
        toast.error("Failed to add app");
      }
    } else {
      toast.success(`Added ${appName} to always allowed`);
      fetchAllowedApps();
      setShowAddDialog(false);
    }
  };

  const handleRemoveApp = async (id: string, name: string) => {
    const { error } = await supabase
      .from("always_allowed_apps")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove app");
    } else {
      toast.success(`Removed ${name} from always allowed`);
      setAllowedApps(prev => prev.filter(a => a.id !== id));
    }
  };

  const getAppIcon = (appName: string) => {
    const app = PRESET_APPS.find(a => a.name === appName);
    return app?.icon || Phone;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 gradient-glass border-b border-border/50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-xl text-foreground">Always Allowed</h1>
              {childName && <p className="text-sm text-muted-foreground">{childName}</p>}
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        {allowedApps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 bg-card rounded-2xl"
          >
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display font-bold text-lg text-foreground mb-2">No Apps Set</h3>
            <p className="text-muted-foreground mb-6">Add apps that are always available, even during downtime</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add App
            </Button>
          </motion.div>
        ) : (
          <div className="bg-card rounded-2xl overflow-hidden">
            {allowedApps.map((app, index) => {
              const IconComponent = getAppIcon(app.app_name);
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 ${index !== allowedApps.length - 1 ? "border-b border-border/50" : ""}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${getCategoryColor(app.category)} flex items-center justify-center`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{app.app_name}</p>
                    <p className="text-xs text-muted-foreground">{app.category}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveApp(app.id, app.app_name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-muted/30 rounded-2xl p-4 mt-6"
        >
          <p className="text-sm text-muted-foreground">
            Apps in this list will always be available to your child, even during downtime 
            or when screen time runs out. Use this for essential apps like Phone and Messages.
          </p>
        </motion.div>
      </main>

      {/* Add App Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Always Allowed App</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <div className="space-y-2">
              {PRESET_APPS.filter(app => !allowedApps.some(a => a.app_name === app.name)).map((app) => (
                <button
                  key={app.name}
                  onClick={() => handleAddApp(app.name, app.category)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-xl ${getCategoryColor(app.category)} flex items-center justify-center`}>
                    <app.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.category}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
