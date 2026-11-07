// @ts-nocheck -- imported code written for a looser TypeScript config
// HealthKit Service for iOS native integration
// Uses the Capacitor 8-compatible Health plugin for real device data
import { screenTimeFromSteps } from '@/lib/screen-time';
import { Capacitor } from '@capacitor/core';
import { Health, type HealthDataType } from '@capgo/capacitor-health';

export interface HealthData {
  steps: number;
  distance: number; // in meters
  activeMinutes: number;
}

// Sample names for querying HealthKit
const READ_PERMISSIONS: HealthDataType[] = ['steps', 'distance', 'exerciseTime'];

export interface DailyHealthData {
  day: string;
  steps: number;
  distance: number;
  screenTime: number;
}

class HealthKitService {
  private isNative: boolean = false;
  private plugin: typeof Health | null = null;

  constructor() {
    // Check if we're running in a Capacitor native environment
    this.isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
    this.initPlugin();
  }

  private async initPlugin() {
    if (this.isNative) {
      try {
        // Dynamic import to avoid issues in web environment
        this.plugin = Health;
      } catch (error) {
        console.log('HealthKit plugin not available:', error);
        this.plugin = null;
      }
    }
  }

  async requestAuthorization(): Promise<boolean> {
    if (!this.isNative) {
      console.log('HealthKit is only available on native iOS devices');
      // Return true for web preview so users can test the UI
      return true;
    }

    try {
      // Ensure plugin is initialized
      if (!this.plugin) {
        await this.initPlugin();
      }

      if (!this.plugin) {
        console.log('HealthKit plugin could not be loaded');
        return false;
      }

      await this.plugin.requestAuthorization({
        read: READ_PERMISSIONS,
        write: [],
      });

      console.log('HealthKit authorization granted');
      return true;
    } catch (error) {
      console.error('HealthKit authorization error:', error);
      return false;
    }
  }

  async getTodayData(): Promise<HealthData> {
    if (!this.isNative) {
      // Return mock data for web preview
      return {
        steps: Math.floor(Math.random() * 5000) + 2000,
        distance: Math.floor(Math.random() * 3000) + 1000,
        activeMinutes: Math.floor(Math.random() * 60) + 20,
      };
    }

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const queryOptions = {
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        limit: 0, // No limit
      };

      // Query steps
      const stepsResult = await this.querySamples({
        ...queryOptions,
        sampleName: 'stepCount',
      });

      // Query distance (walking + running)
      const distanceResult = await this.querySamples({
        ...queryOptions,
        sampleName: 'distanceWalkingRunning',
      });

      // Query exercise time
      const exerciseResult = await this.querySamples({
        ...queryOptions,
        sampleName: 'appleExerciseTime',
      });

      // Sum up the results
      const steps = this.sumQuantity(stepsResult?.resultData);
      const distance = this.sumQuantity(distanceResult?.resultData);
      const activeMinutes = this.sumQuantity(exerciseResult?.resultData);

      return {
        steps: Math.round(steps),
        distance: Math.round(distance), // in meters
        activeMinutes: Math.round(activeMinutes),
      };
    } catch (error) {
      console.error('Error fetching HealthKit data:', error);
      return {
        steps: 0,
        distance: 0,
        activeMinutes: 0,
      };
    }
  }

  async getDistanceSince(startDate: Date): Promise<number> {
    if (!this.isNative) {
      // Return mock data for web preview - simulate walking
      const elapsedSeconds = (Date.now() - startDate.getTime()) / 1000;
      // Simulate ~1.5 m/s walking speed with some randomness
      return Math.floor(elapsedSeconds * 1.5 * (0.8 + Math.random() * 0.4));
    }

    try {
      const distanceResult = await this.querySamples({
        sampleName: 'distanceWalkingRunning',
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        limit: 0,
      });

      return Math.round(this.sumQuantity(distanceResult?.resultData));
    } catch (error) {
      console.error('Error fetching distance:', error);
      return 0;
    }
  }

  private async querySamples(options: { sampleName: string; startDate: string; endDate: string; limit: number }) {
    const types: Record<string, HealthDataType> = {
      stepCount: 'steps',
      distanceWalkingRunning: 'distance',
      appleExerciseTime: 'exerciseTime',
    };
    const dataType = types[options.sampleName];
    if (!dataType) throw new Error('Unsupported health data type');
    const { samples } = await Health.queryAggregated({
      dataType,
      startDate: options.startDate,
      endDate: options.endDate,
      bucket: 'day',
      aggregation: 'sum',
    });
    return { resultData: samples };
  }

  private sumQuantity(data: { value: number }[] | undefined): number {
    if (!data || !Array.isArray(data)) return 0;
    return data.reduce((sum, item) => {
      const value = item.value || 0;
      return sum + value;
    }, 0);
  }

  // Calculate screen time earned based on activity
  calculateScreenTimeEarned(data: HealthData): number {
    return screenTimeFromSteps(data.steps);
  }


  isAvailable(): boolean {
    return this.isNative;
  }

  // Get weekly data for stats
  async getWeeklyData(): Promise<DailyHealthData[]> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: DailyHealthData[] = [];
    
    if (!this.isNative) {
      // Return mock data for web preview
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        result.push({
          day: days[date.getDay()],
          steps: Math.floor(Math.random() * 15000) + 3000,
          distance: Math.floor(Math.random() * 10) + 2,
          screenTime: Math.floor(Math.random() * 80) + 20,
        });
      }
      return result;
    }

    try {
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const queryOptions = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          limit: 0,
        };

        const stepsResult = await this.querySamples({
          ...queryOptions,
          sampleName: 'stepCount',
        });

        const distanceResult = await this.querySamples({
          ...queryOptions,
          sampleName: 'distanceWalkingRunning',
        });

        const steps = Math.round(this.sumQuantity(stepsResult?.resultData));
        const distance = Math.round(this.sumQuantity(distanceResult?.resultData) / 1000); // Convert to km
        const screenTime = this.calculateScreenTimeEarned({ steps, distance: distance * 1000, activeMinutes: 0 });

        result.push({
          day: days[date.getDay()],
          steps,
          distance,
          screenTime,
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      // Return empty data on error
      return days.slice(0, 7).map((day) => ({
        day,
        steps: 0,
        distance: 0,
        screenTime: 0,
      }));
    }
  }
}

export const healthKitService = new HealthKitService();
