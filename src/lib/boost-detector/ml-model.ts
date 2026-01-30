/**
 * ML Prediction Model for Boost ROI
 * Uses linear regression to predict campaign performance
 * Issue #565 - Content-to-Ads Loop
 */

import type {
  HistoricalBoostData,
  ModelPerformanceMetrics,
  PostFeatures,
  ROIPrediction,
} from "./types";

/**
 * Simple linear regression model for ROI prediction
 * In production, this would use a more sophisticated ML library
 * For now, implements basic multiple linear regression
 */
export class BoostROIPredictor {
  private weights: number[] = [];
  private bias: number = 0;
  private isTraned: boolean = false;
  private lastTrainedAt: Date | null = null;
  private trainingMetrics: ModelPerformanceMetrics | null = null;

  /**
   * Train the model on historical boost data
   * Uses gradient descent for simple linear regression
   */
  async train(historicalData: HistoricalBoostData[]): Promise<void> {
    if (historicalData.length < 5) {
      throw new Error(
        "Insufficient training data. Need at least 5 historical campaigns.",
      );
    }

    // Extract features and labels
    const X = historicalData.map((d) => this.extractFeatureVector(d.features));
    const y = historicalData.map((d) => this.calculateActualROI(d));

    // Initialize weights (one per feature)
    this.weights = new Array(X[0]!.length).fill(0);
    this.bias = 0;

    // Hyperparameters
    const learningRate = 0.01;
    const epochs = 1000;
    const n = X.length;

    // Gradient descent training
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Calculate predictions
      const predictions = X.map((x) => this.predict_raw(x));

      // Calculate gradients
      const dWeights = new Array(this.weights.length).fill(0);
      let dBias = 0;

      for (let i = 0; i < n; i++) {
        const error = predictions[i] - y[i];
        dBias += error;
        for (let j = 0; j < this.weights.length; j++) {
          dWeights[j] += error * X[i]![j]!;
        }
      }

      // Update weights and bias
      for (let j = 0; j < this.weights.length; j++) {
        this.weights[j] -= (learningRate * dWeights[j]) / n;
      }
      this.bias -= (learningRate * dBias) / n;
    }

    this.isTraned = true;
    this.lastTrainedAt = new Date();

    // Calculate training metrics
    this.trainingMetrics = this.calculateMetrics(X, y);
  }

  /**
   * Predict ROI for a given set of post features
   */
  async predict(features: PostFeatures): Promise<ROIPrediction> {
    if (!this.isTraned) {
      throw new Error("Model must be trained before making predictions");
    }

    const featureVector = this.extractFeatureVector(features);
    const predictedROI = this.predict_raw(featureVector);

    // Convert ROI prediction to campaign metrics
    // These are rough estimates based on the predicted ROI
    const budget = 100; // Default budget for prediction
    const estimatedRevenue = budget * (1 + predictedROI);
    const estimatedConversions = Math.round(estimatedRevenue / 50); // $50 per conversion
    const estimatedClicks = Math.round(estimatedConversions / 0.08); // 8% conversion rate
    const estimatedImpressions = Math.round(estimatedClicks / 0.025); // 2.5% CTR

    return {
      estimatedImpressions,
      estimatedClicks,
      estimatedConversions,
      estimatedCost: budget,
      estimatedROI: predictedROI,
      confidenceScore: this.trainingMetrics?.r2Score ?? 0.5,
    };
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(): Promise<ModelPerformanceMetrics> {
    if (!this.trainingMetrics) {
      throw new Error("Model has not been trained yet");
    }

    return this.trainingMetrics;
  }

  /**
   * Extract numerical feature vector from PostFeatures
   */
  private extractFeatureVector(features: PostFeatures): number[] {
    return [
      features.engagementRate,
      features.followerCount / 10000, // Normalize
      features.dayOfWeek / 7, // Normalize
      features.hourOfDay / 24, // Normalize
      features.hasMedia ? 1 : 0,
      features.hasHashtags ? 1 : 0,
      features.wordCount / 100, // Normalize
    ];
  }

  /**
   * Calculate actual ROI from historical data
   */
  private calculateActualROI(data: HistoricalBoostData): number {
    const revenue = data.conversions * 50; // Assume $50 per conversion
    const roi = (revenue - data.spend) / data.spend;
    return roi;
  }

  /**
   * Make raw prediction from feature vector
   */
  private predict_raw(features: number[]): number {
    let prediction = this.bias;
    for (let i = 0; i < this.weights.length; i++) {
      prediction += this.weights[i]! * features[i];
    }
    return prediction;
  }

  /**
   * Calculate model performance metrics
   */
  private calculateMetrics(
    X: number[][],
    yTrue: number[],
  ): ModelPerformanceMetrics {
    const yPred = X.map((x) => this.predict_raw(x));
    const n = yTrue.length;

    // Calculate metrics
    const mae = yTrue.reduce((sum, y, i) => sum + Math.abs(y - yPred[i]), 0) / n;

    const mse = yTrue.reduce((sum, y, i) => sum + Math.pow(y - yPred[i], 2), 0) / n;
    const rmse = Math.sqrt(mse);

    const yMean = yTrue.reduce((sum, y) => sum + y, 0) / n;
    const ssTot = yTrue.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssRes = yTrue.reduce(
      (sum, y, i) => sum + Math.pow(y - yPred[i], 2),
      0,
    );
    const r2Score = 1 - ssRes / ssTot;

    // Simplified accuracy, precision, recall, f1 for regression
    // These are not standard regression metrics but useful for monitoring
    const threshold = 0.1; // 10% error threshold
    const accurate = yTrue.filter(
      (y, i) => Math.abs(y - yPred[i]) < threshold * Math.abs(y),
    ).length;
    const accuracy = accurate / n;

    return {
      accuracy,
      precision: accuracy, // Simplified
      recall: accuracy, // Simplified
      f1Score: accuracy, // Simplified
      mae,
      rmse,
      r2Score,
      lastTrainedAt: this.lastTrainedAt ?? new Date(),
      sampleSize: n,
    };
  }
}

/**
 * Singleton instance for the predictor
 * In production, this would be stored in a cache or database
 */
let predictorInstance: BoostROIPredictor | null = null;

export function getPredictor(): BoostROIPredictor {
  if (!predictorInstance) {
    predictorInstance = new BoostROIPredictor();
  }
  return predictorInstance;
}
