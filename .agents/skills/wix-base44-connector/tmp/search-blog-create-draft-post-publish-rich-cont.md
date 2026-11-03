#### [com.wixpress.npm.communities.platformized.blog.v3.DraftPostService.CreateDraftPost](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/create-draft-post)

# Package: blog
# Namespace: draftPosts
# Method: Create Draft Post
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/create-draft-post
# Method API Endpoint: POST https://www.wixapis.com/blog/v3/draft-posts
## Method Code Examples

--- Code Example: CreateDraftPost ---

### CreateDraftPost
```javascript
```cURL
curl -X POST \
  'https://www.wixapis.com/blog/v3/draft-posts/' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>' \
  -d '{
        "draftPost": {
          "title": "Hello, world!",
          "featured": true,
          "categoryIds": ["10a5d26e-5028-4f74-92be-e5163c06b58b"],
          "memberId": "8a8b9b73-4da8-47a5-8268-4396e68a0605",
          "hashtags": ["world"],
          "commentingEnabled": true,
          "tagIds": ["191dcdb7-9319-456d-9a66-eba05ef87bb7"],
          "relatedPostIds": ["07f89894-5ce2-4736-9793-b36ec4719d96"],
          "language": "en",
          "richContent": {
            "nodes": [
            {
              "type": "PARAGRAPH",
              "id": "pvirv1",
              "nodes": [
                {
                  "type": "TEXT",
                  "id": "",
                  "nodes": [],
                  "textData": {
                    "text": "Hello world",
                    "decorations": []
                  }
                }
              ],
              "paragraphData": {}
            }
            ]
          }
        },
        "fieldsets": ["URL", "RICH_CONTENT"]
      }'
```
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "draftPost": {
    "id": "string",
    "title": "string",
    "excerpt": "string",
    "featured": "boolean",
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
    "richContent": "object",
    "status": "string",
    "moderationDetails": "object",
    "hasUnpublishedChanges": "boolean",
    "editedDate": "string<date-time>",
    "scheduledPublishDate": "string<date-time>",
    "firstPublishedDate": "string<date-time>",
    "seoData": "object",
    "url": "object",
    "createdDate": "string<date-time>",
    "seoSlug": "string",
    "media": {
      "oneOf": [
        "media"
      ]
    },
    "previewTextParagraph": "integer<int32>"
  }
}
```

--- Method Description ---
## Method Description:
Creates a draft post.

For 3rd-party apps, `memberId` is a required field.

