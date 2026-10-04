import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {loadTs} from './helpers/load-ts.mjs';
const {QUIZ_QUESTIONS,quizRecommendation,generateGuestbookIdeas}=await loadTs('lib/guestbook-tools.ts');
const {articles,landingPages,relatedArticles,headingId,IDEA_TOPICS}=await loadTs('lib/ideas-content.ts');
const {default:sitemap}=await loadTs('app/sitemap.ts');
test('all six quiz recommendations are reachable and invalid answers are rejected',()=>{
 const reached=new Set();function visit(answers){if(answers.length===6){reached.add(quizRecommendation(answers).kind);return}for(let i=0;i<QUIZ_QUESTIONS[answers.length].choices.length;i++)visit([...answers,i])}visit([]);
 assert.deepEqual([...reached].sort(),['map','media','plus','signature','timeline','traditional']);
 for(const answers of [[],[0,0,0,0,0],[-1,0,0,0,0,0],[0,0,0,0,0,999],[0.5,0,0,0,0,0]])assert.throws(()=>quizRecommendation(answers));
 assert.equal(quizRecommendation([0,3,1,1,2,2]).kind,'traditional');assert.equal(quizRecommendation([2,2,1,0,2,2]).kind,'signature');
});
test('generator honors every format/budget/goal combination, returns five distinct ideas, and limits product promotion',()=>{
 for(const size of ['small','medium','large'])for(const style of ['classic','travel','creative','relaxed'])for(const preference of ['physical','digital','either'])for(const goal of ['messages','signatures','photos','travel','story'])for(const budget of [50,100,150,1000])for(const participation of ['quick','thoughtful','multiple']){
  const ideas=generateGuestbookIdeas({size,style,preference,goal,budget,participation});assert.equal(ideas.length,5);assert.equal(new Set(ideas.map(i=>i.id)).size,5);assert.ok(ideas.filter(i=>i.map).length<=1);
  for(const idea of ideas){assert.ok(preference==='either'||idea.format===preference);assert.ok(budget===50?idea.minimumBudget<50:idea.minimumBudget<=budget);assert.ok(idea.fit&&idea.complexity&&idea.participation&&idea.after);if(idea.map)assert.ok(['travel','story','photos'].includes(goal))}
 }
});
test('published editorial content has unique routes, valid images, related articles, and consistent table/anchor structure',()=>{
 const published=articles(),landings=landingPages(),all=[...published,...landings];assert.ok(published.length>=5);assert.ok(landings.length>=10);assert.equal(new Set(all.map(a=>a.slug)).size,all.length);assert.equal(new Set(all.map(a=>a.seoTitle)).size,all.length);
 const articleSlugs=new Set(published.map(a=>a.slug));
 for(const content of all){assert.ok(content.updatedDate>=content.publishedDate);assert.ok(existsSync('public'+content.heroImage));assert.ok(content.heroImageAlt);assert.ok(IDEA_TOPICS.some(t=>t.slug===content.category));assert.equal(new Set(content.sections.map((s,i)=>headingId(s.heading,i))).size,content.sections.length);
  for(const related of content.relatedArticles)assert.ok(articleSlugs.has(related));for(const s of content.sections){if(s.image)assert.ok(existsSync('public'+s.image.src));if(s.table)for(const row of s.table.rows)assert.equal(row.length,s.table.headers.length)}
  const related=relatedArticles(content);assert.equal(related.length,3);assert.ok(related.every(a=>a.slug!==content.slug));
 }
});
test('public sitemap contains all new content and excludes private and guest experience routes',()=>{
 const urls=sitemap().map(entry=>new URL(entry.url).pathname);assert.equal(new Set(urls).size,urls.length);
 for(const a of articles())assert.ok(urls.includes('/ideas/'+a.slug));for(const a of landingPages())assert.ok(urls.includes('/'+a.slug));for(const t of IDEA_TOPICS)assert.ok(urls.includes('/ideas/'+t.slug));
 for(const url of urls)assert.doesNotMatch(url,/^\/(dashboard|account|admin|checkout|map|api|login|signup)(\/|$)/);
});
