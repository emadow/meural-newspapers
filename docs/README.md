# Meural Newspapers
I put together a project that fetches print editions of my favorite newspapers every morning and showcases them on a frame, rotating throughout the day.

https://user-images.githubusercontent.com/490190/174654390-c0c13f09-4ae3-43f6-a76f-608483b9554d.mp4

_Demo of the project, cycling through content manually with gestures_

## Background
I’d categorize myself as an amatuer news junkie. I take frequent news breaks during the day and scan headlines of a myriad of publications, diving into interesting ones in the mornings and evenings. I’ve found myself particularly interested in how news is covered. During notable news events—e.g. 9/11, election nights, Jan 6th—I irritatingly flip back and forth between networks to see how differing coverage unfolds.

Newspapers are interesting in that they wholly shape the narrative of the notable events that the reader should care about. For the large number of individuals who primarily consume news from a single source, that impact is profound. I find it somewhat fascinating looking at front pages of various newspapers to see distinct culminations of each news organization’s consideration of what’s newsworthy on that day. 

## Inspiration
One of my favorite museums is the (unfortunately now defunct) Newseum in Washington D.C. A daily refreshed exhibit they had was a wall of newspapers—showcasing front pages from publications across America and around the world. They have an online archive of collections from exceptionally notable news days.

![31967097837_9169e69c13_k](https://user-images.githubusercontent.com/490190/174648437-fba3a420-d747-4aed-a45b-c0261ec4efe7.jpg)
_The Newseum’s Today’s Front Pages Exhibit_

I wanted to recreate a version of this experience in some way at home so that I could start every morning looking at key front pages—and also frame these pieces as ephemeral art.

## Building the System
I had a Meural (now owned by Netgear) frame, a product that displays artwork—mostly paintings and photos—via a subscription service. It’s a neat idea, but I always struggled to find art that spoke to me and looked good enough to display as a centerpiece in my home. Meural has a matte display and auto-adjusts brightness to make its contents blend in with the room and appear less as a screen. It was a perfect device to use to display newspaper front pages.

To make this all work, I wrote an app in node to handle fetching, preparing and pushing content to the frame. To ensure the process runs each morning at 4am, the app executes via a cron job from my trusty raspberry pi:

![IMG_5786 2](https://user-images.githubusercontent.com/490190/174648605-943af800-5996-43f5-8243-35916141e7b3.jpeg)

### Getting the Content
As a longtime New York Times subscriber, I was aware that a PDF of the front page was available daily from the Today’s Paper link on nytimes.com. I was curious if other major publications did the same, and after a quick Google search, I learned that a foundation called the Freedom Forum aggregates front pages from 520 participating publications across the world. This was huge!

Programmatically fetching the front pages from the Freedom Forum is a trivial task. The filename slugs remains constant (e.g. WSJ, CA_SFC, DC_WP), and the path is predictable since there’s just one dynamic element corresponding to the day of the month. I’ve found some of these papers don’t post weekend editions, so we need to fail gracefully when any of these 404.

In my project, you can manage your newspaper rotation via a json config. I’ve picked 6 papers as a default.

### Preparing the Front Pages
The Freedom Forum offered front page images at a fairly low resolution in JPG format, certainly not suitable for reading. Amazingly, there are PDF versions which meant that we had infinitely scalable vector text that we could play with.

The Meural doesn’t support PDFs (I mean, why would it), so we need to rasterize the PDFs into a high quality image format. Since forever, I’ve been using ImageMagick for projects that involve image manipulation from a CLI. It seemed like a suitable library this time too. The conversion part is simple. To balance file size and quality, I ended up setting the source to a 225ppi density before exporting.

```ts
export const convertImage = async (inputFile: string, outputFile: string) => {
 return new Promise((resolve, reject) => {
   im.convert(['-density', '225', inputFile, outputFile], async err => {
     if (err) reject(err);
     resolve(true);
   });
 });
};
```

One problem: the aspect ratio of the Meural was 16:9 (well, 9:16 since it was oriented vertically), and some of these front pages are too long. After determining which images need to be cropped, we just want to truncate the bottoms since a center-oriented crop would chop bits from the both sides (and result in an awkward framing).

![Meural Newspaper](https://user-images.githubusercontent.com/490190/174933257-746eff65-51f3-425a-a6d3-060585b65dd7.jpg)


This, too, is pretty easy to handle using ImageMagick:

```ts
export const cropImage = async (file: string, width: number, height: number) => {
 return new Promise((resolve, reject) => {
   im.convert(['-gravity', 'North', '-crop', `${width}x${height}+0+0`, file, file], async err => {
     if (err) reject(err);
     resolve(true);
   });
 });
};
 
const desiredAspectRatio = 16 / 9;
const threshholdForRatioEnforcement = 0.04; // meural will crop the image which is probably fine, but not beyond 4%
 
const imageProperties = await getImageProperties(convertedFileName);
const imageWidth = imageProperties.width;
const imageHeight = imageProperties.height;
 
if (
 1 - Math.abs(imageWidth * desiredAspectRatio) / Math.abs(imageHeight) >
 threshholdForRatioEnforcement
) {
 await cropImage(convertedFileName, imageWidth, imageWidth * desiredAspectRatio);
}
```

### Pushing content to the Meural
The Meural frame allows for user uploads through a website and mobile app. I had hoped that, through a little bit of client spoofing, I’d be able to use their internal APIs directly. To my surprise, no trickery is actually needed. Amazingly, a blessed soul somewhere in the world thoroughly documented these APIs. That saved me hours of work inspecting traffic and/or setting up a proxy. 

Essentially, after a Meural user gets authenticated, a specified playlist (gallery) gets emptied or created if it doesn’t exist. We then iterate over converted images and upload them sequentially, adding each one to the gallery. Upon completion, we force a sync of the cloud-hosted content and the device’s local storage.

While my app currently supports a single Meural frame as defined in the configuration, it wouldn’t take too much effort to extend it to support multiple devices. Maybe in the future, I’ll set up a gallery wall in a larger room. 
