import { test, expect, type Page, type Route } from '@playwright/test';

// Mocks to bypass backend and render full UI
const healthMock = {
  message: 'ok',
  production: 'Local' as const,
  gtag: '',
  deployments: {
    WEAVIATE_URL_VERBA: 'http://localhost',
    WEAVIATE_API_KEY_VERBA: 'test-key',
  },
  default_deployment: 'Local' as const,
};

const connectMock = {
  connected: true,
  error: '',
  rag_config: {},
};

const documentsMock = {
  error: '',
  labels: ['docs', 'reports'],
  totalDocuments: 2,
  documents: [
    { title: 'Project Plan', uuid: 'doc-1', labels: ['docs'] },
    { title: 'Release Notes', uuid: 'doc-2', labels: ['reports'] },
  ],
};

const ghStarsMock = { stargazers_count: 4200 };

// Helper to set up network interceptions
async function setupRoutes(page: Page) {
  await page.route('**/api/health', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(healthMock),
    });
  });
  await page.route('**/api/connect', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(connectMock),
    });
  });
  await page.route('**/api/get_all_documents', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(documentsMock),
    });
  });
  await page.route(
    'https://api.github.com/repos/weaviate/verba',
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ghStarsMock),
      });
    }
  );
}

// E2E visual test
test('Documents view renders and matches screenshot', async ({ page }) => {
  await setupRoutes(page);

  await page.goto('/');

  // Wait for app to complete fade-in after login
  await page.locator('.verba-layout.opacity-100').waitFor({ state: 'visible' });

  // Now Navbar should be visible
  await page
    .getByRole('button', { name: 'Documents' })
    .waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Documents' }).click();

  // Wait for documents to load in the list
  await page
    .locator('.verba-document-list .verba-document-item')
    .first()
    .waitFor({ state: 'visible' });

  // Stabilize UI before screenshot
  await page.waitForTimeout(250);

  // Capture screenshot (baseline created on first run)
  await expect(page).toHaveScreenshot('documents-view.png', { fullPage: true });
});
