import {chromium,expect} from "@playwright/test";
import assert from "node:assert/strict";

const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),requests=[];
 await page.route("**/api/auth/signup",async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  if(body.action==="resend")return route.fulfill({status:200,json:{ok:true}});
  return route.fulfill({status:502,json:{error:"Your account was created, but the confirmation email could not be delivered. Request a fresh confirmation email below."}});
 });
 await page.goto("http://127.0.0.1:3000/signup");
 await page.getByLabel("Email").fill("new-customer@example.com");
 await page.getByLabel("Password").fill("a-secure-password");
 await page.getByRole("button",{name:"Create my account →"}).click();
 await expect(page.getByText(/account was created, but the confirmation email could not be delivered/i)).toBeVisible();
 await page.getByRole("button",{name:"Resend confirmation email"}).click();
 await expect(page.getByText(/fresh confirmation link is on its way/i)).toBeVisible();
 assert.equal(requests.length,2);
 assert.equal(requests[0].action,undefined);
 assert.equal(requests[1].action,"resend");
 assert.equal(requests[1].password,undefined);
 console.log(JSON.stringify({passed:true,signupAction:"signup",resendAction:"resend"}));
}finally{await browser.close()}
