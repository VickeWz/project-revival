import { useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  UserPlus,
  Trophy,
  Zap,
  Settings,
} from "lucide-react";
import { Link, useNavigate } from "@/lib/router-compat";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Social media icons as simple components
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const SnapchatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.217-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status: "online" | "offline";
  stepsToday: number;
  rank: number;
}

const friends: Friend[] = [
  { id: "1", name: "Alex Johnson", username: "alexj", avatar: "A", status: "online", stepsToday: 18432, rank: 1 },
  { id: "2", name: "Emma Wilson", username: "emmaw", avatar: "E", status: "online", stepsToday: 15500, rank: 2 },
  { id: "3", name: "Marcus Lee", username: "marcusl", avatar: "M", status: "offline", stepsToday: 12621, rank: 3 },
  { id: "4", name: "Sophie Chen", username: "sophiec", avatar: "S", status: "online", stepsToday: 9234, rank: 4 },
];

const Friends = () => {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSocialShare = (platform: string) => {
    const username = profile?.display_name || "user";
    const message = `Add me on GameRun! My username is @${username.toLowerCase().replace(/\s/g, "")} 🏃‍♂️`;
    
    switch (platform) {
      case 'instagram':
        // Instagram doesn't have direct share, copy username instead
        navigator.clipboard.writeText(`@${username.toLowerCase().replace(/\s/g, "")}`);
        toast.success("Username copied! Share it on Instagram 📸");
        break;
      case 'snapchat':
        navigator.clipboard.writeText(message);
        toast.success("Message copied! Share it on Snapchat 👻");
        break;
      case 'tiktok':
        navigator.clipboard.writeText(message);
        toast.success("Message copied! Share it on TikTok 🎵");
        break;
    }
  };

  const handleAddByUsername = () => {
    if (searchQuery.trim()) {
      toast.info(`Searching for @${searchQuery}...`);
      // In real implementation, this would search the database
    }
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative">
        <motion.div
          className="absolute top-10 right-0 w-48 h-48 rounded-full gradient-activity opacity-15 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
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
            <h1 className="font-display text-xl font-bold text-foreground">Friends</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="text-foreground hover:bg-primary/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          {/* Search by Username */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddByUsername()}
                className="pl-12 pr-20 bg-card neon-border rounded-xl h-12 focus:shadow-glow-primary transition-shadow"
              />
              <Button 
                size="sm" 
                onClick={handleAddByUsername}
                className="absolute right-2 top-1/2 -translate-y-1/2 gradient-activity"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Add via Social Media */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-5 neon-border mb-6"
          >
            <h2 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Friends via Social Media
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Share your username on social media to connect with friends! 📱
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSocialShare('instagram')}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white shadow-lg"
              >
                <InstagramIcon />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSocialShare('snapchat')}
                className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center text-black shadow-lg"
              >
                <SnapchatIcon />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSocialShare('tiktok')}
                className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center text-white shadow-lg border border-white/20"
              >
                <TikTokIcon />
              </motion.button>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Your username: <span className="text-primary font-mono">@{profile?.display_name?.toLowerCase().replace(/\s/g, "") || "user"}</span>
              </p>
            </div>
          </motion.div>

          {/* Leaderboard / Friends List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Today's Leaderboard
              </h2>
              <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium">
                {friends.length} friends
              </span>
            </div>
            <div className="space-y-3">
              {filteredFriends.map((friend, index) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ x: 5, scale: 1.01 }}
                  className={`bg-card rounded-2xl p-4 flex items-center gap-4 neon-border cursor-pointer ${
                    friend.rank === 1 ? "ring-2 ring-primary/30" : ""
                  }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    <span className="text-lg">{getRankEmoji(friend.rank)}</span>
                  </div>

                  {/* Avatar */}
                  <div className="relative">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-primary-foreground ${
                        friend.rank === 1 ? "gradient-hero shadow-glow-primary" : "gradient-activity"
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {friend.avatar}
                    </motion.div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${
                        friend.status === "online" ? "bg-green-500" : "bg-muted-foreground"
                      }`}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{friend.name}</p>
                    <p className="text-sm text-muted-foreground">@{friend.username}</p>
                  </div>

                  {/* Steps */}
                  <div className="text-right">
                    <p className="font-bold text-primary flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {friend.stepsToday.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">steps</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredFriends.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                <p className="text-muted-foreground">No friends found 🔍</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Friends;
