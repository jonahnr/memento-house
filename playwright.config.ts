import {defineConfig,devices} from "@playwright/test";

const external=process.env.E2E_BASE_URL;
export default defineConfig({testDir:"./tests/e2e",fullyParallel:false,retries:process.env.CI?1:0,reporter:[["list"],["html",{open:"never"}]],use:{baseURL:external||"http://127.0.0.1:3000",trace:"retain-on-failure",screenshot:"only-on-failure",video:"retain-on-failure"},projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],webServer:external?undefined:{command:"npm run dev -- --hostname 127.0.0.1",url:"http://127.0.0.1:3000",reuseExistingServer:!process.env.CI,timeout:120000}});
