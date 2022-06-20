## Test 123!
Just testing

```tsx
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
