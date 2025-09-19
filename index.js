/**
 * Macro Black Swan Analysis Service
 *
 * This service performs comprehensive Black Swan event analysis by aggregating data from multiple
 * macro analysis services and using AI to assess systemic risk and probability of rare, high-impact events.
 *
 * Author: Muhammad Bilal Motiwala
 * Project: Black Swan
 * Version: 1.0.0
 *
 * Key Features:
 * - Real-time data aggregation from multiple Firestore collections
 * - AI-powered Black Swan risk assessment using OpenRouter API
 * - Automated scheduled analysis with configurable intervals
 * - RESTful API for manual triggers and data retrieval
 * - Comprehensive logging and error handling
 * - Graceful shutdown and cleanup procedures
 */

// Load environment variables from .env file
require("dotenv").config();

// Core Express.js dependencies for web server functionality
const express = require("express");
const cors = require("cors"); // Cross-Origin Resource Sharing middleware
const helmet = require("helmet"); // Security headers middleware
const rateLimit = require("express-rate-limit"); // Rate limiting middleware
const compression = require("compression"); // Response compression middleware

// Firebase Admin SDK for Firestore database operations
const admin = require("firebase-admin");

// HTTP client for making API requests to OpenRouter
const axios = require("axios");

// Cron job scheduler for automated analysis execution
const cron = require("node-cron");

// Event emitter for internal service communication
const { EventEmitter } = require("events");

// Custom prompt management system for AI analysis templates
const PromptManager = require("./prompts/prompt-config");

/**
 * Firebase Admin SDK Initialization
 *
 * Initializes Firebase Admin SDK using the service account key file.
 * This enables Firestore database operations for data aggregation and storage.
 * If initialization fails, the service continues to run without Firestore integration.
 */
let serviceAccount;
try {
  // Load Firebase service account credentials from JSON file
  serviceAccount = require("./serviceAccountKey.json");

  // Initialize Firebase Admin SDK with service account credentials
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ [FIREBASE] Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ [FIREBASE] Admin initialization failed:", error.message);
  console.log("ℹ️ [FIREBASE] Service will run without Firestore integration");
}

// Get Firestore database instance (null if initialization failed)
const db = admin.firestore ? admin.firestore() : null;

/**
 * Service Configuration Object
 *
 * Centralized configuration for all service parameters including:
 * - Firestore collection mappings
 * - API endpoints and credentials
 * - Analysis scheduling and timeouts
 * - Server and security settings
 */
const CONFIG = {
  /**
   * Firestore Collections Configuration
   * Maps service names to their corresponding Firestore collection names.
   * Note: Different collections use different timestamp field names for ordering.
   */
  COLLECTIONS: {
    BTC_ETH: "crypto_analyses", // Bitcoin/Ethereum analysis data (uses 'createdAt' field)
    MACRO: "macro_indicators_analysis", // Macro economic indicators (uses 'timestamp' field)
    NEWS: "news_analysis", // News impact analysis (uses 'createdAt' field)
    SENTIMENT: "sentiment_analysis", // Market sentiment data (uses 'timestamp' field)
    BULL_PEAK: "bull-market-peak-indicators", // Bull market peak indicators (uses 'timestamp' field)
  },

  /**
   * OpenRouter API Configuration
   * Settings for AI analysis requests to OpenRouter service
   */
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, // API key from environment variables
  OPENROUTER_URL: "https://openrouter.ai/api/v1/chat/completions", // OpenRouter API endpoint
  MODEL: "openai/gpt-5-mini", // AI model to use for analysis

  /**
   * Analysis Configuration
   * Controls the frequency and behavior of automated analysis
   */
  ANALYSIS_INTERVAL: "0 * * * *", // Cron expression: Every hour at minute 0
  REQUEST_TIMEOUT: 120000, // 2 minutes timeout for AI requests

  /**
   * Firestore Storage Configuration
   * Collection name for storing Black Swan analysis results
   */
  BLACKSWAN_COLLECTION: "blackswan_analyses",

  /**
   * Server Configuration
   * HTTP server and security settings
   */
  PORT: process.env.PORT || 8090, // Server port (default: 8090)
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // Rate limit window: 15 minutes
  RATE_LIMIT_MAX: 100, // Maximum requests per window
};

/**
 * Express Application Setup
 *
 * Creates and configures the Express.js web server with security middleware,
 * rate limiting, and request parsing capabilities.
 */
const app = express();

/**
 * Middleware Configuration
 *
 * Sets up essential middleware for security, performance, and request handling
 */
// Security middleware - adds various HTTP headers for security
app.use(helmet());

// CORS middleware - enables cross-origin requests
app.use(cors());

// Compression middleware - compresses response bodies
app.use(compression());

