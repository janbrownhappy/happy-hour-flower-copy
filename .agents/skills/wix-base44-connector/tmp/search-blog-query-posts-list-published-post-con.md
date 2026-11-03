#### [com.wixpress.npm.communities.platformized.blog.v3.PostService.ListPosts](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/list-posts)

# Package: blog
# Namespace: postsStats
# Method: List Posts
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/list-posts
# Method API Endpoint: GET https://www.wixapis.com/v3/posts
## Method Code Examples

--- Code Example: ListPosts ---

### ListPosts
```javascript
```cURL
curl \
  'https://www.wixapis.com/blog/v3/posts?featured=false&categoryIds=a68da372-6bfa-412c-ad29-a3f1000ea3f2&tagIds=edd159e5-603f-4826-a668-8d8cc037ab6d' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>'
```
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "posts": [
    "object"
  ],
  "metaData": {
    "count": "integer",
    "offset": "integer",
    "total": "integer",
    "cursor": "string"
  }
}
```

--- Method Description ---
## Method Description:
Retrieves a list of up to 100 published posts per request.

List Posts runs with these defaults, which you can override:
- `firstPublishedDate` is sorted in descending order, with pinned posts first.
- `paging.limit` is `50`.
- `paging.offset` is `0`.
## Method Permissions:
BLOG.READ-PUBLICATION
## Method Permissions Scopes:
Read Blog : SCOPE.DC-BLOG.READ-BLOGS
## Additional Method Code Examples

--- Code Example: HTTP request example ---

### HTTP request example
```javascript
(async () => {
      const response = await fetch("https://www.wixapis.com/v3/posts?featured=true&categoryIds=542d765d-dbf7-43bc-a790-6771a68b0e6b&tagIds=33d53b0b-8408-43b0-b8d6-7a6954a55892", {
        headers: {
          "Content-Type": "application/json",
          "Cookie": "automation=true",
          "authorization": "memberToken..."
        }
      });
      const result = await response.json();
      return result;
    })();
```


---

#### [com.wixpress.npm.communities.platformized.blog.v3.PostService.QueryPosts](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/query-posts)

# Package: blog
# Namespace: postsStats
# Method: Query Posts
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/query-posts
# Method API Endpoint: POST https://www.wixapis.com/v3/posts/query
## Method Code Examples

--- Code Example: QueryPosts ---

### QueryPosts
```javascript
```cURL
curl \
  'https://www.wixapis.com/blog/v3/posts/query' \
   --data-binary '{
                    "fieldsets": ["URL", "METRICS", "CONTENT_TEXT"],
                    "query": {
                      "filter": {
                        "title": {
                          "$startsWith": "My vacation"
                        }
                      }
                    }
                  }' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>'
```
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "posts": [
    "object"
  ],
  "pagingMetadata": {
    "count": "integer<int32>",
    "offset": "integer<int32>",
    "total": "integer<int32>",
    "tooManyToCount": "boolean",
    "cursors": "object"
  }
}
```

--- Method Description ---
## Method Description:
Retrieves a list of up to 100 posts, given the provided paging, filtering, and sorting.

Query Posts runs with these defaults, which you can override:
- `firstPublishedDate` is sorted in descending order, with pinned posts first.
- `paging.limit` is `50`.
- `paging.offset` is `0`.

