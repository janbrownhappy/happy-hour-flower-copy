---
name: happy-hour-flower
description: How to find happy hour deals, venues, local guides and articles on Happy Hour Flower (Greenville, SC), and how to connect to its sign-in-protected MCP server.
---

# Happy Hour Flower

Happy Hour Flower ("Find your happy place - FAST") helps people find local happy hour
deals, drink and food specials, events and food trucks. It launched in Greenville, SC.
Consumers browse specials by neighborhood, day and time. Venue owners claim their
listings, post deals and reach nearby fans.

Site: https://happyhourflower.com

## Machine-readable resources

- `/llms.txt`: short summary of the site with its main links. Start here.
- `/sitemap.xml`: every public page, including blog articles.
- `/robots.txt`: crawl rules. `Content-Signal: search=yes, ai-input=yes, ai-train=yes`.
- `/auth.md`: how an agent gets access on behalf of a user.
- `/.well-known/agent-skills/index.json`: index that lists this skill.

## Main public sections

| Path | What it holds |
| --- | --- |
| `/` | Overview for consumers and venues |
| `/site/consumers` | How people find happy hours near them |
| `/site/venues` | How bars and restaurants promote their happy hours |
| `/site/venues/list-your-happy-hour` | How to add or claim a venue listing |
| `/site/happy-hour-flower-vs-yelp-google-maps` | Comparison with other apps |
| `/site/pricing` | Plans overview |
| `/site/pricing/consumers` | Consumer plans |
| `/site/pricing/venues` | Venue plans (Free, Premium, Platinum) |
| `/happy-hour` | Local Guides index (happy hour by city) |
| `/happy-hour/{market}` | Happy hours in one city |
| `/happy-hour/{market}/area/{area}` | Happy hours in one neighborhood |
| `/happy-hour/{market}/{day}` | Happy hours on one weekday (e.g. `monday`) |
| `/blog` | Articles: local guides, venue spotlights, tips |
| `/blog/{slug}` | A single article |
| `/blog/rss.xml` | Blog RSS feed |
| `/portal` | Public portal where businesses look up and claim a venue |
| `/terms`, `/privacy`, `/cookies` | Legal pages |

## How to find content

1. Read `/llms.txt` for the main entry points.
2. Read `/sitemap.xml` to get every public URL, including articles.
3. For happy hours in a place, open `/happy-hour`, pick a city, then a neighborhood
   or a weekday.
4. For articles, open `/blog` or the RSS feed at `/blog/rss.xml`.

The site is a single-page JavaScript app. Pages render in the browser, so use a client
that runs JavaScript, or use the sitemap and llms.txt for links.

## Signed-in app

The app itself (explore, map, venue detail, favorites, news, Ask a Local) is at
`/explore` and needs an account. People sign up at `/register` and sign in at `/login`.
Users must be 21 or older. Agents must not create accounts or sign in for a person
without their permission.

## In-browser tools (WebMCP)

In browsers that support WebMCP, the home page registers these read-only tools:

- `search_site`: search public pages and published blog articles by keyword.
- `get_page`: get the title, URL and summary of a public page by path.
- `list_blog_articles`: list recent published blog articles.

None of these tools submit forms or change data.

## MCP server

An MCP server runs at `https://happyhourflower.com/api/mcp` (streamable HTTP).
It needs OAuth sign-in: the person signs in with their own Happy Hour Flower account
and approves access on the consent page. The agent then acts only with that person's
permissions. Without a token the server answers `401`. See `/auth.md`.

There is no separate public REST API, API key or developer token.
