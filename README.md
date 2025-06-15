## Welcome to meural-newspapers!
The goal of this project is to fetch newspaper front pages every morning to display on a Meural frame

### Prerequisites
* ImageMagick must be installed on the system, the node package included in this project is just a wrapper. Install via brew or other package manager.

### To get started
* Copy the config example, and fill in your Meural credentials: `cp config.example.json config.json`
* Run `npx tsc && node index.js` to compile and run (for now)

Authentication now uses Amazon Cognito, mirroring the official Meural login flow.

