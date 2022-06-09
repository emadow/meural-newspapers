import fetch from 'node-fetch';
import fs from 'fs';
import im from 'imagemagick';
import path from 'path';

import newspapers from './newspapers.json';

const NEWSPAPER_BASE_URL = 'https://cdn.freedomforum.org/dfp/pdf{DAY_OF_MONTH}/';
const NEWSPAPAPER_CACHE_PATH = './newspaper-cache';

const downloadFile = (url: string, path: string) => {
  return fetch(url)
    .then(res => res.buffer())
    .then(buffer =>
      fs.writeFile(path, buffer, err => {
        if (err) {
          console.log(err);
          return;
        }
      })
    )
    .catch(function (err) {
      // gracefully handle download issues
      console.log(err);
    });
};

const getDirectoryContents = async (dir: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) reject(err);
      resolve(files.filter(file => file !== 'jpgs' && file.startsWith('.') === false));
    });
  });
};

const clearDirectory = async (dir: string) => {
  const files = await getDirectoryContents(dir);
  for (const file of files) {
    fs.unlink(path.join(dir, file), err => {
      if (err) throw err;
    });
  }
};

const downloadNewspaperPDFs = async () => {
  const date = new Date();
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();

  for (const newspaper of newspapers) {
    await downloadFile(
      NEWSPAPER_BASE_URL.replace('{DAY_OF_MONTH}', `${dayOfMonth}`) + newspaper.url,
      `${NEWSPAPAPER_CACHE_PATH}/${newspaper.shortname}_${month}_${dayOfMonth}.pdf`
    );
  }
};

const getImageProperties = async (file: string): Promise<im.Features> => {
  return new Promise((resolve, reject) => {
    im.identify(file, async (err, features) => {
      if (err) reject(err);
      resolve(features);
    });
  });
};

const convertImage = async (inputFile: string, outputFile: string) => {
  return new Promise((resolve, reject) => {
    im.convert(['-density', '300', inputFile, outputFile], async err => {
      if (err) reject(err);
      resolve(true);
    });
  });
};

const cropImage = async (file: string, width: number, height: number) => {
  return new Promise((resolve, reject) => {
    im.convert(['-crop', `${width}x${height}+0+0`, file, file], async err => {
      if (err) reject(err);
      resolve(true);
    });
  });
};

const processPdf = async (inputFile: string, convertedFileName: string) => {
  await convertImage(inputFile, convertedFileName);

  const ratioMagicNumber = 1.77777; // 16x9
  const threshholdForRatioEnforcement = 0.07; // 7%

  const imageProperties = await getImageProperties(convertedFileName);

  const imageWidth = imageProperties.width || 0;
  const imageHeight = imageProperties.height || 0;

  if (
    1 - Math.abs(imageWidth * ratioMagicNumber) / Math.abs(imageHeight) >
    threshholdForRatioEnforcement
  ) {
    console.log(`${convertedFileName} is not close to a 16x9 image, cropping`);
    await cropImage(convertedFileName, imageWidth, imageWidth * ratioMagicNumber);
  }
};

(async function () {
  await clearDirectory(NEWSPAPAPER_CACHE_PATH);
  await clearDirectory(NEWSPAPAPER_CACHE_PATH + '/jpgs');
  await downloadNewspaperPDFs();

  const pdfs = await getDirectoryContents(NEWSPAPAPER_CACHE_PATH);

  for (const pdf of pdfs) {
    await processPdf(
      `${NEWSPAPAPER_CACHE_PATH}/${pdf}`,
      `${NEWSPAPAPER_CACHE_PATH}/jpgs/${pdf.replace('.pdf', '.jpg')}`
    );
  }

  // 16x9 ratio is 1.77777
})();
