import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Footprints, Timer, MapPin, Trophy, Flame, Zap } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, LabelList } from "recharts";
import { useState, useEffect } from "react";
import { healthKitService, type DailyHealthData } from "@/services/healthKit";
import { useStreak } from "@/hooks/useStreak";

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

// Custom label component for white numbers above bars
const renderCustomBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text 
      x={x + width / 2} 
      y={y - 8} 
      fill="white" 
      textAnchor="middle" 
      fontSize={11}
      fontWeight="bold"
    >
      {value}m
    </text>
  );
};

export const StatsSection = () => {
  const [period, setPeriod] = useState("week");
  const [weeklyData, setWeeklyData] = useState<DailyHealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const { streak } = useStreak();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await healthKitService.getWeeklyData();
      setWeeklyData(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const monthlyData = [
    { week: "W1", steps: 65000, distance: 48, screenTime: 320 },
    { week: "W2", steps: 72000, distance: 53, screenTime: 360 },
    { week: "W3", steps: 58000, distance: 42, screenTime: 290 },
    { week: "W4", steps: 81000, distance: 59, screenTime: 405 },
  ];

  const data = period === "week" ? weeklyData : monthlyData;
  const xKey = period === "week" ? "day" : "week";

  const totalSteps = data.reduce((sum, d) => sum + d.steps, 0);
  const totalDistance = data.reduce((sum, d) => sum + d.distance, 0);
  const totalScreenTime = data.reduce((sum, d) => sum + d.screenTime, 0);
  const avgSteps = data.length > 0 ? Math.round(totalSteps / data.length) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg text-foreground">Statistics</h2>
      </div>

      {/* Streak Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl p-4 neon-border mb-4 flex items-center justify-between"
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
      <Tabs value={period} onValueChange={setPeriod} className="w-full mb-4">
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
      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard
          title="Total Steps"
          value={totalSteps.toLocaleString().replace(/,/g, ' ')}
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
          value={avgSteps.toLocaleString().replace(/,/g, ' ')}
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
        className="bg-card rounded-2xl p-5 neon-border mb-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Activity Overview</h3>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="stepsGradientHome" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#stepsGradientHome)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Screen Time Chart with Labels */}
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
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradientHome" x1="0" y1="0" x2="0" y2="1">
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
              <Bar dataKey="screenTime" fill="url(#barGradientHome)" radius={[8, 8, 0, 0]}>
                <LabelList 
                  dataKey="screenTime" 
                  position="top" 
                  content={renderCustomBarLabel}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};
