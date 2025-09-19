# Real-Time Black Swan Event Analysis

## Analysis Overview

- **Timestamp**: {{timestamp}}
- **Analysis Type**: Multi-Source Real-Time Black Swan State Assessment
- **Data Sources**: BTC/ETH Analysis, Macro Indicators, News Analysis, Sentiment Analysis, Bull Market Peak Indicators

## Input Data Summary

### BTC/ETH Anomaly Analysis Document

```json
{{btc_eth_analysis}}
```

### Macro Economic Indicators Document

```json
{{macro_indicators_analysis}}
```

### News Impact Analysis Document

```json
{{news_analysis}}
```

### Market Sentiment Analysis Document

```json
{{sentiment_analysis}}
```

### Bull Market Peak Indicators

These indicators signal when the bull market may have reached its peak. A higher number of positive triggers suggests that the market may already be at or near its top, often preceding a bear market phase.

```
{{bull_market_peak_indicators}}
```

### Historical Black Swan Analyses (Last 5 Outputs)

**Strict Usage Limitation:** Use ONLY to identify if today represents a material change from recent conditions. Historical data provides NO baseline for scoring and carries NO forward influence.

**Mandatory Historical Reset Rule:** If current conditions are similar to previous analyses without new factual evidence of escalation, the score MAY be reduced or MATCHED against previous scores to prevent artificial inflation.

```
{{historical_analyses}}
```

## Black Swan Analysis Requirements

**Objective**: Assess whether crypto markets currently exhibit system-threatening disruption characteristics. Maintain analytical rigor while avoiding template responses.

**Key Risk Domains** (evaluate independently):

- **Market Structure**: Liquidity disruptions, trading halts, extreme price dislocations, settlement failures
- **Regulatory Environment**: Sudden enforcement actions, new restrictions with immediate market impact, policy reversals
- **Macroeconomic Spillover**: Traditional market distress affecting crypto, funding market seizures, banking sector stress
- **Infrastructure Failures**: Exchange downtimes, blockchain network issues, major protocol exploits, custody failures
- **Behavioral Extremes**: Data-verified panic selling or euphoric buying, mass liquidations, flight-to-quality moves
- **Cross-System Contagion**: Stress propagating between crypto sectors, institutions, or into traditional finance

## Response Format

Output strictly in this **exact JSON format** with no additional text:

```json
{
  "blackswan_score": [0-100 integer; conservative baseline 1-5 for normal conditions],
  "analysis": "Adaptive narrative summarizing the current market reality within 5 sentences at max. Use specific, varied language that reflects actual present circumstances rather than generic market stress descriptions. Avoid repetitive phrases from previous analyses. Write as if explaining the current situation to someone unfamiliar with recent market behavior.",
  "certainty": [1-100 integer aligned with evidence strength],
  "primary_risk_factors": ["3-5 most significant current factors (if any)"],
  "current_market_indicators": ["2-3 key present indicators"],
  "reasoning": "Explain how each source affected the score. Highlight confirmations vs. contradictions. Note any reductions due to weak/stale evidence."
}
```

## Scoring Framework

**Terminology Definitions:**

- **Isolated Incident**: Single-point disruption affecting one crypto ecosystem component without broader impact - includes individual exchange hacks/outages, single protocol exploits, isolated regulatory enforcement actions, major asset network temporary issues, individual institutional custody failures, or localized market disruptions affecting specific tokens/platforms without ecosystem-wide consequences

- **Structural Issue**: Breakdown affecting major crypto ecosystem foundations that underpin market confidence and operations - includes coordinated regulatory policy reversals across major jurisdictions, systematic exploitation of widely-used protocols, failure of dominant market infrastructure (major exchanges, primary custody providers, core blockchain networks), institutional panic leading to mass crypto abandonment, or infrastructure vulnerabilities exposing fundamental ecosystem weaknesses

- **Early Warning Signals**: Observable indicators suggesting crypto ecosystem stability is under imminent threat - includes regulatory authorities preparing coordinated enforcement actions, major institutions publicly questioning crypto viability, critical infrastructure showing strain patterns, systematic market confidence erosion evidenced by institutional withdrawals, mainstream media campaigns against crypto legitimacy, or policy discussions targeting crypto's foundational elements

- **System-Level Disruption**: Failures across multiple major crypto ecosystem segments creating existential threats to crypto market viability - includes coordinated global regulatory crackdowns affecting multiple major jurisdictions simultaneously, widespread infrastructure failures across different ecosystem components, institutional contagion causing mass crypto liquidations, market confidence collapse evidenced by sustained institutional exodus, or multiple critical protocol/exchange failures creating cascade effects