To learn about working with _Query_ endpoints, see
[API Query Language](https://dev.wix.com/api/rest/getting-started/api-query-language),
[Sorting and Paging](https://dev.wix.com/api/rest/getting-started/sorting-and-paging), and
[Field Projection](https://dev.wix.com/api/rest/getting-started/field-projection).
## Method Permissions:
BLOG.READ-PUBLICATION
## Method Permissions Scopes:
Read Blog : SCOPE.DC-BLOG.READ-BLOGS
## Additional Method Code Examples

--- Code Example: HTTP request example ---

### HTTP request example
```javascript
(async () => {
  const response = await fetch("https://www.wixapis.com/v3/posts/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": "automation=true",
      "authorization": "memberToken..."
    },
    body: JSON.stringify({
      "fieldsets": [
        "URL"
      ],
      "query": {
        "cursorPaging": {
          "limit": 50
        },
        "filter": {
          "firstPublishedDate": {
            "$gt": 1709213898000
          }
        },
        "sort": [
          {
            "fieldName": "firstPublishedDate",
            "order": "DESC"
          }
        ]
      }
    })
  });
  const result = await response.json();
  return result;
})();
```


---

#### [business-solutions/cms/collection-management/wix-app-collections/wix-blog-collections](https://dev.wix.com/docs/api-reference/business-solutions/cms/collection-management/wix-app-collections/wix-blog-collections)

## Resource: Wix Blog Collections

## Article: Wix Blog Collections

## Article Link: https://dev.wix.com/docs/api-reference/business-solutions/cms/collection-management/wix-app-collections/wix-blog-collections

## Article Content:

# Wix Blog Collections

This article explains the fixed permissions and field structure for the following Wix Blog collections:

- [Categories](#categories)
- [Posts](#posts)
- [Tags](#tags)

> **Note:** These collections are system collections, so you can't change their permissions in the CMS.

<blockquote class="tip">

**Tip:**
Before continuing, make sure you've read [Working with Wix App Collections](https://dev.wix.com/docs/develop-websites/articles/databases/wix-data/collections/working-with-wix-app-collections-and-code).

</blockquote>

## Categories

This section explains the permissions and fields available in the Categories collection.

To use the Categories collection in code, refer to it as `Blog/Categories`.

::::tabs
:::REST_TAB
```
curl -X POST \
  'https://www.wixapis.com/wix-data/v2/items/query' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>' \
  -d '{
    "dataCollectionId": "Blog/Categories",
    "query": {}
  }'
```
:::
:::SDK_TAB
```js
import { items } from "@wix/data";

items.query("Blog/Categories")
  .find()
  .then((results) => {
    // handle the results
  });
```
:::
::::

### Permissions

The Categories collection has the following [permissions](https://support.wix.com/en/article/cms-collection-permissions-overview):

- `read`: `ANYONE`
- `create`: None
- `update`: None
- `remove`: None

### Fields

This section describes each field in this collection and its properties.

Each field heading shows the field name followed by the field ID in parentheses, in the format "fieldName (`fieldId`)".

#### ID (`_id`)

**Description:** The ID of the blog category. This is a system field and is hidden by default.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`

**Read-only:** Yes

#### Label (`label`)

**Description:** The name of the category as it appears in the Blog menu.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** Yes

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `contains`, `startsWith`, `hasSome`

**Read-only:** Yes

#### Post Count (`postCount`)

**Description:** The number of posts in the category.

**Type:** Number

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

**Read-only:** Yes

#### Posts (`posts`)

**Description:** A list of posts in this category, referenced from the [Blog/Posts](#posts) collection.

**Type:** Multiple-item reference

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Language (`language`)

**Description:** The category language.

**Type:** Language

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Translation ID (`translationId`)

**Description:** ID of the category's translations.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Category Page Slug (`categoryPageSlug`)

**Description:** The slug of the category page on your published site.

**Type:** URL

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Category Page URL (`categoryPageUrl`)

**Description:** The URL of the category page on your published site.

**Type:** URL

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Cover Image (`coverImage`)

**Description:** Category cover image.

**Type:** Image

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Description (`description`)

**Description:** Category description.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Slug (`slug`)

**Description:** Slug of the category to retrieve.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** Yes

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

## Posts

This section explains the permissions and fields available in the Posts collection.

To use the Posts collection in code, refer to it as `Blog/Posts`.

::::tabs
:::REST_TAB
```
curl -X POST \
  'https://www.wixapis.com/wix-data/v2/items/query' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>' \
  -d '{
    "dataCollectionId": "Blog/Posts",
    "query": {}
  }'
```
:::
:::SDK_TAB
```js
import { items } from "@wix/data";

items.query("Blog/Posts")
  .find()
  .then((results) => {
    // handle the results
  });
```
:::
::::

### Permissions

The Posts collection has the following [permissions](https://support.wix.com/en/article/cms-collection-permissions-overview):

- `read`: `ANYONE`
- `create`: None
- `update`: None
- `remove`: None

### Fields

This section describes each field in this collection and its properties.

Each field heading shows the field name followed by the field ID in parentheses, in the format "fieldName (`fieldId`)".

#### ID (`_id`)

**Description:** The ID of the post. This is a system field and is hidden by default.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`

**Read-only:** Yes

#### Title (`title`)

**Description:** The title of the post.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** Yes

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `contains`, `startsWith`, `hasSome`

**Read-only:** Yes

#### Published Date (`publishedDate`)

**Description:** The date the post was originally published.

**Type:** Date

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

**Read-only:** Yes

#### Cover Image (`coverImage`)

**Description:** The cover image of the post.

**Type:** Image

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Categories (`categories`)

**Description:** The categories assigned to the post, referenced from the [Blog/Categories](#categories) collection.

**Type:** Multiple-item reference

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** `hasAll`, `hasSome`, `contains`

**Read-only:** Yes

#### Main Category (`mainCategory`)

**Description:**

**Type:** Reference

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Plain Content (`plainContent`)

**Description:** The text of the post without any formatting.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Rich Content (`richContent`)

**Description:**

**Type:** Rich Content

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Excerpt (`excerpt`)

**Description:** A few lines of text that appear in the blog feed. Defined in Post Settings or default of first 160 characters of the post.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Hashtags (`hashtags`)

**Description:** List of all hashtags in the post.

**Type:** Tags

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** `hasAll`, `hasSome`

**Read-only:** Yes

#### View Count (`viewCount`)

**Description:** The number of times the post was viewed.

**Type:** Number

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

**Read-only:** Yes

> **Note:** `viewCount` data used on your site pages may require up to 24 hours to update. To make sure new post views are included on your site in real time, [disable caching](https://support.wix.com/en/article/site-performance-caching-pages-to-optimize-loading-speed#enabling-and-disabling-caching-on-site-pages) for any page that uses `viewCount` data. Note that disabling caching may increase your page loading time.

#### Like Count (`likeCount`)

**Description:** The number of likes the post received (from members only).

**Type:** Number

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

**Read-only:** Yes

> **Note:** `likeCount` data used on your site pages may require up to 24 hours to update. To make sure new post likes are included on your site in real time, [disable caching](https://support.wix.com/en/article/site-performance-caching-pages-to-optimize-loading-speed#enabling-and-disabling-caching-on-site-pages) for any page that uses `likeCount` data. Note that disabling caching may increase your page loading time.

#### Comment Count (`commentCount`)

**Description:** The number of comments the post received (from members only).

**Type:** Number

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

**Read-only:** Yes

#### Featured (`featured`)

**Description:** Indicates whether the post is set as featured in the post settings.

**Type:** Boolean

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** `eq`, `ne`

**Read-only:** Yes

#### Pinned (`pinned`)

**Description:** Indicates whether the post was pinned to the top of the page in the live site.

**Type:** Boolean

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** `eq`, `ne`

**Read-only:** Yes

#### Last Published Date (`lastPublishedDate`)

**Description:** The most recent publish date of the post.

**Type:** Date

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

**Read-only:** Yes

#### Cover Image Displayed (`coverImageDisplayed`)

**Description:** Indicates whether the cover image is displayed in the feed. If false, the cover image is displayed only when you share the post on social media.

**Type:** Boolean

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** `eq`, `ne`

**Read-only:** Yes

#### Post Page URL (`postPageURL`)

**Description:** The relative URL of the post page on your published site.

**Type:** URL

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Language (`language`)

**Description:**

**Type:** Language

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Translation ID (`translationId`)

**Description:**

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Time to Read (`timeToRead`)

**Description:** Estimated time in minutes required to read the post.

**Type:** Number

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Related Posts (`relatedPosts`)

**Description:**

**Type:** Multi-Reference

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Tags (`tags`)

**Description:**

**Type:** Multi-Reference

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Author (`author`)

**Description:**

**Type:** Reference

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Slug (`slug`)

**Description:**

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** Yes

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### PaidPlans (`paidPlans`)

**Description:**

**Type:** Multi-Reference

**Can connect to data:**

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

## Tags

This section explains the permissions and fields available in the Tags collection.

To use the Tags collection in code, refer to it as `Blog/Tags`.

::::tabs
:::REST_TAB
```
curl -X POST \
  'https://www.wixapis.com/wix-data/v2/items/query' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>' \
  -d '{
    "dataCollectionId": "Blog/Tags",
    "query": {}
  }'
```
:::
:::SDK_TAB
```js
import { items } from "@wix/data";

items.query("Blog/Tags")
  .find()
  .then((results) => {
    // handle the results
  });
```
:::
::::

### Permissions

The Tags collection has the following [permissions](https://support.wix.com/en/article/cms-collection-permissions-overview):

- `read`: `ANYONE`
- `create`: None
- `update`: None
- `remove`: None

### Fields

This section describes each field in this collection and its properties.

Each field heading shows the field name followed by the field ID in parentheses, in the format "fieldName (`fieldId`)".

#### ID (`_id`)

**Description:** The ID of the blog tag. This is a system field and is hidden by default.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`

**Read-only:** Yes

#### Label (`label`)

**Description:** The name of the tag as it appears in the Blog menu. 

**Type:** Text 

**Can connect to data:** Yes 

**Can use in dynamic page URL:** Yes

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `contains`, `startsWith`, `hasSome` 

**Read-only:** Yes

#### Post Count (`postCount`)

**Description:** The number of posts with the tag.

**Type:** Number

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** Yes

**Filter Support:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

**Read-only:** Yes

#### Posts (`posts`)

**Description:** A list of posts with this tag, referenced from the [Blog/Posts](#posts) collection.

**Type:** Multiple-item reference

**Can connect to data:** No

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** Yes

**Read-only:** Yes

#### Tag Page URL (`tagPageUrl`)

**Description:** The URL of the tag page on your published site.

**Type:** URL

**Can connect to data:** Yes

**Can use in dynamic page URL:** No

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

#### Slug (`slug`)

**Description:** Slug of the tag to retrieve.

**Type:** Text

**Can connect to data:** Yes

**Can use in dynamic page URL:** Yes

**Sortable:** No

**Filter Support:** No

**Read-only:** Yes

---

#### [business-solutions/blog/posts-stats/introduction](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/introduction)

## Resource: Introduction

## Article: Introduction

## Article Link: https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/introduction

## Article Content:

# About the Posts and Stats API

The Posts and Stats API allows you to retrieve and manage blog posts. A post is a published article written for a blog.

With the Posts and Stats API, you can:

- Retrieve and display [a post](https://dev.wix.com/docs/rest/business-solutions/blog/posts-stats/get-post) or [a list of posts](https://dev.wix.com/docs/rest/business-solutions/blog/posts-stats/list-posts).
- [Query posts](https://dev.wix.com/docs/rest/business-solutions/blog/posts-stats/query-posts) based on specific filters.
- [Retrieve the metrics](https://dev.wix.com/docs/rest/business-solutions/blog/posts-stats/get-post-metrics) of a post to analyze engagement and performance.

Learn more about [Wix Blog](https://support.wix.com/en/article/wix-blog-about-the-wix-blog).

## Before you begin

It’s important to note the following before starting to code:

+ With [Wix Pricing Plans](https://dev.wix.com/docs/rest/business-solutions/pricing-plans/pricing-plans/introduction), exclusive blog content can only be accessed by readers with a subscription. Learn more about [creating blog post subscriptions](https://support.wix.com/en/article/wix-blog-creating-blog-post-subscriptions).

+ With [Wix Multilingual](https://support.wix.com/en/article/wix-multilingual-an-overview), a blog can be translated into multiple languages. Learn more about [translating a blog](https://support.wix.com/en/article/wix-multilingual-translating-your-blog).
  > **Note:** `translationId` is only returned in a post object if the [Multilingual](https://support.wix.com/en/article/wix-multilingual-an-overview) app is installed.

## Blog roles
Collaborators can create and manage blogs based on certain roles: 
- **Blog editors** can fully manage the blog, but not other areas of a site.
- **Blog writers** can create and publish their own posts on a blog.
- **Guest writers** can create posts, but can't publish them. 

## Terminology

- **Post**: A published article on a blog. It is also referred to as a publication. A blog can have up to 100,000 posts.
- **Draft Post**: An article written by a Wix user, blog editor, blog writer, or a guest writer that is not yet published.
- **Category**: A group of similar and related posts. A post can be assigned to a maximum of 10 categories.
- **Tag**: A way to further sort and organize blog posts. Tags provide the ability to filter blog posts.

@sdk_package_setup

---

#### [com.wixpress.npm.communities.platformized.blog.v3.DraftPostService.ListDraftPosts](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/list-draft-posts)

# Package: blog
# Namespace: draftPosts
# Method: List Draft Posts
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/list-draft-posts
# Method API Endpoint: GET https://www.wixapis.com/blog/v3/draft-posts
## Method Code Examples

--- Code Example: ListDraftPosts ---

### ListDraftPosts
```javascript
```cURL
curl \
  'https://www.wixapis.com/blog/v3/draft-posts' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>'
```
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "draftPosts": [
    "object"
  ],
  "metaData": {
    "count": "integer",
    "offset": "integer",
    "total": "integer",
    "cursor": "string"
  }
}
```

--- Method Description ---
## Method Description:
Retrieves a list of up to 100 draft posts per request.

List Draft Posts runs with these defaults, which you can override:
- `editedDate` is sorted in descending order.
- `paging.limit` is `50`.
- `paging.offset` is `0`.
## Method Permissions:
BLOG.READ_DRAFT
## Method Permissions Scopes:
Manage Blog: SCOPE.DC-BLOG.MANAGE-BLOG
## Additional Method Code Examples

--- Code Example: HTTP request example ---

### HTTP request example
```javascript
(async () => {
      const response = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
        headers: {
          "Content-Type": "application/json",
          "Cookie": "automation=true",
          "authorization": "appToken..."
        }
      });
      const result = await response.json();
      return result;
    })();
```


---

#### [wix.promote.seo.content.plan.v1.SeoBlogPostCandidateServiceV1.ListBlogPostCandidates](https://dev.wix.com/docs/api-reference/business-management/seo/content-plan-blog-post-candidate-v1/list-blog-post-candidates)

# Package: seo
# Namespace: contentPlanBlogPostCandidateV1
# Method: List Blog Post Candidates
# Method link: https://dev.wix.com/docs/api-reference/business-management/seo/content-plan-blog-post-candidate-v1/list-blog-post-candidates
# Method API Endpoint: GET https://www.wixapis.com/seo-content-plan-service/v1/content-plan-flows/{contentPlanFlowId}/blog-post-candidates
## Method Code Examples

--- Code Example: List the unused blog post briefs for a content plan flow ---

### List the unused blog post briefs for a content plan flow
Returns the briefs that haven't been turned into blog posts yet. Omit includeOnlyUnmarked to return every brief.

```javascript
curl -X GET \
'https://www.wixapis.com/seo-content-plan-service/v1/content-plan-flows/d290f1ee-6c54-4b01-90e6-d701748f0851/blog-post-candidates?includeOnlyUnmarked=true' \
-H 'Authorization: <AUTH>'
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "blogPostCandidates": [
    "object"
  ],
  "pagingMetadata": {
    "count": "integer<int32>",
    "cursors": "object",
    "hasNext": "boolean"
  }
}
```

--- Method Description ---
## Method Description:
Retrieves a list of blog post candidates for a content plan flow.

Omit `contentPlanFlowId` to read the site's most recent successful flow.
A site whose flows are all still running, failed, or canceled returns a
not found error.

Omit `paging` to return every candidate in a single response. When
`paging` is present, `limit` accepts 1 to 100 and defaults to 50.

Results are sorted by the order the content plan assigns them, then by
descending keyword score. The sort isn't configurable.
## Method Permissions:
promote:seo:v1:content_plan_blog_post_candidate:list_blog_post_candidates
## Method Permissions Scopes:
View SEO Settings: SCOPE.PROMOTE.VIEW-SEO

## Method Schema Summary:
The `listBlogPostCandidates` method retrieves a list of blog post candidates for a content plan flow. It requires the `contentPlanFlowId` parameter. Optionally, it accepts `includeOnlyUnmarked` to filter for candidates not yet used for a blog post, and `paging` for paginated results with a `limit` between 1 and 100 (defaulting to 50) and a `cursor`. If `contentPlanFlowId` is omitted, the system defaults to the site's most recent successful flow. The results are sorted by content plan order and then by descending keyword score, which is not configurable.

The response includes an array of `blogPostCandidates`, each with an `id`, `candidateData` (including `blogPostCandidateId` and `contentPlanFlowId`), `briefData` (containing `h1Title`, `keyword`, `mainKeyword`, `pageUrl`), and `seoData` (including `tags` and `settings`). It also returns `pagingMetadata` with `count`, `cursors` (for `next` and `prev` pages), and `hasNext`.

---

**Questions and Answers:**

1.  **Q: How do I get blog post candidates for the latest successful content plan flow?**
    A: Omit the `contentPlanFlowId` parameter.
2.  **Q: Can I get only blog post candidates that haven't been used yet?**
    A: Yes, set the `includeOnlyUnmarked` query parameter to `true`.
3.  **Q: What is the maximum number of blog post candidates I can retrieve per page?**
    A: The `limit` parameter accepts a maximum of 100 items per page.
4.  **Q: How are the blog post candidates sorted?**
    A: Results are sorted by content plan order, then by descending keyword score.
5.  **Q: What information is included for each blog post candidate?**
    A: Each candidate includes an ID, data about its origin, brief details like title and keywords, and SEO suggestions.

---

#### [business-solutions/blog/draft-posts/introduction](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/introduction)

## Resource: Introduction

## Article: Introduction

## Article Link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/introduction

## Article Content:

# About the Draft Posts API

The Draft Posts API allows you to create and manage draft posts. A draft post is an article written by a site collaborator who is given the appropriate [roles and permissions](#blog-roles).

With the Draft Posts API, you can:

- [Create](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/create-draft-post) and [update](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/update-draft-post) draft posts.
- [Publish draft posts](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/publish-draft-post).
- [Query](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/query-draft-posts) and [list](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/list-draft-posts) draft posts.
- [Create](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/bulk-create-draft-posts), [update](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/bulk-update-draft-posts), and [delete](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/bulk-delete-draft-posts) multiple draft posts.
- [Delete](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/delete-draft-post) draft posts.
- [Restore deleted draft posts](https://dev.wix.com/docs/rest/business-solutions/blog/draft-posts/restore-from-trash-bin) from the trash bin.

Learn more about [Wix Blog](https://support.wix.com/en/article/wix-blog-about-the-wix-blog).

## Before you begin

It’s important to note the following before starting to code:

+ The size limit of a single draft post is 400KB.

+ With [Wix Pricing Plans](https://dev.wix.com/docs/rest/business-solutions/pricing-plans/pricing-plans/introduction), exclusive blog content can only be accessed by readers with a subscription. Learn more about [creating blog post subscriptions](https://support.wix.com/en/article/wix-blog-creating-blog-post-subscriptions).

+ With [Wix Multilingual](https://support.wix.com/en/article/wix-multilingual-an-overview), a blog can be translated into multiple languages. Learn more about [translating a blog](https://support.wix.com/en/article/wix-multilingual-translating-your-blog).
  > **Note:** `translationId` is only returned in a draft post object if the [Multilingual](https://support.wix.com/en/article/wix-multilingual-an-overview) app is installed.

## Blog roles
Collaborators can create and manage blogs based on certain roles: 
- **Blog editors** can fully manage the blog, but not other areas of a site.
- **Blog writers** can create and publish their own posts on a blog.
- **Guest writers** can create posts, but can't publish them. 

## Terminology

- **Post**: A published article on a blog. It is also referred to as a publication. A blog can have up to 100,000 posts.
- **Draft Post**: An article written by a Wix user, blog editor, blog writer, or a guest writer that is not yet published.
- **Category**: A group of similar and related posts. A post can be assigned to a maximum of 10 categories.
- **Tag**: A way to further sort and organize blog posts. Tags provide the ability to filter blog posts.

@sdk_package_setup

---

#### [business-solutions/blog/skills/blog-dashboard-navigation](https://dev.wix.com/docs/api-reference/business-solutions/blog/skills/blog-dashboard-navigation)

## Resource: Blog Dashboard Navigation

## Article: Blog Dashboard Navigation

## Article Link: https://dev.wix.com/docs/api-reference/business-solutions/blog/skills/blog-dashboard-navigation

## Article Content:

# Blog Dashboard Navigation

Build direct links into the Wix Blog pages of a site's dashboard. For the general URL contract (metaSiteId, fallbacks, redirects), see [Dashboard Navigation](https://dev.wix.com/docs/api-reference/business-solutions/bookings/skills/dashboard-navigation).

All Wix Blog (app ID `14bcded7-0066-7c35-14d7-466cb3f09103`) pages live under:

```
https://manage.wix.com/dashboard/{metaSiteId}/blog/{route}
```

## Main Pages

| Page | URL after `/dashboard/{metaSiteId}/` | What it manages |
|---|---|---|
| Overview | `blog/overview` | Blog summary and quick actions |
| Posts | `blog/posts` | All posts — the page has tabs for published posts and drafts |
| Categories | `blog/categories` | Post categories |
| Edit category | `blog/categories/edit` | A specific category |
| Tags | `blog/tags` | Post tags |
| Writers | `blog/writers` | Writers and editors |
| Edit writer | `blog/writers/edit` | A specific writer |
| Comments | `blog/comments` | Comment moderation |
| Blog analytics | `blog/analytics` | Traffic and engagement analytics |
| Monetization | `blog/monetization` | Ways to earn from the blog |
| Blog settings | `blog/settings` | Blog-level settings |

The bare app root `blog` lands on the posts page. Older writer-management links (`staff-management/writers/...`) redirect to `blog/writers`.

## Pairing Entities with Their Read APIs

Fetch the entity via REST, then link the matching dashboard page. All calls use `https://www.wixapis.com` with an `Authorization` header. Published posts and drafts are separate endpoints (Blog Posts API vs Draft Posts API) but share the same dashboard page — drafts sit in the Drafts tab of `blog/posts`.

| Entity | Read API | Dashboard link |
|---|---|---|
| Post (published) | `GET /blog/v3/posts` · `POST /blog/v3/posts/query` · `GET /blog/v3/posts/{postId}` | `blog/posts` |
| Draft post | `GET /blog/v3/draft-posts` · `POST /blog/v3/draft-posts/query` · `GET /blog/v3/draft-posts/{draftPostId}` | `blog/posts` (Drafts tab) |
| Category | `GET /blog/v3/categories` · `POST /blog/v3/categories/query` | `blog/categories` |
| Tag | `POST /blog/v3/tags/query` · `GET /blog/v3/tags/{tagId}` | `blog/tags` |
| Comment | Comments API — `POST /comments/v1/comments/query-cursor` | `blog/comments` |
| Writer | Writers are site members — `GET /members/v1/members` (List Members) | `blog/writers` |

Example — after publishing a post, hand back the dashboard link:

```
Published "10 Tips for Better Coffee".
Manage your posts here: https://manage.wix.com/dashboard/{metaSiteId}/blog/posts
```

## Notes

- Unknown deeper paths fall back to the longest matching route, so `blog/posts/...` links land on the posts list rather than 404.

---

#### [com.wixpress.npm.communities.platformized.blog.v3.DraftPostService.QueryDraftPosts](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/query-draft-posts)

# Package: blog
# Namespace: draftPosts
# Method: Query Draft Posts
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/query-draft-posts
# Method API Endpoint: POST https://www.wixapis.com/blog/v3/draft-posts/query
## Method Code Examples

--- Code Example: QueryDraftPosts ---

### QueryDraftPosts
```javascript
```cURL
curl \
  'https://www.wixapis.com/blog/v3/draft-posts/query' \
   --data-binary '{
                    "query": {
                      "filter": {
                        "title": {
                          "$startsWith": "Places to visit"
                        }
                      }
                    }
                  }' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>'
```
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "draftPosts": [
    "object"
  ],
  "pagingMetadata": {
    "count": "integer<int32>",
    "offset": "integer<int32>",
    "total": "integer<int32>",
    "tooManyToCount": "boolean",
    "cursors": "object"
  }
}
```

--- Method Description ---
## Method Description:
Retrieves a list of up to 100 draft posts, given the provided paging, filtering, and sorting.

Query Draft Posts runs with these defaults, which you can override:
- `editedDate` is sorted in `DESC` order.
- `paging.limit` is `50`.
- `paging.offset` is `0`.

To learn about working with _Query_ endpoints, see
[API Query Language](https://dev.wix.com/api/rest/getting-started/api-query-language),
[Sorting and Paging](https://dev.wix.com/api/rest/getting-started/sorting-and-paging), and
[Field Projection](https://dev.wix.com/api/rest/getting-started/field-projection).
## Method Permissions:
BLOG.READ_DRAFT
## Method Permissions Scopes:
Manage Blog: SCOPE.DC-BLOG.MANAGE-BLOG
## Additional Method Code Examples

--- Code Example: HTTP request example ---

### HTTP request example
```javascript
(async () => {
      const response = await fetch("https://www.wixapis.com/blog/v3/draft-posts/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": "automation=true",
          "authorization": "appToken..."
        },
        body: JSON.stringify({
          "query": {
            "filter": {
              "title": {
                "$startsWith": "Draft Entry"
              }
            },
            "cursorPaging": {
              "limit": 10
            }
          }
        })
      });
      const result = await response.json();
      return result;
    })();
```


---

#### [com.wixpress.npm.communities.platformized.blog.v3.PostService.GetPost](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/get-post)

# Package: blog
# Namespace: postsStats
# Method: Get Post
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/get-post
# Method API Endpoint: GET https://www.wixapis.com/v3/posts/{postId}
## Method Code Examples

--- Code Example: Get a blog post with the `URL` fieldset ---

### Get a blog post with the `URL` fieldset
```javascript
curl \
  'https://www.wixapis.com/blog/v3/posts/894a58a2-dc75-422d-9ca6-00a489750dfd?fieldsets=URL' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>'
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "post": {
    "id": "string<GUID>",
    "title": "string",
    "excerpt": "string",
    "contentText": "string",
    "firstPublishedDate": "string<date-time>",
    "lastPublishedDate": "string<date-time>",
    "url": "object",
    "slug": "string",
    "featured": "boolean",
    "pinned": "boolean",
    "categoryIds": [
      "string"
    ],
    "memberId": "string<GUID>",
    "hashtags": [
      "string"
    ],
    "commentingEnabled": "boolean",
    "minutesToRead": "integer",
    "heroImage": "object",
    "tagIds": [
      "string"
    ],
    "relatedPostIds": [
      "string"
    ],
    "pricingPlanIds": [
      "string"
    ],
    "translationId": "string<GUID>",
    "language": "string<LANGUAGE_TAG>",
    "seoData": "object",
    "contactId": "string<GUID>",
    "richContent": "object",
    "preview": "boolean",
    "moderationDetails": "object",
    "media": {
      "oneOf": [
        "media"
      ]
    },
    "hasUnpublishedChanges": "boolean",
    "referenceId": "string"
  }
}
```
--- Code Example: Get a blog post - minimum required params ---

### Get a blog post - minimum required params
```javascript
curl \
  'https://www.wixapis.com/blog/v3/posts/894a58a2-dc75-422d-9ca6-00a489750dfd' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>'
```
--- Method Description ---
## Method Description:
Retrieves a post by the specified ID.
## Method Permissions:
BLOG.READ-PUBLICATION
## Method Permissions Scopes:
Read Blog : SCOPE.DC-BLOG.READ-BLOGS
## Additional Method Code Examples

--- Code Example: HTTP request example ---

### HTTP request example
```javascript
(async () => {
      const response = await fetch("https://www.wixapis.com/v3/posts/99c99185-3724-48cf-affc-02d235d998f4", {
        headers: {
          "Content-Type": "application/json",
          "Cookie": "automation=true",
          "authorization": "memberToken..."
        }
      });
      const result = await response.json();
      return result;
    })();
```
