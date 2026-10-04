# How to Publish a New Memento House Article

Articles are JSON files in `content/ideas`; intent pages are JSON files in `content/landings`. They share the validated schema in `lib/ideas-content.ts` and editorial template in `app/marketing/components.tsx`. No database changes or dashboard publishing account are needed.

1. Copy an existing article JSON into `content/ideas/your-new-slug.json`. Use a unique lowercase, hyphen-separated slug. Its public URL is `/ideas/your-new-slug`.
2. Set `title`, `description`, `publishedDate`, `updatedDate`, `author`, `category`, and `tags`. Dates use YYYY-MM-DD. Choose a category slug from `IDEA_TOPICS` in `lib/ideas-content.ts`. The author is shown publicly; use Memento House for team-written articles.
3. Add an image to `public/brand` or another public folder. Set `heroImage` to its slash-prefixed public path and write descriptive `heroImageAlt`. Prefer compressed WebP. The template uses Next Image for responsive optimization; large inline images are lazy-loaded.
4. Write `intro` as an array of paragraphs. Add `sections`, each with a unique `heading` and `paragraphs` array. Optional section fields are `bullets`, `image` (`src`, `alt`, optional `caption`), `callout` (`title`, `text`), `links` (`label`, local `href`), and `table` (`headers`, matching-width `rows`). Headings automatically become table-of-contents anchors.
5. Add useful `faqs` with `question` and `answer`; omit them or use an empty array when unnecessary. These are visible reader content, without blanket FAQ structured data.
6. Set unique `seoTitle` and `seoDescription`. The route creates the canonical URL, Open Graph and Twitter metadata, Article schema, and breadcrumbs automatically. Keep titles clear and descriptions specific to the article's actual content.
7. Set `featured: true` to appear in Popular Right Now. The hub displays the first four featured articles, ordered by publication date then title; unfeature an older item if needed. Set `published: false` for drafts; drafts are excluded from routing, related content, and the sitemap. Future dates alone do not schedule publication.
8. Set `relatedArticles` to preferred published article slugs. Related content prioritizes those entries, then category and shared tags, and excludes the current article. `relatedProduct` currently supports `memento-map-wedding`. The end product CTA and sole demo are provided automatically. Optional top-level `callout` customizes its title and text for the topic.
9. Run `npm test`, `npx tsc --noEmit`, and `npm run build`, then preview the article on desktop and mobile. Check images, table scrolling, links, metadata, and dates. Commit and deploy using the site's existing process.

## Adding intent pages and topics

A published JSON file in `content/landings` becomes `/<slug>` and enters the sitemap automatically. Give every landing page its own search intent, useful comparisons, practical guidance, and honest product limitations. Do not generate near-duplicate keywords or arbitrary location pages. Existing named app routes take precedence over the marketing slug route; never reuse an existing route or topic slug. Topics live at `/ideas/<category>`; `/ideas/category/<category>` redirects to the same canonical page.

The sitemap automatically includes published articles, public topic collections, public intent pages, the quiz, and generator alongside existing public marketing routes. Customer maps, dashboard pages, accounts, checkout, and private tools are excluded. Preserve `/map/jonah-kate` as the only interactive example; do not manufacture SEO demo experiences or add it to the sitemap.

## Analytics and content maintenance

New marketing links use `MarketingLink` and `ViewDemoCTA` from `app/marketing/analytics.tsx`. They use the existing Google Analytics provider; do not add another tracking script. Page views emit `seo_landing_view` or `ideas_article_viewed`; tracked links emit `seo_cta_click`, with `demo_opened`, `related_article_clicked`, or `article_product_cta_clicked` where appropriate. Quiz events are `quiz_started` and `quiz_completed` (including recommendation). Generator events are `idea_generator_started` and `idea_generator_completed` (including preference, goal, and budget). No names, email addresses, or guest submissions are sent by these new events.

Quiz weights and generator eligibility are pure functions in `lib/guestbook-tools.ts`. Update their tests when changing recommendations. Verify current package prices and feature boundaries whenever editing marketing copy. Export files are digital; printing or framing is a separate customer choice. Do not promise participation numbers or search rankings.
