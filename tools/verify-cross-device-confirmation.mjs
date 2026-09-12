import {chromium,expect} from "@playwright/test";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});let statusChecks=0,passwordLogins=0;
 await page.route("**/api/auth/signup",route=>route.fulfill({status:200,json:{ok:true,confirmationToken:"signed-watch-token"}}));
 await page.route("**/api/auth/confirmation-status",route=>{statusChecks++;return route.fulfill({status:200,json:{confirmed:statusChecks>=2}})});
 await page.route("**/*.supabase.co/auth/v1/token?grant_type=password",route=>{passwordLogins++;return route.fulfill({status:200,json:{access_token:"confirmed-token",token_type:"bearer",expires_in:3600,refresh_token:"confirmed-refresh",user:{id:"confirmed-user",email:"new-customer@example.com",user_metadata:{memento_email_confirmation_required:false,memento_email_confirmed_at:new Date().toISOString()}}}})});
 await page.route("**/account",route=>route.fulfill({status:200,contentType:"text/html",body:"<title>Customer portal</title><h1>Portal opened</h1>"}));
 await page.goto("http://127.0.0.1:3000/signup");
 await page.getByLabel("Email").fill("new-customer@example.com");
 await page.getByLabel("Password").fill("a-secure-password");
 await page.getByRole("button",{name:"Create my account →"}).click();
 await expect(page.getByRole("heading",{name:"Check your email."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Portal opened"})).toBeVisible({timeout:10_000});
 assert.equal(new URL(page.url()).pathname,"/account");assert.equal(passwordLogins,1);assert.ok(statusChecks>=2);
 console.log(JSON.stringify({passed:true,statusChecks,passwordLogins,finalPath:new URL(page.url()).pathname}));
}finally{await browser.close()}