// JSON parsing middleware - parses JSON request bodies (max 10MB)
app.use(express.json({ limit: "10mb" }));

// URL-encoded parsing middleware - parses form data (max 10MB)
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * Rate Limiting Configuration
 *
 * Implements rate limiting to prevent abuse and ensure service stability
 */
const limiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT_WINDOW, // Time window: 15 minutes
  max: CONFIG.RATE_LIMIT_MAX, // Maximum requests per window: 100
  message: {
    error: "Too many requests",
    retryAfter: Math.ceil(CONFIG.RATE_LIMIT_WINDOW / 1000), // Retry after in seconds
  },
});
app.use(limiter);

/**
 * Event Emitter for Internal Communication
 *
 * Enables event-driven communication between different parts of the service
 * for analysis completion notifications and error handling
 */
const eventEmitter = new EventEmitter();

/**
 * Firestore Data Aggregation Service
 *
 * This service manages real-time data collection from multiple Firestore collections
 * using snapshot listeners. It maintains the latest data from each source and
 * provides aggregated data for Black Swan analysis.
 *
 * Key Responsibilities:
 * - Setup and manage Firestore snapshot listeners
 * - Maintain latest data from all configured collections
 * - Handle different timestamp field formats across collections
 * - Provide aggregated data for analysis
 * - Clean up listeners on service shutdown
 */
class FirestoreDataAggregationService {
  /**
   * Constructor - Initializes the data aggregation service
   */
  constructor() {
    // Storage for latest data from each service
    this.latestData = {
      BTC_ETH: null, // Bitcoin/Ethereum analysis data
      MACRO: null, // Macro economic indicators
      NEWS: null, // News impact analysis
      SENTIMENT: null, // Market sentiment data
      BULL_PEAK: null, // Bull market peak indicators
    };

    // Storage for historical Black Swan analyses (last 5)
    this.historicalAnalyses = [];

    // Registry of active Firestore listeners for cleanup
    this.listeners = {};

    // Initialization status flag
    this.isInitialized = false;

    // Initialize all Firestore listeners
    this.initializeListeners();
  }

  /**
   * Initialize Firestore snapshot listeners for all collections
   *
   * Sets up real-time listeners for all configured Firestore collections.
   * Each listener monitors the latest document in its respective collection
   * and updates the local data cache when changes occur.
   */
  initializeListeners() {
    // Check if Firestore is available
    if (!db) {
      console.warn(
        "⚠️ [FIRESTORE] Database not available, cannot initialize listeners"
      );
      return;
    }

    console.log(
      "🔄 [FIRESTORE] Initializing snapshot listeners for all collections"
    );

    // Setup listeners for each configured collection
    Object.entries(CONFIG.COLLECTIONS).forEach(
      ([serviceName, collectionName]) => {
        this.setupCollectionListener(serviceName, collectionName);
      }
    );

    // Setup listener for historical Black Swan analyses
    this.setupHistoricalAnalysesListener();

    // Setup listener for Bull Market Peak Indicators latest document
    this.setupBullPeakLatestListener();

    // Mark service as initialized
    this.isInitialized = true;
  }

  /**
   * Get the correct timestamp field name for a collection
   *
   * Different Firestore collections use different field names for timestamps.
   * This method returns the appropriate field name for ordering documents.
   *
   * @param {string} collectionName - Name of the Firestore collection
   * @returns {string} The timestamp field name to use for ordering
   */
  getTimestampField(collectionName) {
    // Collections that use 'createdAt' field for timestamps
    if (
      collectionName === "crypto_analyses" ||
      collectionName === "news_analysis"
    ) {
      return "createdAt";
    }

    // Collections that use 'timestamp' field for timestamps
    if (
      collectionName === "sentiment_analysis" ||
      collectionName === "macro_indicators_analysis"
    ) {
      return "timestamp";
    }

    // Default fallback to 'timestamp'
    return "timestamp";
  }