- **Systemic Failure**: Crypto ecosystem breakdown severe enough to threaten broader financial system stability - includes complete regulatory shutdown across major economies, institutional crisis spreading losses to traditional finance, crypto market collapse causing significant economic disruption, systematic failure of crypto-exposed financial institutions, or crypto ecosystem breakdown creating broader economic instability

**Score Ranges**

- **0–3**: _Normal ecosystem operations_ - Standard market volatility, routine participant behavior, typical trading activity across major platforms and assets. No evidence requirements as this represents baseline conditions.

- **4–5**: _Elevated attention without infrastructure impact_ - Larger price movements, increased market activity, heightened sentiment, but all major infrastructure remains fully operational and market confidence intact. Requires evidence that all major exchanges, protocols, and networks are functioning normally despite elevated activity.

- **6–12**: _Single major component disruption contained_ - Must provide specific evidence of one major ecosystem component experiencing operational failure (name the specific exchange experiencing outage >4 hours, identify the specific major protocol exploit >$100M, document the specific regulatory enforcement action against major platform, identify the specific major asset network halt/major issues). Requires evidence that failure has not spread to other ecosystem components and overall market confidence remains stable.

- **12–25**: _Multiple component failures or spreading disruption_ - Must provide specific evidence of either (A) multiple named major component failures occurring within close timeframe, OR (B) detailed evidence showing how one critical failure is actively spreading to other ecosystem components and measurably threatening overall market confidence. Requires documentation of specific contagion pathways and market confidence indicators.

- **25–40**: _Widespread ecosystem segment failures with confirmed contagion_ - Must provide specific evidence of operational failures across different named ecosystem segments (exchanges AND protocols AND custody providers AND regulatory environment) with documented examples of active contagion between segments and measurable threats to crypto market credibility. Requires evidence from multiple independent sources confirming ecosystem-wide confidence erosion.

- **40–60**: _Core ecosystem infrastructure breakdown in progress_ - Must provide specific evidence of systematic breakdown across multiple critical infrastructure components with documented threats to crypto ecosystem viability. Requires evidence of major institutional withdrawals, regulatory coordination across jurisdictions, widespread infrastructure failures, and measurable impact on crypto's fundamental operating capacity.

- **60–100**: _Ecosystem collapse threatening broader financial stability_ - Must provide specific evidence of crypto ecosystem breakdown creating documented threats to traditional financial institutions or broader economic stability. Requires evidence of major institutional losses due to crypto exposure, regulatory emergency measures affecting financial system, or crypto crisis causing measurable economic disruption beyond crypto markets.

## Analysis Guidelines

**Language and Style Requirements for "Analysis" Field:**

- **Vary your vocabulary**: Never repeat the same descriptive phrases from previous analyses
- **Be specific to current conditions**: What makes today's situation unique? What are the actual numbers, events, or behaviors happening now?
- **Use natural language**: Write as you would explain the situation to a colleague, not as a compliance checklist
- **Focus on what IS happening**: Lead with observable facts before discussing what isn't occurring
- **Contextualize significance**: Why do the current conditions matter? What's the practical impact?
- **Avoid template phrases**: Don't use formulaic language like "acute intraday volatility" or "concentrated whale flows" unless those exact terms are specifically relevant to today's unique situation

**Analytical Approach:**

- **Score Evidence First**: Before assigning any score above 5, identify specific ecosystem component failures with names and factual evidence
- **Historical Reset Enforcement**: If conditions mirror previous analyses without new escalation, reduce score below previous levels
- **Infrastructure vs. Activity Distinction**: Separate actual infra / exploits / critical failures from normal market activity (volatility, liquidations, large transactions)
- Synthesize across all data sources for complete picture
- Distinguish between verified data and market interpretation
- Weight recent, high-quality evidence over aged or single-source signals
- Present-moment assessment: What's happening right now, not forward-looking speculation
- **Evidence-Based Scoring**: Require specific, named infra / exploits / critical failures for elevated scores

**Final Check**: Does your analysis read like a fresh assessment of today's specific conditions, or does it sound like previous analyses? Rewrite if it feels templated or repetitive.

## Output Goal

Deliver a precise, evidence-based assessment of current Black Swan risk while ensuring each analysis reflects the unique characteristics of the present market state through varied, adaptive language.
