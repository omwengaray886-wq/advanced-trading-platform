
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function runScript(scriptName) {
    console.log(`\n🔹 Running ${scriptName}...`);
    try {
        const { stdout, stderr } = await execPromise(`node ${scriptName}`);
        console.log(stdout);
        if (stderr) console.error(stderr);
        console.log(`✅ ${scriptName} PASSED`);
        return true;
    } catch (error) {
        console.error(`❌ ${scriptName} FAILED`);
        console.error(error.message);
        return false;
    }
}

async function verifyAll() {
    console.log("==========================================");
    console.log("   ADVANCED TRADING PLATFORM - SYSTEM AUDIT");
    console.log("==========================================");

    const scripts = [
        'verify_geopolitical_impact.js', // Phase 15
        'verify_supply_dynamics.js',    // Phase 16
        'verify_portfolio_risk.js',     // Phase 17
        'verify_liquidity_heatmap.js'   // Phase 18
    ];

    let passed = 0;

    for (const script of scripts) {
        const success = await runScript(script);
        if (success) passed++;
    }

    console.log("\n==========================================");
    console.log(`SUMMARY: ${passed}/${scripts.length} Modules Verified.`);

    if (passed === scripts.length) {
        console.log("🚀 SYSTEM READY: All recent integrations operational.");
    } else {
        console.log("⚠️ SYSTEM WARNING: Some verifications failed.");
        process.exit(1);
    }
}

verifyAll();