  /**
   * Setup listener for Bull Market Peak Indicators latest document
   *
   * This method sets up a snapshot listener for the "latest" document in the
   * bull-market-peak-indicators collection. This document contains the most
   * recent bull market peak indicator data.
   */
  setupBullPeakLatestListener() {
    try {
      console.log(
        `📡 [LISTENER] Setting up listener for Bull Market Peak Indicators (latest)`
      );

      // Reference to the "latest" document in bull-market-peak-indicators collection
      const latestRef = db
        .collection("bull-market-peak-indicators")
        .doc("latest");

      // Setup snapshot listener for the latest document
      const unsubscribe = latestRef.onSnapshot(
        (doc) => {
          if (doc.exists) {
            // Document exists - update local data cache
            const data = { id: doc.id, ...doc.data() };
            this.latestData.BULL_PEAK = data;

            // Extract timestamp for logging (try multiple possible field names)
            const ts = data?.timestamp || data?.collected_at || null;
            console.log(
              `✅ [LISTENER] Updated BULL_PEAK latest (${ts || "no timestamp"})`
            );
          } else {
            // Document doesn't exist - clear local data
            console.warn(
              `⚠️ [LISTENER] No latest Bull Market Peak Indicators document`
            );
            this.latestData.BULL_PEAK = null;
          }
        },
        (error) => {
          // Error in listener - log error and clear data
          console.error(
            `❌ [LISTENER] Error in BULL_PEAK listener:`,
            error.message
          );
          this.latestData.BULL_PEAK = null;
        }
      );

      // Store unsubscribe function for cleanup
      this.listeners["BULL_PEAK"] = unsubscribe;
    } catch (error) {
      console.error(
        `❌ [LISTENER] Failed to setup BULL_PEAK listener:`,
        error.message
      );
    }
  }

  /**
   * Get timestamp value from data regardless of field name
   *
   * Extracts and normalizes timestamp values from Firestore documents.
   * Handles both Firestore Timestamp objects and ISO string formats.
   *
   * @param {Object} data - Firestore document data
   * @param {string} collectionName - Name of the collection (for field name lookup)
   * @returns {string|null} Normalized timestamp as ISO string or null
   */
  getTimestampValue(data, collectionName) {
    if (!data) return null;

    // Get the correct timestamp field name for this collection
    const timestampField = this.getTimestampField(collectionName);
    const value = data[timestampField];

    // Handle Firestore Timestamp objects (convert to ISO string)
    if (value && typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }

    // Handle ISO strings or other formats (return as-is)
    return value || null;
  }

  /**
   * Setup a snapshot listener for a specific collection
   *
   * Creates a real-time listener for a Firestore collection that monitors
   * the latest document based on timestamp ordering.
   *
   * @param {string} serviceName - Internal service name (e.g., 'BTC_ETH', 'MACRO')
   * @param {string} collectionName - Firestore collection name
   */
  setupCollectionListener(serviceName, collectionName) {
    try {
      // Get the correct timestamp field name for this collection
      const timestampField = this.getTimestampField(collectionName);

      console.log(
        `📡 [LISTENER] Setting up listener for ${serviceName} (${collectionName}) using ${timestampField} field`
      );

      // Create snapshot listener for the latest document in the collection
      const unsubscribe = db
        .collection(collectionName)
        .orderBy(timestampField, "desc") // Order by timestamp descending
        .limit(1) // Get only the latest document
        .onSnapshot(
          (snapshot) => {
            if (!snapshot.empty) {
              // Document exists - update local data cache
              const doc = snapshot.docs[0];
              const data = { id: doc.id, ...doc.data() };
              this.latestData[serviceName] = data;

              // Extract and log timestamp for monitoring
              const timestampValue = this.getTimestampValue(
                data,
                collectionName
              );
              console.log(
                `✅ [LISTENER] Updated ${serviceName} data (${
                  timestampValue || "no timestamp"
                })`
              );
            } else {
              // No documents in collection - clear local data
              console.warn(
                `⚠️ [LISTENER] No data found in ${serviceName} collection`
              );
              this.latestData[serviceName] = null;
            }
          },
          (error) => {
            // Error in listener - log error and clear data
            console.error(
              `❌ [LISTENER] Error in ${serviceName} listener:`,
              error.message
            );
            this.latestData[serviceName] = null;
          }
        );

      // Store unsubscribe function for cleanup
      this.listeners[serviceName] = unsubscribe;
    } catch (error) {
      console.error(
        `❌ [LISTENER] Failed to setup listener for ${serviceName}:`,
        error.message
      );
    }
  }

  /**
   * Setup a snapshot listener for historical Black Swan analyses
   *
   * Creates a listener for the last 5 Black Swan analyses to provide
   * historical context for current analysis. This helps the AI understand
   * trends and changes over time.
   */
  setupHistoricalAnalysesListener() {
    try {
      console.log(
        `📡 [LISTENER] Setting up listener for historical blackswan analyses (${CONFIG.BLACKSWAN_COLLECTION})`
      );

      // Create snapshot listener for the last 5 analyses
      const unsubscribe = db
        .collection(CONFIG.BLACKSWAN_COLLECTION)
        .orderBy("timestamp", "desc") // Order by timestamp descending
        .limit(5) // Get last 5 analyses
        .onSnapshot(
          (snapshot) => {
            // Clear existing historical data
            this.historicalAnalyses = [];

            // Process each document in the snapshot
            snapshot.forEach((doc) => {
              const data = { id: doc.id, ...doc.data() };
              this.historicalAnalyses.push(data);
            });

            console.log(
              `✅ [LISTENER] Updated historical analyses (${this.historicalAnalyses.length} records)`
            );
          },
          (error) => {
            // Error in listener - log error and clear data
            console.error(
              `❌ [LISTENER] Error in historical analyses listener:`,
              error.message
            );
            this.historicalAnalyses = [];
          }
        );

      // Store unsubscribe function for cleanup
      this.listeners["HISTORICAL"] = unsubscribe;
    } catch (error) {
      console.error(
        `❌ [LISTENER] Failed to setup historical analyses listener:`,
        error.message
      );
    }
  }

