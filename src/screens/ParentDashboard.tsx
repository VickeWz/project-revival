// @ts-nocheck -- imported code written for a looser TypeScript config
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChildCard } from "@/components/ChildCard";
import { 
  LogOut, 
  Plus, 
  Bell, 
  Settings,
  TrendingUp,
  Users,
  Clock,
  Activity,
  Loader2,
  Check,
  X,
  Minus
} from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ParentNav } from "@/components/parent/ParentNav";
import { ScreenTimeInsights } from "@/components/parent/ScreenTimeInsights";

interface LinkedChild {
  id: string;
  name: string;
  avatar: string | null;
  screenTimeRemaining: number;
  activityProgress: number;
  isLocked: boolean;
}

interface ScreenTimeRequest {
  id: string;
  childId: string;
  childName: string;
  requestedMinutes: number;
  createdAt: string;
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [requests, setRequests] = useState<ScreenTimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [editingMinutes, setEditingMinutes] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"home" | "screentime">("home");
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.id) {
      fetchLinkedChildren();
      fetchPendingRequests();
    }
  }, [profile?.id]);

  const fetchLinkedChildren = async () => {
    if (!profile?.id) return;

    try {
      const { data: links, error: linksError } = await supabase
        .from("parent_child_links")
        .select("child_id")
        .eq("parent_id", profile.id);

      if (linksError) {
        console.error("Error fetching links:", linksError);
        return;
      }

      if (!links || links.length === 0) {
        setChildren([]);
        setLoading(false);
        return;
      }

      const childIds = links.map(link => link.child_id);

      const { data: childProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", childIds);

      if (profilesError) {
        console.error("Error fetching child profiles:", profilesError);
        return;
      }

      const { data: balances } = await supabase
        .from("screen_time_balance")
        .select("user_id, minutes_remaining")
        .in("user_id", childIds);

      const today = new Date().toISOString().split("T")[0];
      const { data: activities } = await supabase
        .from("activity_logs")
        .select("user_id, distance_meters")
        .in("user_id", childIds)
        .eq("logged_at", today);

      const linkedChildren: LinkedChild[] = (childProfiles || []).map(child => {
        const balance = balances?.find(b => b.user_id === child.id);
        const activity = activities?.find(a => a.user_id === child.id);
        const screenTime = balance?.minutes_remaining || 0;
        const distance = activity?.distance_meters || 0;
        const activityProgress = Math.min(100, Math.round((distance / 5000) * 100));

        return {
          id: child.id,
          name: child.display_name,
          avatar: child.avatar_url,
          screenTimeRemaining: screenTime,
          activityProgress,
          isLocked: screenTime <= 0,
        };
      });

      setChildren(linkedChildren);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("screen_time_requests")
        .select("id, child_id, requested_minutes, created_at")
        .eq("parent_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
        return;
      }

      if (!data || data.length === 0) {
        setRequests([]);
        return;
      }

      const childIds = data.map(r => r.child_id);
      const { data: childProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", childIds);

      const formattedRequests: ScreenTimeRequest[] = data.map(req => {
        const child = childProfiles?.find(p => p.id === req.child_id);
        return {
          id: req.id,
          childId: req.child_id,
          childName: child?.display_name || "Unknown",
          requestedMinutes: req.requested_minutes,
          createdAt: req.created_at,
        };
      });

      setRequests(formattedRequests);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleAcceptRequest = async (request: ScreenTimeRequest) => {
    setProcessingRequest(request.id);
    const minutesToGrant = editingMinutes[request.id] ?? request.requestedMinutes;
    
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("screen_time_requests")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Grant screen time
      const { data: balance } = await supabase
        .from("screen_time_balance")
        .select("minutes_remaining")
        .eq("user_id", request.childId)
        .maybeSingle();

      const currentMinutes = balance?.minutes_remaining || 0;

      const { error: balanceError } = await supabase
        .from("screen_time_balance")
        .upsert({
          user_id: request.childId,
          minutes_remaining: currentMinutes + minutesToGrant,
          last_updated: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (balanceError) throw balanceError;

      toast.success(`Approved ${minutesToGrant} minutes for ${request.childName}!`);
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setEditingMinutes(prev => {
        const newState = { ...prev };
        delete newState[request.id];
        return newState;
      });
      fetchLinkedChildren();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to approve request");
    } finally {
      setProcessingRequest(null);
    }
  };

  const adjustRequestMinutes = (requestId: string, currentMinutes: number, amount: number) => {
    const current = editingMinutes[requestId] ?? currentMinutes;
    const newValue = Math.max(5, Math.min(120, current + amount));
    setEditingMinutes(prev => ({ ...prev, [requestId]: newValue }));
  };

  const handleDeclineRequest = async (request: ScreenTimeRequest) => {
    setProcessingRequest(request.id);
    try {
      const { error } = await supabase
        .from("screen_time_requests")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;

      toast.info(`Declined request from ${request.childName}`);
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Failed to decline request");
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleGrantTime = async (childId: string, childName: string) => {
    try {
      const { data: balance } = await supabase
        .from("screen_time_balance")
        .select("minutes_remaining")
        .eq("user_id", childId)
        .maybeSingle();

      const currentMinutes = balance?.minutes_remaining || 0;

      const { error } = await supabase
        .from("screen_time_balance")
        .upsert({
          user_id: childId,
          minutes_remaining: currentMinutes + 15,
          last_updated: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast.success(`Granted 15 minutes to ${childName}!`, {
        description: "Screen time has been added to their account.",
      });

      fetchLinkedChildren();
    } catch (error) {
      console.error("Error granting time:", error);
      toast.error("Failed to grant screen time");
    }
  };

  const handleRemoveChild = async (childId: string, childName: string) => {
    try {
      const { error } = await supabase
        .from("parent_child_links")
        .delete()
        .eq("parent_id", profile?.id)
        .eq("child_id", childId);

      if (error) throw error;

      toast.success(`${childName} has been removed from your account`);
      setChildren(prev => prev.filter(c => c.id !== childId));
    } catch (error) {
      console.error("Error removing child:", error);
      toast.error("Failed to remove child");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const stats = [
    { label: "Total Kids", value: children.length.toString(), icon: Users, color: "gradient-activity" },
    { label: "Avg Activity", value: children.length > 0 ? `${Math.round(children.reduce((a, c) => a + c.activityProgress, 0) / children.length)}%` : "0%", icon: Activity, color: "gradient-reward" },
    { label: "Time Granted", value: `${children.reduce((a, c) => a + c.screenTimeRemaining, 0)}m`, icon: Clock, color: "gradient-hero" },
    { label: "Active Kids", value: children.filter(c => !c.isLocked).length.toString(), icon: TrendingUp, color: "gradient-activity" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 gradient-glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display font-bold text-xl text-foreground">
                Welcome, {profile?.display_name || 'Parent'}
              </h1>
              <p className="text-sm text-muted-foreground">Manage your children's screen time</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                  {requests.length}
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <ParentNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "home" ? (
          <>
            {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.color} rounded-2xl p-5 text-primary-foreground`}
            >
              <stat.icon className="w-6 h-6 mb-3 opacity-80" />
              <p className="text-2xl font-display font-bold">{stat.value}</p>
              <p className="text-sm opacity-80">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Children Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl text-foreground">Your Children</h2>
            <Button variant="outline" size="sm" onClick={() => navigate("/parent/add-child")}>
              <Plus className="w-4 h-4 mr-1" />
              Add Child
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : children.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-card rounded-2xl border border-border/50"
            >
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display font-bold text-lg text-foreground mb-2">No children linked yet</h3>
              <p className="text-muted-foreground mb-6">Link your child's account to start monitoring their activity</p>
              <Button onClick={() => navigate("/parent/add-child")} className="gradient-hero">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Child
              </Button>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {children.map((child, index) => (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ChildCard
                    name={child.name}
                    avatar={child.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${child.name}`}
                    screenTimeRemaining={child.screenTimeRemaining}
                    activityProgress={child.activityProgress}
                    isLocked={child.isLocked}
                    onGrantTime={() => handleGrantTime(child.id, child.name)}
                    onViewDetails={() => toast.info(`Viewing ${child.name}'s details`)}
                    onRemove={() => handleRemoveChild(child.id, child.name)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-8"
        >
          <h3 className="font-display font-bold text-lg text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-xs">Lock All</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Activity className="w-5 h-5" />
              <span className="text-xs">View Activity</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Bell className="w-5 h-5" />
              <span className="text-xs">Notifications</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/settings')}>
              <Settings className="w-5 h-5" />
              <span className="text-xs">Settings</span>
            </Button>
          </div>
        </motion.div>

        {/* Pending Screen Time Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-card rounded-2xl p-6 shadow-card border border-border/50"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg text-foreground">Pending Screen Time Requests</h3>
            {requests.length > 0 && (
              <span className="ml-auto bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-full">
                {requests.length} pending
              </span>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request, index) => {
                const currentMinutes = editingMinutes[request.id] ?? request.requestedMinutes;
                const isModified = currentMinutes !== request.requestedMinutes;
                
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-muted/30 rounded-xl border border-border/50"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 rounded-full gradient-activity flex items-center justify-center text-lg font-bold text-primary-foreground">
                        {request.childName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{request.childName}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested {request.requestedMinutes} minutes
                        </p>
                      </div>
                    </div>
                    
                    {/* Adjustable Minutes */}
                    <div className="flex items-center justify-between bg-card/50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-muted-foreground">Grant:</p>
                      <div className="flex items-center gap-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => adjustRequestMinutes(request.id, request.requestedMinutes, -5)}
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
                          disabled={currentMinutes <= 5}
                        >
                          <Minus className="w-4 h-4" />
                        </motion.button>
                        <div className="text-center min-w-[60px]">
                          <motion.span
                            key={currentMinutes}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className={`text-xl font-bold ${isModified ? 'text-primary' : 'text-foreground'}`}
                          >
                            {currentMinutes}
                          </motion.span>
                          <span className="text-sm text-muted-foreground ml-1">min</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => adjustRequestMinutes(request.id, request.requestedMinutes, 5)}
                          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
                          disabled={currentMinutes >= 120}
                        >
                          <Plus className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    
                    {isModified && (
                      <p className="text-xs text-primary mb-3 text-center">
                        Modified from {request.requestedMinutes} → {currentMinutes} minutes
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeclineRequest(request)}
                        disabled={processingRequest === request.id}
                      >
                        {processingRequest === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gradient-activity"
                        onClick={() => handleAcceptRequest(request)}
                        disabled={processingRequest === request.id}
                      >
                        {processingRequest === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Approve {currentMinutes}m
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
          </>
        ) : (
          <ScreenTimeInsights 
            children={children.map(c => ({ id: c.id, name: c.name, avatar: c.avatar }))} 
          />
        )}
      </main>
    </div>
  );
}