In `categoryIds`, only categories that already exist will be added to the draft post. Including
`categoryIds` that do not exist will not return an error, but they will not be added to the `categoryIds` array.
If some of the categories exist, those will be added while those that do not exist will not be added to `categoryIds`.
You can check which categories are available with
[List Categories](https://dev.wix.com/docs/rest/business-solutions/blog/category/list-categories).
## Method Permissions:
BLOG.CREATE-DRAFT
## Method Permissions Scopes:
Manage Blog: SCOPE.DC-BLOG.MANAGE-BLOG
## Additional Method Code Examples

--- Code Example: HTTP request example ---

### HTTP request example
```javascript
(async () => {
      const response = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": "automation=true",
          "authorization": "appToken..."
        },
        body: JSON.stringify({
          "draftPost": {
            "title": "My New Draft Post Title",
            "memberId": "28962158-e9e0-4a9c-8bf0-5f654d78ccb6"
          },
          "publish": true
        })
      });
      const result = await response.json();
      return result;
    })();
```


---

#### [com.wixpress.npm.communities.platformized.blog.v3.DraftPostService.BulkCreateDraftPosts](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/bulk-create-draft-posts)

# Package: blog
# Namespace: draftPosts
# Method: Bulk Create Draft Posts
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/bulk-create-draft-posts
# Method API Endpoint: POST https://www.wixapis.com/blog/v3/bulk/draft-posts/create
## Method Code Examples

--- Code Example: BulkCreateDraftPosts ---

### BulkCreateDraftPosts
```javascript
```cURL
curl -X POST \
  'https://www.wixapis.com/blog/v3/bulk/draft-posts/create' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>' \
  -d '{
        "draftPosts": [
          {
            "title": "Hello, world!",
            "featured": true,
            "categoryIds": ["10a5d26e-5028-4f74-92be-e5163c06b58b"],
            "memberId": "8a8b9b73-4da8-47a5-8268-4396e68a0605",
            "hashtags": ["world"],
            "commentingEnabled": true,
            "tagIds": ["191dcdb7-9319-456d-9a66-eba05ef87bb7"],
            "relatedPostIds": ["07f89894-5ce2-4736-9793-b36ec4719d96"],
            "language": "en",
            "richContent": {
              "nodes": [
                {
                  "type": "PARAGRAPH",
                  "id": "pvirv1",
                  "nodes": [
                    {
                      "type": "TEXT",
                      "id": "",
                      "nodes": [],
                      "textData": {
                        "text": "Hello world",
                        "decorations": []
                      }
                    }
                  ],
                  "paragraphData": {}
                }
              ]
            }
          },
          {
            "title": "Hello to you too!",
            "featured": true,
            "categoryIds": ["10a5d26e-5028-4f74-92be-e5163c06b58b"],
            "memberId": "8a8b9b73-4da8-47a5-8268-4396e68a0605",
            "hashtags": ["world"],
            "commentingEnabled": true,
            "tagIds": ["191dcdb7-9319-456d-9a66-eba05ef87bb7"],
            "relatedPostIds": ["07f89894-5ce2-4736-9793-b36ec4719d96"],
            "language": "en",
            "richContent": {
              "nodes": [
                {
                  "type": "PARAGRAPH",
                  "id": "pvirv1",
                  "nodes": [
                    {
                      "type": "TEXT",
                      "id": "",
                      "nodes": [],
                      "textData": {
                        "text": "Hello to you too",
                        "decorations": []
                      }
                    }
                  ],
                  "paragraphData": {}
                }
              ]
            }
          }
        ],
        "fieldsets": ["URL", "RICH_CONTENT"],
        "returnFullEntity": false
      }'
```
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "results": [
    "object"
  ],
  "bulkActionMetadata": {
    "totalSuccesses": "integer",
    "totalFailures": "integer",
    "undetailedFailures": "integer"
  }
}
```

--- Method Description ---
## Method Description:
Creates multiple draft posts.
## Method Permissions:
BLOG.CREATE-DRAFT
## Method Permissions Scopes:
Manage Blog: SCOPE.DC-BLOG.MANAGE-BLOG



---

#### [business-solutions/blog/skills/how-to-create-blog-posts](https://dev.wix.com/docs/api-reference/business-solutions/blog/skills/how-to-create-blog-posts)

## Resource: How to Create Blog Posts

## Article: How to Create Blog Posts

## Article Link: https://dev.wix.com/docs/api-reference/business-solutions/blog/skills/how-to-create-blog-posts

## Article Content:

**Article: Create and Publish Blog Posts with Rich Content and Images**

> **Standard call shape (every curl below).** The `<AUTH>` placeholder is shorthand for `Authorization: Bearer <TOKEN>` only. Body-bearing requests also need `Content-Type: application/json`.

---

## Description

This article demonstrates how to create and immediately publish blog posts using Wix Blog REST API, including handling external images, rich content formatting, and proper media management workflow.

### Part 0: Get an Author/Member ID (Required for 3rd-Party Apps)

**IMPORTANT**: When calling the Blog API as a 3rd-party app (not as the site owner), `draftPost.memberId` is **required**. The API will reject requests with "Missing post owner information" if omitted.

A `memberId` is the `id` of a **site member** (Wix Members). Only the Members API produces one. Run the two steps below in order and stop as soon as you have an id — do not go looking for an author id anywhere else (see [What is not a memberId](#what-is-not-a-memberid)).

1. Query site members using [List Members](https://dev.wix.com/docs/api-reference/crm/members-contacts/members/member-management/members/list-members):

   ```bash
   curl -X GET "https://www.wixapis.com/members/v1/members?fieldsets=PUBLIC&paging.limit=1" \
     -H "Authorization: <AUTH>"
   ```

   If the response contains a member, use `members[0].id` as `draftPost.memberId` and skip step 2. That member becomes the post author.

2. **If the site has no members yet** — the response is `{"members": [], "metadata": {"count": 0, "total": 0, ...}}` — create the author member yourself with [Create Member](https://dev.wix.com/docs/api-reference/crm/members-contacts/members/member-management/members/create-member). This is the normal case on a new site or a site that only has Blog installed: nobody has signed up, so there is no member to reuse. Creating the author is a prerequisite of the post the user asked for, not a separate decision — create it, then say so in your summary.

   ```bash
   curl -X POST "https://www.wixapis.com/members/v1/members" \
     -H "Authorization: <AUTH>" \
     -H "Content-Type: application/json" \
     -d '{
       "member": {
         "loginEmail": "blogauthor@example.com",
         "contact": { "firstName": "Blog", "lastName": "Author" }
       }
     }'
   ```

   Use `member.id` from the response as `draftPost.memberId`. The new member comes back with `status: "APPROVED"`, and its `profile.nickname` is derived from the contact name. That nickname is the author name the blog displays, so pass the name the user wants shown (or set `member.profile.nickname` explicitly). If the user named an author, use their name; otherwise a generic author like the example above is fine.

#### What is not a memberId

These are the wrong places to look, and probing them costs a round trip each:

- **Site collaborators / contributors are Wix *users*, not site members.** The [Contributors API](https://dev.wix.com/docs/api-reference/account-level/user-management/sites/contributors/introduction) returns account and user ids, which the Blog API will not accept as a `memberId`.
- **A contact is not a member.** Querying [Contacts](https://dev.wix.com/docs/api-reference/crm/members-contacts/contacts/contacts/introduction) returns contact ids; only members have a `memberId`. On a site with no members the contacts query is usually empty too.
- **`GET https://www.wixapis.com/identity/v1/users` returns 404.** There is no site-scoped identity endpoint to read the site owner from. Do not try it.

### Part 1: Import External Images to Wix Media Manager

1. Identify external image URLs from user input for cover images and embedded content images.

2. Import each external image using [Import File](https://dev.wix.com/docs/api-reference/assets/media/media-manager/files/import-file). This converts external URLs to Wix Media IDs required for blog posts.

   ```bash
   curl -X POST "https://www.wixapis.com/site-media/v1/files/import" \
     -H "Authorization: <AUTH>" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://example.com/image.jpg",
       "mediaType": "IMAGE",
       "displayName": "Cover Image.jpg"
     }'
   ```

   The response will include a `file.id` field. Use this ID in blog post creation. Images with `operationStatus: "PENDING"` can be used immediately.

3. Store the returned file IDs for use in blog post creation.

### Part 2: Create Blog Post with Rich Content

You have two endpoints:
- **Single post:** [Create Draft Post](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/create-draft-post) — `POST https://www.wixapis.com/blog/v3/draft-posts`
- **Multiple posts (preferred for any N ≥ 2):** [Bulk Create Draft Posts](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/bulk-create-draft-posts) — `POST https://www.wixapis.com/blog/v3/bulk/draft-posts/create`

**Use the bulk endpoint when seeding multiple posts** — one call replaces N single-post calls and avoids the per-call latency of ~25–30 s each.

#### Single-post endpoint

   ```bash
   curl -X POST "https://www.wixapis.com/blog/v3/draft-posts" \
     -H "Authorization: <AUTH>" \
     -H "Content-Type: application/json" \
     -d '{
       "draftPost": {
         "title": "My Blog Post",
         "memberId": "author-member-id",
         "richContent": {
           "nodes": [
             {
               "type": "PARAGRAPH",
               "nodes": [{
                 "type": "TEXT",
                 "textData": {
                   "text": "This is a paragraph with some content.",
                   "decorations": []
                 }
               }],
               "paragraphData": {}
             }
           ]
         },
         "media": {
           "wixMedia": {
             "image": { "id": "mediaId" }
           },
           "displayed": true,
           "custom": true
         }
       },
       "publish": true
     }'
   ```

#### Bulk-create endpoint (preferred for multiple posts)

> **⚠️ Body shape — read this carefully. Each item in `draftPosts` is a FLAT post object: `{title, memberId, richContent, media?, ...}`. Do NOT wrap each item in a `draftPost` field.** Unlike the single-post endpoint (which uses `{draftPost: {...}}` because the request is one post), the bulk endpoint puts each post DIRECTLY inside the `draftPosts` array.

✅ **CORRECT body shape (verified against the live API — returns 200 with `results[].itemMetadata.success: true`):**

   ```json
   {
     "draftPosts": [
       { "title": "First Post",  "memberId": "...", "richContent": { /* … */ } },
       { "title": "Second Post", "memberId": "...", "richContent": { /* … */ } }
     ],
     "publish": true
   }
   ```

❌ **WRONG body shape (returns `400 Bad Request` with `draftPosts[i].title must not be empty` because the API is looking for `draftPosts[i].title` directly and finds it nested under a `draftPost` field):**

   ```json
   {
     "draftPosts": [
       { "draftPost": { "title": "First Post",  "memberId": "...", "richContent": { /* … */ } } },
       { "draftPost": { "title": "Second Post", "memberId": "...", "richContent": { /* … */ } } }
     ],
     "publish": true
   }
   ```

The natural intuition is "the bulk endpoint reuses the single-post `{draftPost: {...}}` envelope, just inside an array" — that's wrong. The bulk endpoint flattens the envelope away because the array IS the envelope. **Use the FLAT shape: `draftPosts[i]` IS the post.**

#### Full bulk-create curl example

   ```bash
   curl -X POST "https://www.wixapis.com/blog/v3/bulk/draft-posts/create" \
     -H "Authorization: <AUTH>" \
     -H "Content-Type: application/json" \
     -d '{
       "draftPosts": [
         {
           "title": "First Post",
           "memberId": "author-member-id",
           "richContent": { /* Ricos JSON — see below */ },
           "media": { "wixMedia": { "image": { "id": "mediaId" } }, "displayed": true, "custom": true }
         },
         {
           "title": "Second Post",
           "memberId": "author-member-id",
           "richContent": { /* Ricos JSON */ }
         }
       ],
       "publish": true
     }'
   ```

   The response body is `{results: [{itemMetadata: {id, originalIndex, success}}, ...]}`. Each result's `itemMetadata` carries the created post id and a `success: boolean` flag — the bulk call returns 200 even if some posts fail; check each `results[i].itemMetadata.success` individually.

   **Common URL-shape mistakes (do not use these — both return 404):**
   - `/blog/v3/draft-posts/bulk` ✗
   - `/blog/v3/draft-posts/bulk-create` ✗
   - The correct path is `/blog/v3/bulk/draft-posts/create` (note: `bulk` is a path segment between `v3` and `draft-posts`, not a suffix on `draft-posts`).

2. Structure rich content using Ricos JSON format. Reference [Ricos documentation](https://dev.wix.com/docs/api-reference/assets/rich-content/ricos-documents/introduction) for complete node structure. Common node types:
   - `PARAGRAPH` for text content
   - `HEADING` for section headers
   - `IMAGE` for embedded images (requires Wix Media ID)
   - `ORDERED_LIST` and `BULLETED_LIST` for lists
   - `BLOCKQUOTE` for quoted text
   - `LIST_ITEM` for individual list items

   **CRITICAL**: All TEXT nodes MUST be wrapped in PARAGRAPH nodes within their parent containers.

   **Correct Ricos structure example:**

   ```json
   {
     "nodes": [
       {
         "type": "PARAGRAPH",
         "nodes": [
           {
             "type": "TEXT",
             "textData": {
               "text": "This is a paragraph with some content.",
               "decorations": []
             }
           }
         ],
         "paragraphData": {}
       }
     ]
   }
   ```

   **Correct BLOCKQUOTE structure:**

   ```json
   {
     "type": "BLOCKQUOTE",
     "nodes": [
       {
         "type": "PARAGRAPH",
         "nodes": [
           {
             "type": "TEXT",
             "textData": { "text": "Quote text here", "decorations": [] }
           }
         ],
         "paragraphData": {}
       }
     ],
     "blockquoteData": { "indentation": 1 }
   }
   ```

   **Correct LIST_ITEM structure:**

   ```json
   {
     "type": "LIST_ITEM",
     "nodes": [
       {
         "type": "PARAGRAPH",
         "nodes": [
           {
             "type": "TEXT",
             "textData": { "text": "List item text", "decorations": [] }
           }
         ],
         "paragraphData": {}
       }
     ]
   }
   ```

3. For embedded images in rich content, use IMAGE nodes with Wix Media IDs:

   ```json
   {
     "type": "IMAGE",
     "nodes": [],
     "imageData": {
       "containerData": {
         "width": { "size": "CONTENT" },
         "alignment": "CENTER"
       },
       "image": {
         "src": { "id": "mediaId" },
         "width": 900,
         "height": 600
       },
       "altText": "Descriptive alt text"
     }
   }
   ```

4. Set `publish: true` to immediately publish the post rather than saving as draft.

### Part 3: Handle Categories and Tags (Optional)

1. Resolve category IDs using [List Categories](https://dev.wix.com/docs/api-reference/business-solutions/blog/category/list-categories) if user provides category names.

2. Resolve tag IDs using [Query Tags](https://dev.wix.com/docs/api-reference/business-solutions/blog/tags/query-tags) if user provides tag labels.

3. Include resolved IDs in `categoryIds` and `tagIds` arrays in the draft post object.

### IMPORTANT NOTES:

- Never mock blog posts or media IDs - always use the APIs to import images and create posts
- Always read the full documentation of methods before implementation
- External images MUST be imported via Import File API before use in blog posts - direct external URLs will not work
- For 3rd-party app integrations, `memberId` is mandatory - get it from [List Members](https://dev.wix.com/docs/api-reference/crm/members-contacts/members/member-management/members/list-members), and if the site has no members yet, create one with [Create Member](https://dev.wix.com/docs/api-reference/crm/members-contacts/members/member-management/members/create-member) (see Part 0). Never substitute a contact id, a collaborator/contributor id, or a Wix user id for a `memberId`
- Use ONLY the file ID (without `wix:image://v1/` prefix) for both cover images and embedded images
- Rich content IMAGE nodes require both `width` and `height` properties in the `image` object
- Images with `"operationStatus": "PENDING"` from import can be used immediately in blog posts
- Set `publish: true` in the request to publish immediately rather than save as draft
- For multiple posts, use Bulk Create Draft Posts API with `draftPosts` array
- Include `fieldsets: ['URL']` to get post URLs in the response
- Handle image import failures gracefully - continue without images if import fails
- Provide meaningful `displayName` values during image import for better organization
- Use appropriate Ricos node types (PARAGRAPH, HEADING, LIST, etc.) for semantic content structure
- Consider batching image imports when creating multiple posts with many images

### CRITICAL RICOS JSON STRUCTURE RULES:

- **NEVER place TEXT nodes directly in BLOCKQUOTE, LIST_ITEM, or other container nodes**
- **ALL TEXT nodes MUST be wrapped in PARAGRAPH nodes within their parent containers**
- **BLOCKQUOTE nodes must contain PARAGRAPH nodes, which contain TEXT nodes**
- **LIST_ITEM nodes must contain PARAGRAPH nodes, which contain TEXT nodes**
- **Failure to follow proper nesting will result in parsing errors: "Expected a paragraph node but found TEXT"**
- **Always validate Ricos structure before sending to ensure TEXT nodes are properly nested**

### Troubleshooting

| Error                                      | Cause                       | Solution                                                            |
| ------------------------------------------ | --------------------------- | ------------------------------------------------------------------- |
| "Missing post owner information"           | `memberId` not provided     | Add `draftPost.memberId` - see Part 0 for how to get one            |
| "memberIds ... do not exist"               | Invalid member ID           | The id is not a site member's id (e.g. a contact, contributor, or Wix user id). Re-resolve it with Part 0 |
| List Members returns `"total": 0`          | Site has no members yet     | Create the author member with Create Member - Part 0, step 2. Do not query contacts, contributors, or identity endpoints instead |
| "Expected a paragraph node but found TEXT" | Invalid Ricos structure     | Wrap TEXT nodes in PARAGRAPH nodes (see structure rules above)      |
| Image not displaying                       | Using external URL directly | Import image via Media Manager first, then use the returned file ID |

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

#### [draft-post-created](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/draft-post-created)

# Webhook: Draft Post Created
# Webhook Doc link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/draft-post-created
# Webhook Description:

Triggered when a draft post is created.
# Webhook Permissions Scopes IDs:
Read Draft Blog Posts: SCOPE.DC-BLOG.READ-DRAFT-POSTS

---

#### [com.wixpress.npm.communities.platformized.blog.v3.DraftPostService.UpdateDraftPost](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/update-draft-post)

# Package: blog
# Namespace: draftPosts
# Method: Update Draft Post
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/update-draft-post
# Method API Endpoint: PATCH https://www.wixapis.com/blog/v3/draft-posts/{draftPost.id}
## Method Code Examples

--- Code Example: UpdateDraftPost ---

### UpdateDraftPost
```javascript
```cURL
curl -X PATCH \
  'https://www.wixapis.com/blog/v3/draft-posts/448d1238-0072-4458-a280-bf81c2dd8af1' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: <AUTH>'
  -d '{
        "draftPost": {
          "title": "Places to visit in Europe"
        }
      }'
```
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "draftPost": {
    "id": "string",
    "title": "string",
    "excerpt": "string",
    "featured": "boolean",
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
    "richContent": "object",
    "status": "string",
    "moderationDetails": "object",
    "hasUnpublishedChanges": "boolean",
    "editedDate": "string<date-time>",
    "scheduledPublishDate": "string<date-time>",
    "firstPublishedDate": "string<date-time>",
    "seoData": "object",
    "url": "object",
    "createdDate": "string<date-time>",
    "seoSlug": "string",
    "media": {
      "oneOf": [
        "media"
      ]
    },
    "previewTextParagraph": "integer<int32>"
  }
}
```

--- Method Description ---
## Method Description:
Updates a draft post.
## Method Permissions:
BLOG.EDIT-DRAFT
## Method Permissions Scopes:
Manage Blog: SCOPE.DC-BLOG.MANAGE-BLOG



---

#### [business-solutions/blog/blog-business-flow](https://dev.wix.com/docs/api-reference/business-solutions/blog/blog-business-flow)

## Resource: Blog Business Flow

## Article: Blog Business Flow

## Article Link: https://dev.wix.com/docs/api-reference/business-solutions/blog/blog-business-flow

## Article Content:

# Flow: Publish a blog post

This article outlines the end-to-end flow for creating and publishing a blog post using the Blog APIs, from creating a draft post through publishing it with categories and tags.

> **Note:** On Wix sites, blog management can be handled through the [Wix Blog](https://www.wix.com/app-market/web-solution/blog).

## Before you begin

It's important to note the following before starting to code:

- A blog has a maximum limit of 100,000 posts. The size limit of a single blog post is 400KB.
- A post can be assigned to a maximum of 10 categories.
- With Pricing Plans, exclusive blog content can only be accessed by readers with a subscription.
- With Wix Multilingual, a blog can be translated into multiple languages. The `translationId` is only returned in a post object if the Multilingual app is installed.

The following diagram shows the full Blog post publishing flow.

![Blog Post Publishing Flow](https://wixmp-833713b177cebf373f611808.wixmp.com/images/1f9aea27b073e419ea075e2eebc85270.png)

The following steps describe the complete flow for creating and publishing a blog post with categories and tags.

### Step 1 | Create a draft post

Create a new blog post in draft status with the essential post details.

**Action:** Call [Create Draft Post](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/create-draft-post) to create a new blog post in draft status. Include the post title, content, and other relevant details in the request body.

<blockquote class="tip">

**Tip:**
Set `post.featured` to `true` to mark the post as featured and make it stand out on your blog.

</blockquote>

**Result:** Creates a draft post with a unique ID.

### Step 2 | Create categories for your blog (optional)

Create categories to help organize your blog posts. Categories allow you to group similar posts together and display different types of content on different pages.

**Action:** Call [Create Category](https://dev.wix.com/docs/api-reference/business-solutions/blog/category/create-category) to create categories for organizing blog posts. Call [Update Draft Post](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/update-draft-post) to assign the categories in the `draftPost.categoryIds` array.

### Step 3 | Add tags to the post (optional)

Add tags to provide additional ways to filter and organize your blog content.

**Action:** Call [Create Tag](https://dev.wix.com/docs/api-reference/business-solutions/blog/tags/create-tag) to create a tag. Call [Update Draft Post](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/update-draft-post) and include tag labels in the `draftPost.tagIds` array.

**Result:** Adds tags to the post.

### Step 4 | Publish the post

When ready, publish the post to make it available on your blog.

**Action:** Call [Publish Draft Post](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/publish-draft-post) to make the post live.

**Result:** Publishes the post. It's now visible to site visitors based on your blog's settings and any subscription restrictions.

### Step 5 | Retrieve and track the published post

After publishing, you can retrieve the post to verify it's live or track its performance metrics.

**Action:** Call [Get Post](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/get-post) to retrieve the published post details, or call [Get Post Metrics](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/get-post-metrics) to track engagement metrics such as views, likes, and comments.

**Result:** Retrieves the published post or its performance metrics. The flow is complete.

## See also

- [Draft Posts](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/introduction)
- [Posts & Stats](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/introduction)
- [Categories](https://dev.wix.com/docs/api-reference/business-solutions/blog/category/introduction)
- [Tags](https://dev.wix.com/docs/api-reference/business-solutions/blog/tags/introduction)

---

#### [working-with-rich-content](https://dev.wix.com/docs/go-headless/self-managed-headless/tutorials/other-tutorials/working-with-rich-content)

## Resource: Working with Rich Content

## Article: Working with Rich Content

## Article Link: https://dev.wix.com/docs/go-headless/self-managed-headless/tutorials/other-tutorials/working-with-rich-content

## Article Content:

# Tutorial: Working with Rich Content

Some of the data that the [JavaScript SDK](https://dev.wix.com/docs/sdk) returns, such as blog posts and database collection items, contains rich content. Rich content is enhanced text content that can include things like formatted text, link previews, images, and video.

The SDK returns rich content as complex objects. If you’re creating a headless project with a custom frontend, it can be challenging to render the objects yourself. If you build your frontend using [React](https://react.dev/), you can use the `@wix/ricos` package to render rich content objects returned by the SDK. [Ricos](https://dev.wix.com/docs/ricos/getting-started/introduction) is designed for editing and rendering rich content objects. It supports Wix rich content objects.

This tutorial explains how to use Ricos to render the rich content objects returned by the SDK. It includes examples for both the [Blog](https://dev.wix.com/docs/api-reference/business-solutions/blog/introduction) and [Data](https://dev.wix.com/docs/api-reference/business-solutions/cms/operations/introduction) modules.

This process has three steps:
1. [Retrieve your headless project's rich content using the SDK.](#step-1-retrieve-rich-content-data)
1. [Create a React component that can render rich content objects.](#step-2-create-a-rich-content-viewer-component)
1. [Add the component to your page’s code.](#step-3-render-rich-content-on-a-site)

## Before you begin

Before getting started, you need:
* A Wix site or headless project with either the Wix Blog app installed, or with at least one database collection.
* A blog post or collection item with rich content. To add rich content to a blog post, use the [Blog Post Editor](https://support.wix.com/en/article/wix-blog-writing-posts-in-wix-blog) to add things like formatted text or images to a post. Use the CMS to [add rich content](https://support.wix.com/en/article/cms-formerly-content-manager-working-with-rich-content-and-adding-it-to-a-dynamic-page) to your collection.
* [Create an OAuth app](https://dev.wix.com/docs/go-headless/authentication/about-authentication) for your headless project. Retrieve your app’s client ID. You’ll need to use it in your code.

## Step 1. Retrieve rich content data
The first step in rendering rich content is to retrieve it in your frontend code using the SDK. To do this:

1. In the terminal, run the following commands to install the necessary SDK packages:
    * **SDK:** `yarn add @wix/sdk`
    * **Blog** (if you’re retrieving Blog content): `yarn add @wix/blog`
    * **Data** (if you’re retrieving CMS content): `yarn add @wix/data`
1. Create a new file in your project called `rich-content-api.js`.
1. At the top of your file, add the following import statements.
    ```javascript
     import { createClient, OAuthStrategy } from '@wix/sdk';
    //If you’re retrieving Blog content:
    import { posts } from '@wix/blog';
    //If you’re retrieving CMS content:
    import { items } from '@wix/data';
    ```
1. Create an [SDK client](https://dev.wix.com/docs/sdk/articles/set-up-a-client/about-the-wix-client) by adding the following code to your code file. Fill in the value for your client ID, which can be found in your project's [**Headless Settings**](https://www.wix.com/my-account/site-selector/?buttonText=Select%20Site&title=Select%20a%20Site&autoSelectOnSingleSite=true&actionUrl=https:%2F%2Fwww.wix.com%2Fdashboard%2F%7B%7BmetaSiteId%7D%7D%2Foauth-apps-settings). Adjust the value of `modules` if you are only working with Blog or CMS:
    ```javascript
    const wixClient = createClient({
      auth: OAuthStrategy({
      clientId: '<your-client-id>'
      }),
      modules: { posts, items },
    });
    ```
1. Add a function to your file called `getRichContent`. This function retrieves the rich content data from your project.
   <details>
   <summary>To retrieve collection items</summary>

   Use the SDK Data module’s [`query`](https://dev.wix.com/docs/sdk/business-solutions/data/items/query) method to retrieve your project’s CMS items. You can use the [query builder](https://dev.wix.com/docs/sdk/business-solutions/data/items/wix-data-query/introduction) to refine your results.

   Example code:
   ```javascript
   export async function getRichContent() {
     const queryResults = await wixClient.items.query('MyCollectionName').find();
     return queryResults.items[0].myRichContentField;
   }
   ```
   </details>

   <details>
   <summary>To retrieve blog posts</summary>

   Use the SDK Blog module’s [`queryPosts`](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/query-posts) method to retrieve your project’s blog posts. You must specify `{fieldsets: ["RICH_CONTENT"]}` in your `queryPosts()` call. You can use the [query builder](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/query-posts) to refine your results.

   Example code:
   ```js
   export async function getRichContent() {
     const queryResults = await wixClient.posts.queryPosts({fieldsets: ["RICH_CONTENT"]}).find();
     return queryResults.items[0].richContent;
   }
   ```
   </details>

## Step 2. Create a rich content viewer component
The next step is to create a React component that uses the `@wix/ricos` package to display rich content objects. The package includes a `RicosViewer` React component that can render rich content objects. The component doesn't support all content types by default. For some content types, you must enable the relevant [Ricos plugin](https://dev.wix.com/docs/ricos/getting-started/introduction#plugins). In our code, we'll import and use the `quickStartViewerPlugins` function to enable all plugins.

The viewer generates a React class component with the rendered rich content. This means you can only work with this component in client code. If your project supports [React Server Components](https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-server-components), make sure to add `"use client"` at the top of your code file.

To create your component:

1. Install the `@wix/ricos` package and its dependencies.

    ```bash
    yarn add @wix/ricos
    ```
1. Create a new file in your project called `RichContentViewer.jsx`.
1. Add `"use client"` to the top of the file if needed. See the introduction to this section for details.
1. Import `React`, the Ricos viewer package, `quickStartViewerPlugins`, and the plugins css file.
   ```javascript
   import React from "react";
   import { quickStartViewerPlugins, RicosViewer } from '@wix/ricos';
   import '@wix/ricos/css/all-plugins-viewer.css';
   ```
1. Create an array of initialized plugin objects using `quickStartViewerPlugins()`.

   ```javascript
   const plugins = quickStartViewerPlugins();
   ```

   > **Note:** If you don't want to enable every plugin, import only the plugins you want to enable, and then include them specifically in the `plugins` array.
   >
   > <details>
   > <summary>Example: Enable only the Divider and Heading plugins</summary>
   > <ol>
   >   <li>
   >     Import <code>pluginDivider</code> and <code>pluginHeading</code> instead of <code>quickStartViewerPlugins</code> from <code>'@wix/ricos'</code>:
   >     <pre><code class="language-javascript">import { pluginDivider, pluginHeadings, RicosViewer } from '@wix/ricos';</code></pre>
   >   </li>
   >   <li>
   >     Create an array of initialized plugin objects:
   >     <pre><code class="language-javascript">const plugins = [pluginDivider(), pluginHeadings()];</code></pre>
   >   </li>
   > </ol>
   > </details>

1. Create a React component called `RichContentViewer` that accepts `content` as a prop and returns a `RicosViewer` component with `content` and the `plugins` array from the previous step passed in as props. Export the component.
   ```js
   const RichContentViewer = ({ content }) => {
     return <RicosViewer content={content} plugins={plugins} />;
   };
   export default RichContentViewer;
   ```

## Step 3. Render rich content on a site
The final step is to create a React component that uses the code from the previous sections to retrieve rich content and display it on a page. If you’re working in a framework like Next.js, this component would probably be a React Server Component defined in the code file for a particular page on your site.

To create this component, do the following:

1. Add the following import statements to your file. Make sure to include the correct paths to your `rich-content-api` and `RichContentViewer` files.
   ```javascript
   import React from "react";
   import RichContentViewer from "./RichContentViewer";
   import { getRichContent } from "./rich-content-api";
   ```

1. Create a component called `RichContent` that uses your `getRichContent` function to retrieve your content, and then passes the result to your `RichContentViewer` component.
   ```javascript
   async function RichContent() {
     const richContent = await getRichContent();
     return (
       <div>
         <div>Your rich content:</div>
         <RichContentViewer content={richContent}/>
       </div>
     );
   }
   ```

1. Export another component called `Page` that includes your `RichContent` component. In a real site, this component would likely include other elements of your page.
   ```js
   export default function Page() {
     return (
       <RichContent />
     );
   }
   ```

## Example code

### rich-content-api.js

```js
import { createClient, OAuthStrategy } from '@wix/sdk';
import { items } from '@wix/data';


const wixClient = createClient({
  auth: OAuthStrategy({
    clientId: '<your-client-id>'
  }),
  modules: { items },
});

export async function getRichContent() {
  const queryResults = await wixClient.items.query('MyCollectionName').find();
  return queryResults.items[0].myRichContentField;
}
```

### RichContentViewer.jsx

```js
"use client";
import React from "react";
import { quickStartViewerPlugins, RicosViewer } from '@wix/ricos';

const plugins = quickStartViewerPlugins();

const RichContentViewer = ({ content }) => {
  return <RicosViewer content={content} plugins={plugins} />;
};

export default RichContentViewer;
```

### page.jsx
```js
import React from "react";
import RichContentViewer from "@/app/components/RichContentViewer/RichContentViewer";
import { getRichContent } from "@/app/model/rich-content-api";


async function RichContent() {
  const richContent = await getRichContent();
  return (
      <div>
        <RichContentViewer content={richContent}/>
      </div>
  );
}

export default function Page() {
    return (
        <RichContent />
    );
}
```
You now have a basic app that can render rich content using React. For more information about working with the SDK, see the [SDK Reference](https://dev.wix.com/docs/sdk).

---

#### [draft-post-updated](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/draft-post-updated)

# Webhook: Draft Post Updated
# Webhook Doc link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/draft-post-updated
# Webhook Description:

Triggered when a draft post is updated.
# Webhook Permissions Scopes IDs:
Read Draft Blog Posts: SCOPE.DC-BLOG.READ-DRAFT-POSTS

---

#### [com.wixpress.npm.communities.platformized.blog.v3.DraftPostService.PublishDraftPost](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/publish-draft-post)

# Package: blog
# Namespace: draftPosts
# Method: Publish Draft Post
# Method link: https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/publish-draft-post
# Method API Endpoint: POST https://www.wixapis.com/blog/v3/draft-posts/{draftPostId}/publish
## Method Code Examples

--- Code Example: PublishDraftPost ---

### PublishDraftPost
```javascript
```cURL
curl -X POST \
 'https://www.wixapis.com/blog/v3/draft-posts/894a58a2-dc75-422d-9ca6-00a489750dfd/publish' \
 -H 'Content-Type: application/json' \
 -H 'Authorization: <AUTH>'
```
```
--- Method Response Shape ---

## Method Response Shape

```json
{
  "postId": "string<GUID>"
}
```

--- Method Description ---
## Method Description:
Publishes a draft post by ID. This creates a new [post](https://dev.wix.com/docs/rest/business-solutions/blog/posts-stats/post-object)
with the data from the draft post.

If the draft post was already published, the published post will be updated with the latest values
from the draft post.
## Method Permissions:
BLOG.PUBLISH-POST
## Method Permissions Scopes:
Manage Blog: SCOPE.DC-BLOG.MANAGE-BLOG
## Additional Method Code Examples

--- Code Example: HTTP request example ---

### HTTP request example
```javascript
(async () => {
      const response = await fetch("https://www.wixapis.com/blog/v3/draft-posts/a855f213-4380-4b6b-969d-54e2a3f394db/publish", {
        method: "POST",
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
## Method Schema Summary:
This API method `publishDraftPost` is a POST request to `/blog/v3/draft-posts/{draftPostId}/publish`. It publishes a draft post identified by `draftPostId`. The response includes the `postId` of the published post, which is a string in GUID format.

**Questions and Answers:**

1.  **What does the `publishDraftPost` method do?**
    It publishes a draft post by its ID.
2.  **What is the HTTP method for `publishDraftPost`?**
    The HTTP method is POST.
3.  **What is the URL endpoint for publishing a draft post?**
    The URL is `/blog/v3/draft-posts/{draftPostId}/publish`.
4.  **What information is returned after publishing a draft post?**
    The `postId` of the published post is returned.
5.  **What is the format of the returned `postId`?**
    The `postId` is a string in GUID format.

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

#### [business-solutions/blog/introduction](https://dev.wix.com/docs/api-reference/business-solutions/blog/introduction)

## Resource: Introduction

## Article: Introduction

## Article Link: https://dev.wix.com/docs/api-reference/business-solutions/blog/introduction

## Article Content:

# About the Blog APIs

The Blog APIs allow users to create and manage blogs. Wix users can create and manage posts, draft posts, categories and tags on their blog page. Site collaborators can also create and manage blogs, given the appropriate [roles and permissions](#blog-roles).

With the Blog APIs, you can: 
- Create and manage [posts](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/introduction) and [draft posts](https://dev.wix.com/docs/api-reference/business-solutions/blog/draft-posts/introduction).
- Assign [categories](https://dev.wix.com/docs/api-reference/business-solutions/blog/category/introduction) to posts and draft posts, as well as update and remove them. 
- Add [tags](https://dev.wix.com/docs/api-reference/business-solutions/blog/tags/introduction) to posts and draft posts, as well as remove them. 

Learn more about [Wix Blog](https://support.wix.com/en/article/wix-blog-about-the-wix-blog).

## Before you begin
It’s important to note the following before starting to code:

+ A blog has a maximum limit of 100,000 posts. The size limit of a single blog post is 400KB.

+ With [Pricing Plans](https://dev.wix.com/docs/rest/business-solutions/pricing-plans/introduction), exclusive blog content can only be accessed by readers with a subscription. Learn more about [creating blog post subscriptions](https://support.wix.com/en/article/wix-blog-creating-blog-post-subscriptions).

+ With [Wix Multilingual](https://support.wix.com/en/article/wix-multilingual-an-overview), a blog can be translated into multiple languages. Learn more about [translating a blog](https://support.wix.com/en/article/wix-multilingual-translating-your-blog).

  > Note: `translationId` is only returned in a post object if the [Multilingual app](https://www.wix.com/app-market/web-solution/wix-multilingual) is installed.

## Sample use cases
+ [Send emails to blog subscribers with the latest blog posts](https://dev.wix.com/docs/rest/business-solutions/blog/sample-flows#periodically-send-an-email-with-latest-posts-to-blog-subscribers)
+ [Create and send out social media posts when a new blog post is marked as featured](https://dev.wix.com/docs/rest/business-solutions/blog/sample-flows#send-out-a-social-media-post-when-a-new-blog-post-is-marked-as-featured)
<!-- + Mirror a blog on another site -->

## Blog roles
Collaborators can create and manage blogs based on certain roles: 
- **Blog editor:** Can fully manage a blog, but not other areas of a site.
- **Blog writer:** Can create and publish their own posts on a blog.
- **Guest writer:** Can create posts, but can't publish them.
- **Managed writer:** Can't create posts, but a Wix user can attribute posts to them.

For more information, see [Blog roles and their associated permissions](https://support.wix.com/en/article/wix-blog-adding-writers-and-editors-in-wix-blog#blog-roles-and-their-associated-permissions).

## Terminology
- **Post**: A published article on a blog. It is also referred to as a publication. A blog can have up to 100,000 posts. 
- **Draft Post**: An article written by a Wix user, blog editor, blog writer, or a guest writer that is not yet published.
- **Category**: A grouping of similar and related posts. A post can be assigned to a maximum of 10 categories.
- **Tag**: A way to further sort and organize blog posts. Tags provide the ability to filter a blog's articles.