  /**
   * Get current aggregated data from all listeners
   *
   * Collects and aggregates data from all active Firestore listeners,
   * providing a comprehensive view of the current state of all data sources.
   * Includes data quality metrics and service status information.
   *
   * @returns {Object} Aggregated data object with services, quality metrics, and historical data
   */
  getCurrentAggregatedData() {
    const startTime = Date.now();

    // Initialize aggregated data structure
    const aggregatedData = {
      timestamp: new Date().toISOString(), // Current timestamp
      collection_duration_ms: Date.now() - startTime, // Time taken to collect data
      services: {}, // Data from each service
      historical_analyses: this.historicalAnalyses, // Historical Black Swan analyses
      data_quality: {
        total_services: 5, // Total number of services
        successful_services: 0, // Services with valid data
        failed_services: 0, // Services without data
        service_status: {}, // Status of each service
      },
    };

    // Process current data from all listeners
    Object.entries(this.latestData).forEach(([serviceName, data]) => {
      const collectionName = CONFIG.COLLECTIONS[serviceName];
      const timestampValue = this.getTimestampValue(data, collectionName);

      // Debug logging for troubleshooting
      if (data) {
        const timestampField = this.getTimestampField(collectionName);
        console.log(
          `🔍 [DEBUG] ${serviceName}: field=${timestampField}, value=${timestampValue}, hasData=${!!data}`
        );
      }

      // Check if service has valid data with timestamp
      if (data && timestampValue) {
        // Service has valid data
        aggregatedData.services[serviceName] = {
          status: "success",
          data: data,
          service: serviceName,
          timestamp: timestampValue,
        };
        aggregatedData.data_quality.successful_services++;
        aggregatedData.data_quality.service_status[serviceName] = "available";
      } else {
        // Service has no data or invalid timestamp
        aggregatedData.services[serviceName] = {
          status: "failed",
          error: data ? "No timestamp found" : "No data available",
          service: serviceName,
        };
        aggregatedData.data_quality.failed_services++;
        aggregatedData.data_quality.service_status[serviceName] = "unavailable";
      }
    });

    // Log data quality summary
    console.log(
      `📊 [AGGREGATION] ${aggregatedData.data_quality.successful_services}/${aggregatedData.data_quality.total_services} services have data`
    );

    return aggregatedData;
  }

  /**
   * Cleanup all listeners
   *
   * Removes all active Firestore snapshot listeners to prevent memory leaks
   * and ensure graceful shutdown. This method should be called when the
   * service is shutting down.
   */
  cleanup() {
    console.log("🧹 [CLEANUP] Removing all Firestore listeners");

    // Unsubscribe from all active listeners
    Object.values(this.listeners).forEach((unsubscribe) => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    });

    // Clear the listeners registry
    this.listeners = {};
  }
}

/**
 * Black Swan Analysis Service
 *
 * This is the core AI analysis engine that performs comprehensive Black Swan event analysis.
 * It aggregates data from multiple sources, processes it through AI analysis, and stores
 * the results in Firestore.
 *
 * Key Responsibilities:
 * - Coordinate data aggregation from multiple sources
 * - Prepare data for AI analysis
 * - Generate AI-powered Black Swan risk assessments
 * - Process and validate AI responses
 * - Store analysis results in Firestore
 * - Provide API endpoints for data retrieval
 */
class BlackSwanAnalysisService {
  /**
   * Constructor - Initializes the Black Swan analysis service
   */
  constructor() {
    // Initialize prompt management system for AI analysis templates
    this.promptManager = new PromptManager();

    // Initialize data aggregation service for Firestore integration
    this.dataAggregator = new FirestoreDataAggregationService();
  }

