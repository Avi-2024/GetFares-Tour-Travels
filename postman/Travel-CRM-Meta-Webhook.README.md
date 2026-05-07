# Travel CRM Meta Webhook

Import both files.

- `postman/Travel-CRM-Meta-Webhook.postman_collection.json`
- `postman/Travel-CRM-Meta-Webhook.postman_environment.json`

Fill these variables:

- `baseUrl`
- `metaAccessToken`
- `metaLeadgenId`
- `metaPageId`
- `metaFormId`
- `metaAdId`

Run order:

1. `Fetch Lead Details`
2. `Verify Webhook`
3. `Simulate Leadgen Webhook`

CRM webhook route:

- `GET /webhook/meta`
- `POST /webhook/meta`

Meta callback URL:

- `https://<your-domain>/webhook/meta`
