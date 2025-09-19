# Macro Black Swan Analysis Service

**Author:** Muhammad Bilal Motiwala  
**Project:** Black Swan  
**Version:** 1.0.0  
**License:** MIT

## Overview

The Macro Black Swan Analysis Service is an AI-powered risk assessment system that performs comprehensive Black Swan event analysis by aggregating data from multiple macro analysis services. It uses advanced AI models to assess systemic risk and probability of rare, high-impact events in cryptocurrency and financial markets.

## Key Features

- **Real-time Data Aggregation**: Monitors multiple Firestore collections for latest analysis data
- **AI-Powered Analysis**: Uses OpenRouter API with GPT models for sophisticated risk assessment
- **Automated Scheduling**: Runs analysis automatically every hour via cron jobs
- **RESTful API**: Provides endpoints for manual triggers and data retrieval
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Graceful Shutdown**: Proper cleanup of resources on service termination
- **Rate Limiting**: Built-in protection against API abuse
- **Security**: Helmet.js security headers and CORS protection

## Architecture

### Core Components

1. **FirestoreDataAggregationService**: Manages real-time data collection from multiple sources
2. **BlackSwanAnalysisService**: Core AI analysis engine that processes data and generates insights
3. **PromptManager**: Handles AI prompt templates and data formatting
4. **Express.js Server**: Provides RESTful API endpoints and middleware

### Data Sources

The service aggregates data from the following Firestore collections:

- **crypto_analyses**: Bitcoin/Ethereum analysis data
- **macro_indicators_analysis**: Macro economic indicators
- **news_analysis**: News impact analysis
- **sentiment_analysis**: Market sentiment data
- **bull-market-peak-indicators**: Bull market peak indicators

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Firebase project with Firestore enabled
- OpenRouter API account

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd macro-blackswan-analysis-service
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up Firebase credentials**

   - Download your Firebase service account key
   - Place it as `serviceAccountKey.json` in the project root
   - Ensure the service account has Firestore read/write permissions

5. **Start the service**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Server Configuration
PORT=8090

# Optional: Custom analysis interval (cron expression)
# ANALYSIS_INTERVAL=0 * * * *
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Create a service account and download the key file
4. Place the key file as `serviceAccountKey.json` in the project root

### OpenRouter Setup