  /**
   * Perform comprehensive Black Swan risk analysis
   *
   * This is the main analysis method that orchestrates the entire Black Swan
   * risk assessment process. It follows a structured workflow to ensure
   * comprehensive and reliable analysis.
   *
   * @returns {Object} Analysis result with success status, data, and metadata
   */
  async performBlackSwanAnalysis() {
    console.log("🦢 [BLACKSWAN] Starting Black Swan risk analysis");

    try {
      // Step 1: Get current data from Firestore listeners
      const aggregatedData = this.dataAggregator.getCurrentAggregatedData();

      // Step 2: Check if we have sufficient data for analysis
      if (aggregatedData.data_quality.successful_services === 0) {
        throw new Error("No data available from any service");
      }

      // Step 3: Prepare data for AI analysis
      const analysisData = await this.prepareAnalysisData(aggregatedData);

      // Step 4: Generate AI analysis using OpenRouter
      const aiAnalysis = await this.generateAIAnalysis(analysisData);

      // Step 5: Process and validate AI results
      const processedResults = await this.processAnalysisResults(
        aiAnalysis,
        aggregatedData
      );

      // Step 6: Store analysis results in Firestore
      const storageResult = await this.storeAnalysis(processedResults);

      console.log("✅ [BLACKSWAN] Analysis completed successfully");

      // Emit event for other parts of the system
      eventEmitter.emit("analysisComplete", processedResults);

      return {
        success: true,
        analysis: processedResults,
        storage: storageResult,
        data_quality: aggregatedData.data_quality,
      };
    } catch (error) {
      console.error("❌ [BLACKSWAN] Analysis failed:", error.message);

      // Emit error event for monitoring
      eventEmitter.emit("analysisError", error);

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Prepare aggregated data for AI analysis
   *
   * Transforms raw aggregated data into a format suitable for AI analysis.
   * Formats data from each service and prepares historical context for
   * comprehensive Black Swan risk assessment.
   *
   * @param {Object} aggregatedData - Raw data from all services
   * @returns {Object} Formatted data ready for AI analysis
   */
  async prepareAnalysisData(aggregatedData) {
    const services = aggregatedData.services;

    // Extract and format data from each service
    const btcEthAnalysis =
      services.BTC_ETH?.status === "success"
        ? this.formatServiceData(services.BTC_ETH.data, "BTC/ETH")
        : "BTC/ETH analysis service unavailable";

    const macroAnalysis =
      services.MACRO?.status === "success"
        ? this.formatServiceData(services.MACRO.data, "Macro")
        : "Macro indicators service unavailable";

    const newsAnalysis =
      services.NEWS?.status === "success"
        ? this.formatServiceData(services.NEWS.data, "News")
        : "News analysis service unavailable";

    const sentimentAnalysis =
      services.SENTIMENT?.status === "success"
        ? this.formatServiceData(services.SENTIMENT.data, "Sentiment")
        : "Sentiment analysis service unavailable";

    // Format Bull Market Peak indicators into compact format
    const bullPeakTitles = this.generateBullPeakTitles(
      this.dataAggregator?.latestData?.BULL_PEAK
    );

    // Format historical analyses for context
    const historicalContext = this.formatHistoricalAnalyses(
      aggregatedData.historical_analyses
    );

    return {
      timestamp: aggregatedData.timestamp,
      btc_eth_analysis: btcEthAnalysis,
      macro_indicators_analysis: macroAnalysis,
      news_analysis: newsAnalysis,
      sentiment_analysis: sentimentAnalysis,
      bull_market_peak_indicators: bullPeakTitles,
      historical_analyses: historicalContext,
    };
  }

  /**
   * Format service data for AI prompt
   *
   * Cleans and formats service data for inclusion in AI analysis prompts.
   * Removes internal Firestore fields and optimizes data structure for AI consumption.
   *
   * @param {Object} data - Raw service data from Firestore
   * @param {string} serviceName - Name of the service for error messages
   * @returns {string} Formatted JSON string for AI prompt
   */
  formatServiceData(data, serviceName) {
    if (!data) return `No ${serviceName} analysis data available`;

    // Create clean copy of data, removing internal Firestore fields
    const cleanData = { ...data };
    delete cleanData.id;
    delete cleanData.createdAt;
    delete cleanData.timestamp;
    delete cleanData.service;

    // Special handling for BTC/ETH analysis service - keep only summaries
    if (serviceName === "BTC_ETH") {
      let bitcoinSummary = cleanData.bitcoin.summary;
      let ethereumSummary = cleanData.ethereum.summary;
      delete cleanData.bitcoin;
      delete cleanData.ethereum;
      cleanData.bitcoin = bitcoinSummary;
      cleanData.ethereum = ethereumSummary;
    }

    return JSON.stringify(cleanData, null, 2);
  }

  /**
   * Convert latest Bull Peak document into compact format
   *
   * Transforms Bull Market Peak indicator data into a compact format
   * suitable for AI analysis. Each indicator is formatted as "Name: true/false".
   *
   * @param {Object} latestBullPeakDoc - Latest Bull Market Peak document
   * @returns {string} Formatted indicator data or error message
   */
  generateBullPeakTitles(latestBullPeakDoc) {
    try {
      if (!latestBullPeakDoc || !Array.isArray(latestBullPeakDoc.indicators)) {
        return "No Bull Market Peak Indicators available";
      }

      // Format each indicator as "Name: true/false"
      const lines = latestBullPeakDoc.indicators.map((ind) => {
        const name = ind?.indicator_name || "Unknown Indicator";
        const hit = !!ind?.hit_status;
        return `${name}: ${hit}`;
      });

      return lines.join("\n");
    } catch (e) {
      return "No Bull Market Peak Indicators available";
    }
  }

  /**
   * Format historical analyses for prompt context
   *
   * Formats historical Black Swan analyses to provide context for current analysis.
   * Removes verbose fields and focuses on key metrics to keep the prompt manageable.
   *
   * @param {Array} historicalAnalyses - Array of historical analysis documents
   * @returns {string} Formatted historical context for AI prompt
   */
  formatHistoricalAnalyses(historicalAnalyses) {
    if (!historicalAnalyses || historicalAnalyses.length === 0) {
      return "No historical Black Swan analyses available for context";
    }

    // Format each historical analysis for context
    const formattedAnalyses = historicalAnalyses.map((analysis, index) => {
      // Extract only essential fields to keep context focused
      const cleanAnalysis = {
        timestamp: analysis.timestamp,
        blackswan_score: analysis.blackswan_score,
        risk_level: analysis.risk_level,
        certainty: analysis.certainty,
        primary_risk_factors: analysis.primary_risk_factors,
        cascade_probability: analysis.cascade_probability,
        time_horizon: analysis.time_horizon,
        cross_domain_signals: analysis.cross_domain_signals,
      };

      return `### Analysis ${index + 1} (${
        analysis.timestamp
      })\n${JSON.stringify(cleanAnalysis, null, 2)}`;
    });

    return formattedAnalyses.join("\n\n");
  }

  /**
   * Generate AI analysis using OpenRouter
   *
   * Sends formatted data to OpenRouter API for AI-powered Black Swan analysis.
   * Uses a carefully crafted prompt to ensure consistent and reliable results.
   *
   * @param {Object} analysisData - Formatted data for AI analysis
   * @returns {string} Raw AI response from OpenRouter
   * @throws {Error} If API key is missing or request fails
   */
  async generateAIAnalysis(analysisData) {
    if (!CONFIG.OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not configured");
    }

    // Get filled prompt from prompt manager
    const prompt = this.promptManager.getFilledPrompt(analysisData);

    console.log("🤖 [AI] Sending analysis request to OpenRouter");

    try {
      // Send request to OpenRouter API
      const response = await axios.post(
        CONFIG.OPENROUTER_URL,
        {
          model: CONFIG.MODEL, // AI model to use
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3, // Low temperature for consistent analysis
          max_tokens: 50000, // Maximum tokens for response
        },
        {
          headers: {
            Authorization: `Bearer ${CONFIG.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: CONFIG.REQUEST_TIMEOUT, // Request timeout
        }
      );

      // Extract AI response from API response
      const aiResponse = response.data?.choices?.[0]?.message?.content;
      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      console.log("✅ [AI] Analysis received from OpenRouter");
      return aiResponse;
    } catch (error) {
      console.error("❌ [AI] OpenRouter request failed:", error.message);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Process and validate AI analysis results
   *
   * Parses, validates, and enriches AI response with metadata.
   * Ensures all required fields are present and within valid ranges.
   *
   * @param {string} aiResponse - Raw AI response from OpenRouter
   * @param {Object} aggregatedData - Original aggregated data for metadata
   * @returns {Object} Processed and validated analysis result
   * @throws {Error} If response is invalid or missing required fields
   */
  async processAnalysisResults(aiResponse, aggregatedData) {
    try {
      // Extract JSON from response with robust fallbacks
      const parseFromText = (text) => {
        if (!text || typeof text !== "string") {
          throw new Error("Empty AI response");
        }

        // 1) Try to extract from fenced code block (```json ... ```)
        const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
        if (fenced && fenced[1]) {
          return JSON.parse(fenced[1]);
        }

        // 2) Try parsing as plain JSON
        try {
          return JSON.parse(text);
        } catch (_) {}

        // 3) Extract first {...} block from text
        const first = text.indexOf("{");
        const last = text.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
          const slice = text.slice(first, last + 1);
          return JSON.parse(slice);
        }

        throw new Error("No JSON found in AI response");
      };

      const analysisResult = parseFromText(aiResponse);

      // Validate required fields are present
      const requiredFields = [
        "blackswan_score",
        "analysis",
        "certainty",
        "primary_risk_factors",
        "current_market_indicators",
        "reasoning",
      ];
      for (const field of requiredFields) {
        if (!(field in analysisResult)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate score ranges
      if (
        analysisResult.blackswan_score < 0 ||
        analysisResult.blackswan_score > 100
      ) {
        throw new Error("blackswan_score must be between 0 and 100");
      }

      if (analysisResult.certainty < 1 || analysisResult.certainty > 100) {
        throw new Error("certainty must be between 1 and 100");
      }

      // Add metadata and timestamp
      const processedResult = {
        ...analysisResult,
        timestamp: new Date().toISOString(),
        analysis_metadata: {
          model: CONFIG.MODEL,
          data_sources: Object.keys(aggregatedData.services),
          successful_services: aggregatedData.data_quality.successful_services,
          total_services: aggregatedData.data_quality.total_services,
          collection_duration_ms: aggregatedData.collection_duration_ms,
        },
      };

      // Log key analysis metrics
      console.log(
        `🦢 [ANALYSIS] Black Swan Score: ${analysisResult.blackswan_score}/100`
      );
      console.log(`🎯 [ANALYSIS] Certainty: ${analysisResult.certainty}%`);
      console.log(
        `⚠️ [ANALYSIS] Primary Risk Factors: ${
          analysisResult.primary_risk_factors?.length || 0
        } identified`
      );

      return processedResult;
    } catch (error) {
      console.error(
        "❌ [PROCESSING] Failed to process AI response:",
        error.message
      );
      console.error("Raw AI Response:", aiResponse);
      throw new Error(`Analysis processing failed: ${error.message}`);
    }
  }

  /**
   * Store analysis results in Firestore
   *
   * Persists the completed Black Swan analysis to Firestore for historical
   * tracking and future reference. Adds metadata about the service and version.
   *
   * @param {Object} analysis - Completed analysis result to store
   * @returns {Object} Storage result with success status and document ID
   */
  async storeAnalysis(analysis) {
    if (!db) {
      console.warn("⚠️ [STORAGE] Firestore not available, skipping storage");
      return { stored: false, reason: "firestore_not_available" };
    }

    try {
      // Add analysis to Firestore collection with metadata
      const docRef = await db.collection(CONFIG.BLACKSWAN_COLLECTION).add({
        ...analysis,
        createdAt: admin.firestore.Timestamp.now(), // Firestore timestamp
        service: "macro-blackswan-analysis-service", // Service identifier
        serviceVersion: "1.0.0", // Service version
      });

      console.log(
        `✅ [STORAGE] Black Swan analysis stored with ID: ${docRef.id}`
      );
      return { stored: true, documentId: docRef.id };
    } catch (error) {
      console.error("❌ [STORAGE] Error storing analysis:", error.message);
      return { stored: false, error: error.message };
    }
  }

  /**
   * Get recent Black Swan analyses
   *
   * Retrieves the most recent Black Swan analyses from Firestore for
   * API endpoints and historical data access.
   *
   * @param {number} limit - Maximum number of analyses to retrieve (default: 10)
   * @returns {Object} Object containing analyses array and any errors
   */
  async getRecentAnalyses(limit = 10) {
    if (!db) {
      return { analyses: [], error: "Firestore not available" };
    }

    try {
      // Query Firestore for recent analyses
      const snapshot = await db
        .collection(CONFIG.BLACKSWAN_COLLECTION)
        .orderBy("timestamp", "desc") // Order by timestamp descending
        .limit(limit) // Limit number of results
        .get();

      // Process snapshot documents
      const analyses = [];
      snapshot.forEach((doc) => {
        analyses.push({
          id: doc.id, // Document ID
          ...doc.data(), // Document data
        });
      });

      return { analyses };
    } catch (error) {
      console.error("❌ [STORAGE] Error fetching analyses:", error.message);
      return { analyses: [], error: error.message };
    }
  }
}

/**
 * Service Initialization
 *
 * Initialize the main Black Swan analysis service instance.
 * This service coordinates all analysis operations and data aggregation.
 */
const blackSwanService = new BlackSwanAnalysisService();

/**
 * API Routes
 *
 * RESTful API endpoints for interacting with the Black Swan analysis service.
 * Includes health checks, manual triggers, and data retrieval endpoints.
 */

/**
 * Health Check Endpoint
 *
 * Provides service health status and configuration information.
 * Useful for monitoring and service discovery.
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "macro-blackswan-analysis-service",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    firestore: !!db, // Firestore availability status
    openrouter: !!CONFIG.OPENROUTER_API_KEY, // OpenRouter API key status
  });
});

/**
 * Manual Analysis Trigger Endpoint
 *
 * Allows manual triggering of Black Swan analysis via API call.
 * Useful for testing, debugging, or on-demand analysis requests.
 */
app.post("/api/analysis/trigger", async (req, res) => {
  try {
    console.log("🔄 [API] Black Swan analysis triggered via API");

    // Perform Black Swan analysis
    const result = await blackSwanService.performBlackSwanAnalysis();

    res.json({
      success: true,
      triggered: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error("❌ [API] Trigger analysis failed:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get Latest Analysis Endpoint
 *
 * Retrieves the most recent Black Swan analysis from Firestore.
 * Returns null if no analyses are available.
 */
app.get("/api/analysis/latest", async (req, res) => {
  try {
    // Get the most recent analysis
    const { analyses } = await blackSwanService.getRecentAnalyses(1);

    if (analyses.length === 0) {
      return res.json({
        latest: null,
        message: "No analyses available",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      latest: analyses[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [API] Get latest analysis failed:", error.message);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get Recent Analyses Endpoint
 *
 * Retrieves multiple recent Black Swan analyses from Firestore.
 * Supports a limit query parameter (max 50, default 10).
 */
app.get("/api/analysis/recent", async (req, res) => {
  try {
    // Parse and validate limit parameter
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    // Get recent analyses
    const { analyses, error } = await blackSwanService.getRecentAnalyses(limit);

    if (error) {
      return res.status(500).json({ error });
    }

    res.json({
      analyses,
      count: analyses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [API] Get recent analyses failed:", error.message);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Service Status Endpoint
 *
 * Provides detailed service status, configuration, and runtime information.
 * Useful for monitoring and debugging service operations.
 */
app.get("/api/status", (req, res) => {
  res.json({
    service: "macro-blackswan-analysis-service",
    version: "1.0.0",
    status: "running",
    configuration: {
      analysisInterval: CONFIG.ANALYSIS_INTERVAL, // Cron schedule
      model: CONFIG.MODEL, // AI model used
      collection: CONFIG.BLACKSWAN_COLLECTION, // Firestore collection
      services: Object.keys(CONFIG.COLLECTIONS), // Available data sources
    },
    uptime: process.uptime(), // Service uptime in seconds
  });
});

/**
 * Automated Analysis Scheduling
 *
 * Sets up a cron job to automatically trigger Black Swan analysis
 * at regular intervals. The schedule is configurable via CONFIG.ANALYSIS_INTERVAL.
 */
console.log(`⏰ [CRON] Scheduling Black Swan analysis every hour`);
cron.schedule(CONFIG.ANALYSIS_INTERVAL, async () => {
  console.log("⏰ [CRON] Triggered scheduled Black Swan analysis");
  try {
    // Perform automated analysis
    await blackSwanService.performBlackSwanAnalysis();
  } catch (error) {
    console.error("❌ [CRON] Scheduled analysis failed:", error);
  }
});

/**
 * Server Startup
 *
 * Starts the Express.js server and displays configuration information.
 * The server listens on the configured port and provides API endpoints.
 */
const server = app.listen(CONFIG.PORT, () => {
  console.log("🦢 [SERVER] Macro Black Swan Analysis Service started");
  console.log(`📍 [SERVER] Running on port ${CONFIG.PORT}`);
  console.log(`⏰ [CONFIG] Analysis every hour`);
  console.log(
    `🔧 [CONFIG] Monitoring ${
      Object.keys(CONFIG.COLLECTIONS).length
    } Firestore collections`
  );
  console.log(
    `📊 [CONFIG] Firestore integration: ${db ? "enabled" : "disabled"}`
  );
  if (db) {
    console.log(
      `📡 [CONFIG] Collections: ${Object.values(CONFIG.COLLECTIONS).join(", ")}`
    );
  }
});

/**
 * Graceful Shutdown Handling
 *
 * Implements graceful shutdown procedures to ensure proper cleanup
 * of resources when the service is terminated. This includes:
 * - Cleaning up Firestore listeners
 * - Closing the HTTP server
 * - Exiting the process cleanly
 */

// Handle SIGINT (Ctrl+C) signal
process.on("SIGINT", () => {
  console.log("🛑 [SERVER] Received SIGINT, shutting down gracefully");

  // Clean up Firestore listeners
  blackSwanService.dataAggregator.cleanup();

  // Close HTTP server
  server.close(() => {
    console.log("✅ [SERVER] Server closed");
    process.exit(0);
  });
});

// Handle SIGTERM signal (used by process managers)
process.on("SIGTERM", () => {
  console.log("🛑 [SERVER] Received SIGTERM, shutting down gracefully");

  // Clean up Firestore listeners
  blackSwanService.dataAggregator.cleanup();

  // Close HTTP server
  server.close(() => {
    console.log("✅ [SERVER] Server closed");
    process.exit(0);
  });
});

/**
 * Module Exports
 *
 * Exports the main service instance and Express app for testing
 * and external integration purposes.
 */
module.exports = { blackSwanService, app };
