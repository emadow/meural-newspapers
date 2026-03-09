# Meural Newspapers

Meural Newspapers is an automation app that fetches daily newspaper front pages, prepares each page for Meural's display format, and publishes the images to a Meural frame gallery.

## Quick Start

1. **Run the setup script**
   ```sh
   npm run setup
   ```

   The setup script (`setup.sh`) now performs a complete environment bootstrap:
   - ensures **Node.js v18.19.0** is installed (via `nvm` on macOS/Linux)
   - ensures **ImageMagick 6.9.11-60** is installed (pinned version)
   - installs project dependencies with `npm install --legacy-peer-deps`
   - creates `config.json` from `config.example.json` when missing
   - compiles TypeScript with `npx tsc`

   > On Windows, Node/ImageMagick are not auto-installed by the script yet; install them manually and rerun.

2. **Configure your Meural settings**

   Open `config.json` and set:
   - `meural_email`
   - `meural_password`
   - `meural_device_alias` (optional fallback to first device if omitted)
   - `meural_gallery_name`
   - `concurrent_downloads`
   - `concurrent_image_processing`

3. **Run the app**
   ```sh
   npm start
   ```

## Application Flow

When you run `npm start`, the app executes a full ingest-and-publish pipeline:

1. Clears local working folders in `newspaper-cache/`
2. Downloads today's front-page PDFs for all newspapers in `newspapers.json`
3. Converts each PDF to JPG
4. Enforces a Meural-friendly 16:9 framing rule (crop/extend only when needed)
5. Authenticates to Meural
6. Finds or creates the configured gallery
7. Removes previous gallery images
8. Uploads new images and pushes the gallery to the target frame

## Project Components

- **`index.ts` (orchestrator)**  
  Coordinates the full workflow: cache cleanup, PDF processing, Meural auth, gallery maintenance, and device push.

- **`newspapers.ts` (download + image processing)**  
  Builds dated newspaper PDF URLs, downloads files, converts PDFs to JPG via ImageMagick, and applies aspect-ratio correction logic.

- **`newspapers.json` (newspaper catalog)**  
  Source list of newspapers to fetch each day.

- **`meural.ts` (Meural API client)**  
  Handles Cognito authentication and all Meural API calls for devices, galleries, item upload, deletion, and gallery push.

- **`logger.ts` (structured console logging)**  
  Produces readable process logs with simple nesting and sentiment indicators.

- **`setup.sh` (environment bootstrap)**  
  Installs pinned runtime/tooling dependencies and compiles the app.

## Automating with Cron

To keep your frame up to date automatically, schedule the script with cron.

1. Open your crontab editor:
   ```sh
   crontab -e
   ```

2. Add a job to run the script at your desired time. For example, to run every day at 6:00 AM:
   ```cron
   0 6 * * * cd /path/to/meural-newspapers && npm start >> /var/log/meural-newspapers.log 2>&1
   ```
   This navigates to the project directory and runs `npm start`, appending output to a log file.

   Another example, running at 7:30 AM on weekdays:
   ```cron
   30 7 * * 1-5 cd /path/to/meural-newspapers && npm start >> /var/log/meural-newspapers.log 2>&1
   ```

Enjoy seeing fresh headlines on your Meural frame every day!