1. Sign up at [OpenRouter](https://openrouter.ai)
2. Get your API key from the dashboard
3. Add it to your `.env` file

## API Documentation

### Base URL

```
http://localhost:8090
```

### Endpoints

#### Health Check

```http
GET /health
```

Returns service health status and configuration information.

**Response:**

```json
{
  "status": "healthy",
  "service": "macro-blackswan-analysis-service",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "firestore": true,
  "openrouter": true
}
```

#### Trigger Analysis

```http
POST /api/analysis/trigger
```

Manually triggers a Black Swan analysis.

**Response:**

```json
{
  "success": true,
  "triggered": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "result": {
    "success": true,
    "analysis": {
      "blackswan_score": 25,
      "analysis": "Current market conditions show...",
      "certainty": 85,
      "primary_risk_factors": ["factor1", "factor2"],
      "current_market_indicators": ["indicator1", "indicator2"],
      "reasoning": "Analysis based on...",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "storage": {
      "stored": true,
      "documentId": "abc123"
    },
    "data_quality": {
      "total_services": 5,
      "successful_services": 4,
      "failed_services": 1
    }
  }
}
```

#### Get Latest Analysis

```http
GET /api/analysis/latest
```

Retrieves the most recent Black Swan analysis.

**Response:**

```json
{
  "latest": {
    "id": "abc123",
    "blackswan_score": 25,
    "analysis": "Current market conditions show...",
    "certainty": 85,
    "primary_risk_factors": ["factor1", "factor2"],
    "current_market_indicators": ["indicator1", "indicator2"],
    "reasoning": "Analysis based on...",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Get Recent Analyses

```http
GET /api/analysis/recent?limit=10
```

Retrieves multiple recent analyses.

**Query Parameters:**

- `limit` (optional): Number of analyses to retrieve (max 50, default 10)

**Response:**

```json
{
  "analyses": [
    {
      "id": "abc123",
      "blackswan_score": 25,
      "analysis": "Current market conditions show...",
      "certainty": 85,
      "primary_risk_factors": ["factor1", "factor2"],
      "current_market_indicators": ["indicator1", "indicator2"],
      "reasoning": "Analysis based on...",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Service Status

```http
GET /api/status
```

Returns detailed service status and configuration.

**Response:**

```json
{
  "service": "macro-blackswan-analysis-service",
  "version": "1.0.0",
  "status": "running",
  "configuration": {
    "analysisInterval": "0 * * * *",
    "model": "openai/gpt-5-mini",
    "collection": "blackswan_analyses",
    "services": ["BTC_ETH", "MACRO", "NEWS", "SENTIMENT", "BULL_PEAK"]
  },
  "uptime": 3600
}
```

## Analysis Output

### Black Swan Score

The service generates a Black Swan score from 0-100:

- **0-3**: Normal ecosystem operations
- **4-5**: Elevated attention without infrastructure impact
- **6-12**: Single major component disruption contained
- **12-25**: Multiple component failures or spreading disruption
- **25-40**: Widespread ecosystem segment failures with confirmed contagion
- **40-60**: Core ecosystem infrastructure breakdown in progress
- **60-100**: Ecosystem collapse threatening broader financial stability

### Analysis Fields

- **blackswan_score**: Risk score (0-100)
- **analysis**: Narrative summary of current market conditions
- **certainty**: Confidence level in the analysis (1-100)
- **primary_risk_factors**: Array of identified risk factors
- **current_market_indicators**: Key market indicators
- **reasoning**: Explanation of how data sources influenced the score

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses nodemon for automatic restarts on file changes.

### Project Structure

```
macro-blackswan-analysis-service/
├── index.js                 # Main service file
├── package.json            # Dependencies and scripts
├── .env.example           # Environment variables template
├── serviceAccountKey.json # Firebase service account key
├── prompts/               # AI prompt templates
│   ├── prompt-config.js   # Prompt management system
│   └── blackswan-analysis-v1.md # Analysis prompt template
└── README.md             # This file
```

### Adding New Data Sources

1. Add the collection name to `CONFIG.COLLECTIONS`
2. Update the `getTimestampField()` method if needed
3. Modify the `prepareAnalysisData()` method to include the new source
4. Update the prompt template if necessary

### Customizing Analysis Frequency

Modify the `ANALYSIS_INTERVAL` in the configuration:

```javascript
// Every 15 minutes
ANALYSIS_INTERVAL: "*/15 * * * *";

// Every hour (default)
ANALYSIS_INTERVAL: "0 * * * *";

// Every 6 hours
ANALYSIS_INTERVAL: "0 */6 * * *";
```

## Monitoring and Logging

### Log Levels

The service uses structured logging with emojis for easy identification:

- 🦢 **BLACKSWAN**: Main analysis operations
- 📡 **LISTENER**: Firestore listener events
- 🤖 **AI**: OpenRouter API interactions
- 📊 **AGGREGATION**: Data aggregation operations
- ✅ **SUCCESS**: Successful operations
- ❌ **ERROR**: Error conditions
- ⚠️ **WARNING**: Warning conditions

### Health Monitoring

Use the `/health` endpoint for basic health checks:

```bash
curl http://localhost:8090/health
```

### Performance Monitoring

Monitor the following metrics:

- Analysis completion rate
- Data source availability
- API response times
- Error rates
- Memory usage

## Troubleshooting

### Common Issues

1. **Firestore Connection Failed**

   - Check `serviceAccountKey.json` file exists and is valid
   - Verify Firebase project has Firestore enabled
   - Ensure service account has proper permissions

2. **OpenRouter API Errors**

   - Verify `OPENROUTER_API_KEY` is set correctly
   - Check API key has sufficient credits
   - Ensure model name is correct

3. **No Data Available**

   - Check if source services are running
   - Verify Firestore collections exist and have data
   - Check listener initialization logs

4. **Analysis Failures**
   - Review AI response parsing logs
   - Check prompt template validity
   - Verify data format compatibility

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
```

### Log Analysis

Key log patterns to monitor:

- `✅ [LISTENER] Updated` - Data sources working
- `❌ [LISTENER] Error` - Data source issues
- `🦢 [ANALYSIS] Black Swan Score` - Analysis results
- `❌ [AI] OpenRouter request failed` - API issues

## Security Considerations

- **API Keys**: Store securely in environment variables
- **Firebase**: Use service accounts with minimal required permissions
- **Rate Limiting**: Built-in protection against abuse
- **CORS**: Configured for cross-origin requests
- **Helmet**: Security headers enabled

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- Create an issue in the repository
- Contact: Muhammad Bilal Motiwala
- Project: Black Swan

## Changelog

### Version 1.0.0

- Initial release
- Core Black Swan analysis functionality
- Firestore integration
- OpenRouter AI integration
- RESTful API endpoints
- Automated scheduling
- Comprehensive logging and monitoring
