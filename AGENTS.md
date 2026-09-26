# MVP Template Agent Instructions

This is a Cloudflare Worker and React template. Keep example infrastructure and configuration generic; do not put account identifiers, tokens, or application data into the template. Read `README.md`, `wrangler.toml`, and the affected route or UI module before changing a feature.

Use the repository scripts for local work: `npm install`, then `npm run type-check`, `npm run lint`, `npm test`, and `npm run build` as the changed surface warrants. `npm run worker:dev` starts a local Worker. `npm run worker:deploy` and direct Wrangler resource or D1 commands mutate a Cloudflare account, so keep their mutation and resulting readback separate from local validation.

Preserve the current checkout and unrelated work. Once a task authorizes a change, complete it through proportionate local validation and make routine reversible choices without waiting. Pause for a material unresolved data, secret, billing, or production decision.
