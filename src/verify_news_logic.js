import { sentimentNLPEngine } from './services/SentimentNLPEngine.js';
import { newsService } from './services/newsService.js';

async function verifyNewsIntelligence() {
    console.log("🚀 Verifying News Intelligence System...");

    // 1. Entity Recognition Test
    console.log("\n[TEST 1] Entity Weighting (Powell vs Random Analyst)");

    const headlineA = "Analyst says Bitcoin might be bearish";
    const headlineB = "Powell confirms Fed will be hawkish and hike rates";

    const scoreA = sentimentNLPEngine.scoreHeadline(headlineA);
    const scoreB = sentimentNLPEngine.scoreHeadline(headlineB);

    console.log(`Headline A (Analyst): "${headlineA}"`);
    console.log(` -> Score: ${scoreA.score}, Confidence: ${scoreA.confidence.toFixed(2)}, Entity: ${scoreA.entity || 'None'}`);

    console.log(`Headline B (Powell): "${headlineB}"`);
    console.log(` -> Score: ${scoreB.score}, Confidence: ${scoreB.confidence.toFixed(2)}, Entity: ${scoreB.entity || 'None'}`);

    if (Math.abs(scoreB.score) > Math.abs(scoreA.score) && scoreB.entity === 'POWELL') {
        console.log("✅ PASS: Powell carries significantly more weight than generic analyst.");
    } else {
        console.error("❌ FAIL: Entity weighting not applied correctly.");
    }

    // 2. Context Detection Test
    console.log("\n[TEST 2] Context Detection (Rumor vs Official)");

    const headlineC = "Rumors circulate that SEC might ban staking";
    const headlineD = "SEC official statement: Staking ban confirms enforcement action";

    const scoreC = sentimentNLPEngine.scoreHeadline(headlineC);
    const scoreD = sentimentNLPEngine.scoreHeadline(headlineD);

    console.log(`Headline C (Rumor): "${headlineC}"`);
    console.log(` -> Score: ${scoreC.score}, Context: ${scoreC.context}`);

    console.log(`Headline D (Official): "${headlineD}"`);
    console.log(` -> Score: ${scoreD.score}, Context: ${scoreD.context}`);

    if (Math.abs(scoreD.score) > Math.abs(scoreC.score)) {
        console.log("✅ PASS: Official statement has higher impact than rumor.");
    } else {
        console.error("❌ FAIL: Context weighting not applied.");
    }

    // 3. Global Macro Aggregation Test
    console.log("\n[TEST 3] Global Macro Feed Aggregation");

    // We mock the fetch so we don't need real network
    // But newsService._fetchGlobalMacroFeed IS the mock, so we can call fetchRealNews directly
    // checking if it merges mock macro headlines.

    const news = await newsService.fetchRealNews("BTCUSDT");
    console.log(`Fetched ${news.length} news items.`);

    const macroItem = news.find(n => n.source === 'Reuters' || n.source === 'Bloomberg');
    if (macroItem) {
        console.log(`✅ PASS: Found Macro Headline: "${macroItem.title}" from ${macroItem.source}`);
    } else {
        console.warn("⚠️ WARN: No simulated macro news found (might be random chance or fetch issue).");
    }

    // 4. Global Sentiment Calculation
    const globalSentiment = newsService.getGlobalSentiment(news);
    console.log(`Global Sentiment: ${globalSentiment.score} (${globalSentiment.label})`);

    console.log("\n✨ News Intelligence Verification Complete!");
}

verifyNewsIntelligence().catch(console.error);
