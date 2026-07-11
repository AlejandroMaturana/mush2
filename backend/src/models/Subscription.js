import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Subscription extends Model {
  static PLANS = {
    FREE: { apiCallsPerMonth: 1000, dataRetentionDays: 30 },
    BASIC: { apiCallsPerMonth: 10000, dataRetentionDays: 90 },
    PREMIUM: { apiCallsPerMonth: 100000, dataRetentionDays: 365 },
  };

  static getPlanLimits(plan) {
    return Subscription.PLANS[plan] || Subscription.PLANS.FREE;
  }

  static createForUser(userId, plan = 'FREE') {
    const limits = Subscription.getPlanLimits(plan);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return Subscription.create({
      userId,
      plan,
      apiCallsPerMonth: limits.apiCallsPerMonth,
      dataRetentionDays: limits.dataRetentionDays,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
  }

  get usagePercentage() {
    if (this.apiCallsPerMonth === 0) return 100;
    return Math.round((this.apiCallsUsedThisMonth / this.apiCallsPerMonth) * 100);
  }

  get isExceeded() {
    return this.apiCallsUsedThisMonth >= this.apiCallsPerMonth;
  }
}

Subscription.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  plan: { type: DataTypes.ENUM('FREE', 'BASIC', 'PREMIUM'), defaultValue: 'FREE', allowNull: false },
  status: { type: DataTypes.ENUM('ACTIVE', 'CANCELED', 'PAST_DUE'), defaultValue: 'ACTIVE', allowNull: false },
  apiCallsPerMonth: { type: DataTypes.INTEGER, defaultValue: 1000, allowNull: false },
  apiCallsUsedThisMonth: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  dataRetentionDays: { type: DataTypes.INTEGER, defaultValue: 30, allowNull: false },
  currentPeriodStart: { type: DataTypes.DATE, allowNull: false },
  currentPeriodEnd: { type: DataTypes.DATE, allowNull: false },
  canceledAt: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  modelName: 'Subscription',
  tableName: 'subscriptions',
  timestamps: true,
});

export default Subscription;
