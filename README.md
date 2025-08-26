# Meural Newspapers

Fetches newspaper front pages each morning and uploads them to a Meural digital frame.

## Getting Started

1. **Install prerequisites**
   - [Node.js](https://nodejs.org/) and npm
   - [ImageMagick](https://imagemagick.org/) for PDF to image conversion

2. **Run the setup script**
   ```sh
   npm run setup
   ```
   This installs dependencies, compiles the TypeScript sources and creates a `config.json` file if one doesn't exist.

3. **Configure credentials**
   Update `config.json` with your Meural email, password, device alias and gallery name.

4. **Fetch and upload today's newspapers**
   ```sh
   npm start
   ```

## How it Works

- `newspapers.ts` downloads PDF front pages from the Freedom Forum and converts them into images.
- Image transformation and aspect ratio enforcement are handled with [ImageMagick](https://imagemagick.org/).
- Authentication mirrors the official Meural login flow using Amazon Cognito (`@aws-sdk/client-cognito-identity-provider`).
- The `meural.ts` client manages gallery creation, image uploads and pushing content to your device.
- Concurrency is controlled with `p-limit`, and network requests are performed with `axios`.
- Logging output is centralized through `logger.ts`.

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
