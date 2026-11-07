import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, User, Trophy, ChevronRight, Footprints, Zap, MapPin, Star, Timer, Sparkles, Settings } from "lucide-react";
import { Link, useNavigate } from "@/lib/router-compat";
import logo from "@/assets/logo.png";

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: "community" | "personal";
  progress: number;
  target: number;
  unit: string;
  reward: number;
  members?: number;
  isCompleted: boolean;
  icon: "steps" | "speed" | "location";
}

const challenges: Challenge[] = [
  {
    id: "1",
    title: "Complete a 500-kilometer run",
    description: "Join the community and run together!",
    type: "community",
    progress: 342,
    target: 500,
    unit: "km",
    reward: 60,
    members: 1345,
    isCompleted: false,
    icon: "steps",
  },
  {
    id: "2",
    title: "Run 15km this week",
    description: "Personal weekly goal",
    type: "personal",
    progress: 8.5,
    target: 15,
    unit: "km",
    reward: 30,
    isCompleted: false,
    icon: "steps",
  },
  {
    id: "3",
    title: "15,000 steps today",
    description: "Daily step challenge",
    type: "personal",
    progress: 12572,
    target: 15000,
    unit: "steps",
    reward: 2,
    isCompleted: false,
    icon: "steps",
  },
  {
    id: "4",
    title: "Run faster than 25 km/h",
    description: "Speed challenge",
    type: "personal",
    progress: 22,
    target: 25,
    unit: "km/h",
    reward: 1,
    isCompleted: false,
    icon: "speed",
  },
  {
    id: "5",
    title: "Visit Bäckby Centrum",
    description: "Location-based challenge",
    type: "personal",
    progress: 0,
    target: 1,
    unit: "visit",
    reward: 1,
    isCompleted: false,
    icon: "location",
  },
];

const finishedChallenges = [
  { id: "f1", title: "Run 15km", members: 89, type: "community" as const, reward: 30 },
  { id: "f2", title: "Run 10km in one hour", members: 234, type: "community" as const, reward: 45 },
];

const ChallengeIcon = ({ type }: { type: "steps" | "speed" | "location" }) => {
  switch (type) {
    case "steps":
      return <Footprints className="w-5 h-5" />;
    case "speed":
      return <Zap className="w-5 h-5" />;
    case "location":
      return <MapPin className="w-5 h-5" />;
  }
};

