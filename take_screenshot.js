const puppeteer = require("puppeteer");
const fs = require("fs");

async function takeScreenshots() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Set viewport to standard desktop size
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Take screenshot of backend-served app (main interface)
    console.log("Taking screenshot of main interface...");
    await page.goto("http://localhost:8000", { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for any animations
    
    // Try to click on "Weaviate" option to proceed to main interface
    try {
      const weaviateButtons = await page.$$('button');
      for (let button of weaviateButtons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.includes('Weaviate')) {
          await button.click();
          await new Promise((resolve) => setTimeout(resolve, 3000));
          console.log("Clicked Weaviate option, waiting for main interface...");
          await page.screenshot({ path: "current_ui_after_weaviate.png", fullPage: true });
          break;
        }
      }
    } catch (e) {
      console.log("Could not click Weaviate option:", e.message);
    }
    
    await page.screenshot({ path: "current_ui_main.png", fullPage: true });

    // Try to navigate to different sections if they exist
    console.log("Looking for navigation elements...");

    // Check if there are navigation buttons/tabs
    const navButtons = await page.$$('button, [role="tab"], .nav, .navigation, [data-testid*="nav"]');
    console.log(`Found ${navButtons.length} navigation elements`);

    // If we find navigation, try to take screenshots of different views
    if (navButtons.length > 0) {
      for (let i = 0; i < Math.min(navButtons.length, 4); i++) {
        try {
          await navButtons[i].click();
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await page.screenshot({
            path: `current_ui_view_${i}.png`,
            fullPage: true,
          });
          console.log(`Screenshot ${i} taken`);
        } catch (e) {
          console.log(`Could not click nav element ${i}:`, e.message);
        }
      }
    }

    // Also try the frontend dev server
    console.log("Taking screenshot of frontend dev server...");
    await page.goto("http://localhost:2025", { waitUntil: "networkidle2" });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: "current_ui_frontend.png", fullPage: true });
  } catch (error) {
    console.error("Error taking screenshots:", error);
  } finally {
    await browser.close();
  }
}

takeScreenshots()
  .then(() => {
    console.log("Screenshots completed");
  })
  .catch(console.error);
