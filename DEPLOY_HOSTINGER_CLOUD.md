# Deploying Lifeschool to Hostinger Cloud Startup

## Deployment Target

| Setting | Value |
|---|---|
| Repository | `https://github.com/Argeer78/life-school` |
| Branch | `main` |
| Repository root | repository checkout root |
| Deployment root | repository root (`.`) |
| Framework preset | `Express.js` |
| Node.js version | `22.x` |
| Package manager | `npm` |
| Install command | `npm install` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Build output directory | `platform/steward-app/dist` |
| Entry file | `app.js` |
| Health endpoint | `/health` |

The application remains in `platform/steward-app`. The repository root is a
conventional Express.js deployment wrapper with direct dependency metadata,
install/build/start scripts, a lockfile, and a committed `app.js`.

`app.js` delegates every request to the unchanged Steward production HTTP
handler. Express exists only at the hosting boundary so Hostinger can recognize
the repository as a supported backend framework.

Use the repository root in Hostinger. Initial Git detection happens before
Hostinger exposes all advanced build settings, so relying only on the nested
application manifest can produce “Unsupported framework or invalid project
structure.”

Hostinger supports Node.js applications on Cloud Startup and provides an
`Other` preset for applications that do not match one of its named
frameworks. Its deployment settings support a project root, Node.js version,
build command, start command, output directory, entry file, and environment
variables.

## Production Build

`npm run build`:

1. clears the previous `dist` directory;
2. compiles the TypeScript and checked JavaScript sources;
3. emits the production server;
4. copies the learner and developer HTML/CSS assets;
5. includes the English and Greek locale catalogs.

`npm start` launches the compiled production entrypoint with Node.js. It does
not use `tsx`, `.env.local`, or the development server command.

The production server:

- listens on `0.0.0.0` by default;
- uses `PORT` when supplied;
- defaults to port `3000`;
- exposes `GET /health`;
- uses the same production application pipeline as the local application.

## Environment Variables

Add production values in hPanel under the Node.js application's environment
variables. Do not commit `.env.local`, `.env`, or API keys.

| Variable | Required | Production value or purpose |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `HOST` | No | Defaults to `0.0.0.0` |
| `PORT` | No | Defaults to `3000`; use Hostinger's assigned value if one is provided |
| `STEWARD_PROVIDER` | Yes | `openai` for the configured OpenAI provider, or `fake` only for an intentional local-demo deployment |
| `OPENAI_API_KEY` | When `STEWARD_PROVIDER=openai` | Secret OpenAI API key, entered only in hPanel |
| `OPENAI_MODEL` | No | Defaults to `gpt-5.4-mini` |
| `OPENAI_TIMEOUT_MS` | No | Defaults to `30000` |

The committed `.env.example` lists every supported deployment variable without
including credentials.

## First Deployment Checklist

1. Confirm the intended release commit is pushed to `main`.
2. In hPanel, choose **Add Website → Node.js Apps → Import Git Repository**.
3. Select `Argeer78/life-school` and branch `main`.
4. Keep the root directory at the repository root (`.`).
5. Confirm Hostinger detects the **Express.js** framework preset.
6. Select Node.js `22.x`.
7. Confirm the package manager is `npm`.
8. Set the install command to `npm install`.
9. Set the build command to `npm run build`.
10. Set the start command to `npm start`.
11. If requested, set the output directory to
    `platform/steward-app/dist` and entry file to `app.js`.
12. Add the production environment variables in hPanel.
13. Deploy and inspect the build log for successful install, build, and start.
14. Open `https://<deployment-domain>/health` and confirm:

    ```json
    {"status":"ok"}
    ```

15. Verify `/learn`, `/courses`, English/Greek switching, and one learner-safe
    response.
16. Confirm DevTools routes are available only under the intended deployment
    access policy.

## Rollback Procedure

Git deployment follows the selected branch. Roll back with a traceable Git
revert rather than rewriting branch history:

1. identify the last known-good deployment commit;
2. identify the commit or merge that introduced the deployment failure;
3. run `git revert <failing-commit>` locally;
4. review the revert;
5. push the revert commit to `main`;
6. allow Hostinger's Git integration to redeploy, or choose
   **Settings and redeploy** in hPanel;
7. confirm `/health`, `/learn`, and a learner-safe response;
8. retain both the failed and reverted deployment logs for examination.

If a deployment fails before becoming active, leave the existing deployment in
place, correct the configuration or code on a new commit, and redeploy. Do not
commit secrets or force-push `main` as a rollback mechanism.

## Official Hostinger References

- [Add a Node.js Web App in Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/)
- [Select a Node.js version](https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/)
- [Troubleshoot failed Node.js builds](https://www.hostinger.com/support/fix-failed-to-build-application-error-hostinger-node-js/)
- [Redeploy a Node.js application](https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/)
