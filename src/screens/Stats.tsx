import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Footprints, Timer, MapPin, Trophy, Flame, Zap, Settings } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Link, useNavigate } from "@/lib/router-compat";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const weeklyData = [
  { day: "Mon", steps: 8432, distance: 6.2, screenTime: 45 },
  { day: "Tue", steps: 12500, distance: 9.1, screenTime: 60 },
  { day: "Wed", steps: 5621, distance: 4.1, screenTime: 30 },
  { day: "Thu", steps: 15234, distance: 11.2, screenTime: 75 },
  { day: "Fri", steps: 9876, distance: 7.3, screenTime: 50 },
  { day: "Sat", steps: 18432, distance: 13.5, screenTime: 90 },
  { day: "Sun", steps: 7654, distance: 5.6, screenTime: 40 },
];

const monthlyData = [
  { week: "W1", steps: 65000, distance: 48, screenTime: 320 },
  { week: "W2", steps: 72000, distance: 53, screenTime: 360 },
  { week: "W3", steps: 58000, distance: 42, screenTime: 290 },
  { week: "W4", steps: 81000, distance: 59, screenTime: 405 },
];

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  change: number;
  icon: React.ReactNode;
  delay?: number;
}

const StatCard = ({ title, value, unit, change, icon, delay = 0 }: StatCardProps) => {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.03, y: -3 }}
      className="bg-card rounded-2xl p-4 neon-border relative overflow-hidden cursor-pointer"
    >
      <div className="absolute inset-0 gradient-glow opacity-20" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <motion.div
            className="w-10 h-10 rounded-xl gradient-activity flex items-center justify-center shadow-glow-primary"
            whileHover={{ rotate: 10 }}
          >
            {icon}
          </motion.div>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        </div>
        <p className="text-2xl font-bold text-primary">{value}</p>
        <p className="text-sm text-muted-foreground">{unit}</p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </div>
    </motion.div>
  );
};

const Stats = () => {
  const [period, setPeriod] = useState("week");
  const navigate = useNavigate();

  const data = period === "week" ? weeklyData : monthlyData;
  const xKey = period === "week" ? "day" : "week";

  const totalSteps = data.reduce((sum, d) => sum + d.steps, 0);
  const totalDistance = data.reduce((sum, d) => sum + d.distance, 0);
  const totalScreenTime = data.reduce((sum, d) => sum + d.screenTime, 0);
  const avgSteps = Math.round(totalSteps / data.length);

  // Current streak
  const streak = 5;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with animated background */}
      <div className="relative">
        <motion.div
          className="absolute top-0 right-0 w-60 h-60 rounded-full gradient-activity opacity-10 blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
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
            <h1 className="font-display text-xl font-bold text-foreground">Statistics</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-foreground hover:bg-primary/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Streak Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-4 neon-border mb-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center shadow-glow-primary"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <div>
                <p className="font-bold text-foreground">{streak} Day Streak!</p>
                <p className="text-sm text-muted-foreground">Keep it going! 🔥</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{streak}</p>
              <p className="text-xs text-muted-foreground">days</p>
            </div>
          </motion.div>

          {/* Period Tabs */}
          <Tabs value={period} onValueChange={setPeriod} className="w-full mb-6">
            <TabsList className="grid grid-cols-3 w-full bg-card neon-border">
              <TabsTrigger
                value="week"
                className="data-[state=active]:gradient-activity data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-primary"
              >
                Week
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="data-[state=active]:gradient-activity data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-primary"
              >
                Month
              </TabsTrigger>
              <TabsTrigger
                value="year"
                className="data-[state=active]:gradient-activity data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-primary"
              >
                Year
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard
              title="Total Steps"
              value={totalSteps.toLocaleString()}
              unit="steps"
              change={12}
              icon={<Footprints className="w-5 h-5 text-primary-foreground" />}
              delay={0.1}
            />
            <StatCard
              title="Distance"
              value={totalDistance.toFixed(1)}
              unit="kilometers"
              change={8}
              icon={<MapPin className="w-5 h-5 text-primary-foreground" />}
              delay={0.15}
            />
            <StatCard
              title="Screen Time"
              value={`${Math.floor(totalScreenTime / 60)}h ${totalScreenTime % 60}m`}
              unit="earned"
              change={15}
              icon={<Timer className="w-5 h-5 text-primary-foreground" />}
              delay={0.2}
            />
            <StatCard
              title="Avg Steps/Day"
              value={avgSteps.toLocaleString()}
              unit="per day"
              change={-3}
              icon={<Trophy className="w-5 h-5 text-primary-foreground" />}
              delay={0.25}
            />
          </div>

          {/* Steps Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl p-5 neon-border mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Activity Overview</h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="stepsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(200, 100%, 50%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(200, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey={xKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Area
                    type="monotone"
                    dataKey="steps"
                    stroke="hsl(200, 100%, 50%)"
                    strokeWidth={3}
                    fill="url(#stepsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Screen Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl p-5 neon-border"
          >
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground">Screen Time Earned</h3>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(200, 100%, 50%)" />
                      <stop offset="100%" stopColor="hsl(220, 100%, 55%)" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey={xKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Bar dataKey="screenTime" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Stats;
