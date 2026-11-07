// Notification Service for push notifications
// Uses Web Notifications API with Capacitor fallback for native

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

class NotificationService {
  private hasPermission: boolean = false;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  async sendNotification(options: NotificationOptions): Promise<void> {
    if (!this.hasPermission) {
      await this.requestPermission();
    }

    if (this.hasPermission) {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
      });
    }
  }

  // Check and notify if screen time is zero
  checkScreenTimeAndNotify(minutesRemaining: number): void {
    if (minutesRemaining === 0) {
      this.sendNotification({
        title: '⏰ No Screen Time Left!',
        body: 'Get moving to earn more screen time! Every step counts.',
      });
    }
  }
}

export const notificationService = new NotificationService();
