import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@/lib/router-compat";
import { 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Smartphone,
  Gamepad2,
  Video,
  Music,
  MessageCircle,
  Camera,
  Globe,
  BookOpen
} from "lucide-react";

interface ChildScreenTimeData {
  id: string;
  name: string;
  avatar: string | null;
  dailyAverage: number;
  weeklyData: number[];
  todayUsage: number;
  apps: AppUsage[];
  pickups: number;
  firstPickup: string;
}

interface AppUsage {
  name: string;
  icon: React.ReactNode;
  minutes: number;
  category: string;
  color: string;
}

interface ScreenTimeInsightsProps {
  children: { id: string; name: string; avatar: string | null }[];
}

export function ScreenTimeInsights({ children }: ScreenTimeInsightsProps) {
  const navigate = useNavigate();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState(6); // Today (last index)

  // Mock data for demonstration - in production, fetch from database
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const dayNames = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return weekDays[date.getDay()];
  });

  const mockChildData: ChildScreenTimeData = {
    id: children[selectedChildIndex]?.id || "1",
    name: children[selectedChildIndex]?.name || "Child",
    avatar: children[selectedChildIndex]?.avatar || null,
    dailyAverage: 127, // 2h 7m
    weeklyData: [95, 142, 88, 156, 120, 98, 145], // Minutes per day
    todayUsage: 145,
    apps: [
      { name: "YouTube", icon: <Video className="w-5 h-5" />, minutes: 62, category: "Entertainment", color: "bg-red-500" },
      { name: "Roblox", icon: <Gamepad2 className="w-5 h-5" />, minutes: 38, category: "Games", color: "bg-green-500" },
      { name: "TikTok", icon: <Camera className="w-5 h-5" />, minutes: 24, category: "Social", color: "bg-pink-500" },
      { name: "Safari", icon: <Globe className="w-5 h-5" />, minutes: 12, category: "Productivity", color: "bg-blue-500" },
      { name: "Spotify", icon: <Music className="w-5 h-5" />, minutes: 9, category: "Entertainment", color: "bg-emerald-500" },
    ],
    pickups: 47,
    firstPickup: "6:42 AM",
  };

  const maxMinutes = Math.max(...mockChildData.weeklyData);
  const totalWeeklyMinutes = mockChildData.weeklyData.reduce((a, b) => a + b, 0);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const categories = [
    { name: "Entertainment", color: "bg-blue-500", minutes: 71 },
    { name: "Games", color: "bg-green-500", minutes: 38 },
    { name: "Social", color: "bg-pink-500", minutes: 24 },
    { name: "Productivity", color: "bg-orange-500", minutes: 12 },
  ];

  return (
    <div className="space-y-4">
      {/* Child Selector */}
      {children.length > 1 && (
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={() => setSelectedChildIndex(Math.max(0, selectedChildIndex - 1))}
            disabled={selectedChildIndex === 0}
            className="p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-activity flex items-center justify-center text-lg font-bold text-primary-foreground">
              {mockChildData.name.charAt(0)}
            </div>
            <span className="font-semibold text-foreground">{mockChildData.name}</span>
          </div>
          <button
            onClick={() => setSelectedChildIndex(Math.min(children.length - 1, selectedChildIndex + 1))}
            disabled={selectedChildIndex === children.length - 1}
            className="p-2 rounded-full hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Weekly Usage Card - iOS Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Daily Average</span>
            <span className="text-sm text-muted-foreground">This Week</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-foreground">{formatTime(mockChildData.dailyAverage)}</span>
            <span className="text-sm text-muted-foreground">{formatTime(totalWeeklyMinutes)} total</span>
          </div>
        </div>

        {/* Bar Chart - iOS Style */}
        <div className="px-4 py-4">
          <div className="flex items-end justify-between gap-2 h-32">
            {mockChildData.weeklyData.map((minutes, index) => {
              const heightPercent = (minutes / maxMinutes) * 100;
              const isSelected = index === selectedDay;
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDay(index)}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <motion.div
                    className={`w-full rounded-lg transition-colors ${
                      isSelected ? "bg-primary" : "bg-muted"
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                  />
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {dayNames.map((day, index) => (
              <span
                key={index}
                className={`flex-1 text-center text-xs ${
                  index === selectedDay ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>

        {/* Selected Day Usage */}
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedDay === 6 ? "Today" : dayNames[selectedDay]}
            </span>
            <span className="text-lg font-semibold text-foreground">
              {formatTime(mockChildData.weeklyData[selectedDay])}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Categories Breakdown - iOS Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl p-4"
      >
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Categories</h3>
        
        {/* Stacked Bar */}
        <div className="h-6 rounded-full overflow-hidden flex mb-4">
          {categories.map((cat, index) => {
            const percent = (cat.minutes / mockChildData.todayUsage) * 100;
            return (
              <motion.div
                key={cat.name}
                className={`${cat.color} h-full`}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
              />
            );
          })}
        </div>

        {/* Category List */}
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                <span className="text-sm text-foreground">{cat.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">{formatTime(cat.minutes)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Most Used Apps - iOS Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold text-muted-foreground">Most Used</h3>
        </div>
        <div className="divide-y divide-border/50">
          {mockChildData.apps.map((app, index) => (
            <motion.div
              key={app.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center gap-4 px-4 py-3"
            >
              <div className={`w-10 h-10 rounded-xl ${app.color} flex items-center justify-center text-white`}>
                {app.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.category}</p>
              </div>
              <span className="text-sm text-muted-foreground">{formatTime(app.minutes)}</span>
            </motion.div>
          ))}
        </div>
        <button className="w-full px-4 py-3 text-sm text-primary text-center border-t border-border/50 hover:bg-muted/30 transition-colors">
          Show All Apps
        </button>
      </motion.div>

      {/* Pickups & Notifications - iOS Style */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Pickups</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{mockChildData.pickups}</p>
          <p className="text-xs text-muted-foreground mt-1">
            First at {mockChildData.firstPickup}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Notifications</span>
          </div>
          <p className="text-2xl font-bold text-foreground">124</p>
          <p className="text-xs text-muted-foreground mt-1">
            Avg. 18 per hour
          </p>
        </motion.div>
      </div>

      {/* Downtime & App Limits Quick Links - iOS Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-2xl overflow-hidden"
      >
        <button 
          onClick={() => navigate(`/parent/downtime?childId=${mockChildData.id}`)}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors border-b border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-foreground">Downtime</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <button 
          onClick={() => navigate(`/parent/app-limits?childId=${mockChildData.id}`)}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors border-b border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-foreground">App Limits</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <button 
          onClick={() => navigate(`/parent/always-allowed?childId=${mockChildData.id}`)}
          className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-foreground">Always Allowed</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </motion.div>
    </div>
  );
}