const Challenges = () => {
  const [activeTab, setActiveTab] = useState("community");
  const navigate = useNavigate();

  const communityChallenges = challenges.filter((c) => c.type === "community");
  const personalChallenges = challenges.filter((c) => c.type === "personal");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative">
        <motion.div
          className="absolute top-0 left-0 w-60 h-60 rounded-full gradient-hero opacity-10 blur-3xl"
          animate={{ x: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="px-6 pt-12">
          <div className="flex items-center justify-between mb-6">
            <Link to="/child" className="hover:opacity-80 transition-opacity">
              <motion.img
                src={logo}
                alt="GameRun"
                className="w-10 h-10 drop-shadow-[0_0_10px_hsl(200,100%,50%)]"
                whileHover={{ scale: 1.1 }}
              />
            </Link>
            <h1 className="font-display text-xl font-bold text-foreground">Challenges</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-foreground hover:bg-primary/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-card neon-border">
              <TabsTrigger
                value="community"
                className="gap-2 data-[state=active]:gradient-activity data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-primary"
              >
                <Users className="w-4 h-4" />
                Community
              </TabsTrigger>
              <TabsTrigger
                value="personal"
                className="gap-2 data-[state=active]:gradient-activity data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-primary"
              >
                <User className="w-4 h-4" />
                Personal
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="community" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Featured Community Challenge */}
                  {communityChallenges[0] && (
                    <motion.div
                      className="relative rounded-3xl overflow-hidden neon-border"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="absolute inset-0 gradient-hero opacity-90" />
                      <motion.div
                        className="absolute inset-0 bg-white/5"
                        animate={{ opacity: [0, 0.1, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                      <div className="relative p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-5 h-5 text-primary-foreground" />
                          <span className="text-xs font-semibold text-primary-foreground/80 uppercase tracking-wide">
                            Featured Challenge
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-bold text-primary-foreground mb-2">
                          {communityChallenges[0].title}
                        </h3>
                        <p className="text-primary-foreground/70 text-sm mb-4">{communityChallenges[0].description}</p>

                        <div className="flex items-center gap-6 mb-4">
                          <div className="text-primary-foreground/80">
                            <p className="text-xs opacity-70">Group Goal</p>
                            <p className="font-bold">
                              {communityChallenges[0].target} {communityChallenges[0].unit}
                            </p>
                          </div>
                          <div className="text-primary-foreground/80">
                            <p className="text-xs opacity-70">Members</p>
                            <p className="font-bold">{communityChallenges[0].members?.toLocaleString()}</p>
                          </div>
                          <div className="text-primary-foreground/80">
                            <p className="text-xs opacity-70">Reward</p>
                            <p className="font-bold flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {communityChallenges[0].reward}m
                            </p>
                          </div>
                        </div>

                        <Progress
                          value={(communityChallenges[0].progress / communityChallenges[0].target) * 100}
                          className="h-3 bg-primary-foreground/20"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-primary-foreground/70">
                            {communityChallenges[0].progress} / {communityChallenges[0].target}{" "}
                            {communityChallenges[0].unit}
                          </span>
                          <span className="text-xs text-primary-foreground/70">
                            {Math.round((communityChallenges[0].progress / communityChallenges[0].target) * 100)}%
                          </span>
                        </div>

                        <Button className="mt-4 bg-white/20 hover:bg-white/30 text-primary-foreground border border-white/30">
                          <Star className="w-4 h-4 mr-2" />
                          Join Challenge
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Finished Challenges */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-primary" />
                        Completed
                      </h2>
                      <Button variant="ghost" size="sm" className="text-primary">
                        See All
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {finishedChallenges.map((challenge, index) => (
                        <motion.div
                          key={challenge.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ x: 5 }}
                          className="bg-card rounded-2xl p-4 flex items-center gap-4 neon-border cursor-pointer"
                        >
                          <motion.div
                            className="w-12 h-12 rounded-xl gradient-activity flex items-center justify-center shadow-glow-primary"
                            whileHover={{ rotate: 10 }}
                          >
                            <Trophy className="w-6 h-6 text-primary-foreground" />
                          </motion.div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{challenge.title}</p>
                            <p className="text-sm text-muted-foreground">{challenge.members} members</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary flex items-center gap-1">
                              <Timer className="w-3 h-3" />+{challenge.reward}m
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="personal" className="mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Daily Challenges */}
                  <div>
                    <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Daily Challenges
                    </h2>
                    <div className="space-y-3">
                      {personalChallenges.slice(0, 3).map((challenge, index) => {
                        const progressPercent = (challenge.progress / challenge.target) * 100;
                        return (
                          <motion.div
                            key={challenge.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ x: 5, scale: 1.01 }}
                            className="bg-card rounded-2xl p-4 neon-border cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <motion.div
                                className="w-10 h-10 rounded-xl gradient-activity flex items-center justify-center text-primary-foreground shadow-glow-primary"
                                whileHover={{ rotate: 10 }}
                              >
                                <ChallengeIcon type={challenge.icon} />
                              </motion.div>
                              <div className="flex-1">
                                <p className="font-medium text-foreground text-sm">{challenge.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {challenge.progress.toLocaleString()} / {challenge.target.toLocaleString()}{" "}
                                  {challenge.unit}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-primary flex items-center gap-1">
                                <Timer className="w-3 h-3" />+{challenge.reward}m
                              </span>
                            </div>
                            <div className="mt-3 relative">
                              <Progress value={progressPercent} className="h-2" />
                              <span className="absolute right-0 -top-5 text-xs text-muted-foreground">
                                {progressPercent.toFixed(0)}%
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Location Challenges */}
                  <div>
                    <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Visit Challenges
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">Explore places for bonus screen time! 🗺️</p>
                    <div className="space-y-2">
                      {["Vasaparken", "Skrapan", "Björnön", "Vebobacken", "Domkyrkan"].map((place, index) => (
                        <motion.div
                          key={place}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                          whileHover={{ x: 5 }}
                          className="flex items-center justify-between py-3 px-4 bg-card rounded-xl neon-border cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:gradient-activity transition-all">
                              <MapPin className="w-4 h-4 text-primary group-hover:text-primary-foreground" />
                            </div>
                            <span className="text-sm text-foreground">{place}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-primary font-medium">+1h</span>
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground group-hover:border-primary transition-colors" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Challenges;
