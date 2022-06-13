import axios from 'axios';
import fs from 'fs';
import im from 'imagemagick';
import path from 'path';

import {logger} from './logger';
import newspapers from './newspapers.json';

export const NEWSPAPER_BASE_URL = 'https://cdn.freedomforum.org/dfp/pdf{DAY_OF_MONTH}/';
export const NEWSPAPAPER_CACHE_PATH = path.resolve(__dirname, './newspaper-cache');

export const downloadFile = async (url: string, path: string) => {
  try {
    const response = await axios(url, {
      responseType: 'arraybuffer',
    });
    await fs.writeFileSync(path, response.data);
  } catch (error: any) {
    // gracefully fail if a file fails to download
    logger(`Failed: ${error.message}`, {sentiment: 'negative', processLevel: 2});
  }
};

export const getDirectoryContents = async (dir: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) reject(err);
      resolve(files.filter(file => file !== 'jpgs' && file.startsWith('.') === false));
    });
  });
};

export const clearDirectory = async (dir: string) => {
  const files = await getDirectoryContents(dir);
  for (const file of files) {
    fs.unlink(path.join(dir, file), err => {
      if (err) throw err;
    });
  }
};

export const downloadNewspaperPDFs = async () => {
  const date = new Date();
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();

  for (const newspaper of newspapers) {
    logger(`Downloading ${newspaper.name}`);
    await downloadFile(
      NEWSPAPER_BASE_URL.replace('{DAY_OF_MONTH}', `${dayOfMonth}`) + newspaper.url,
      `${NEWSPAPAPER_CACHE_PATH}/${newspaper.shortname}_${month}_${dayOfMonth}.pdf`
    );
  }
};

export const getImageProperties = async (file: string): Promise<im.Features> => {
  return new Promise((resolve, reject) => {
    im.identify(file, async (err, features) => {
      if (err) reject(err);
      resolve(features);
    });
  });
};

export const convertImage = async (inputFile: string, outputFile: string) => {
  return new Promise((resolve, reject) => {
    im.convert(['-density', '225', inputFile, outputFile], async err => {
      if (err) reject(err);
      resolve(true);
    });
  });
};

export const cropImage = async (file: string, width: number, height: number) => {
  return new Promise((resolve, reject) => {
    im.convert(['-gravity', 'North', '-crop', `${width}x${height}+0+0`, file, file], async err => {
      if (err) reject(err);
      resolve(true);
    });
  });
};

export const processPdf = async (inputFile: string, convertedFileName: string) => {
  await convertImage(inputFile, convertedFileName);

  const desiredAspectRatio = 16 / 9;
  const threshholdForRatioEnforcement = 0.04; // meural will crop the image which is probably fine, but not beyond 4%

  const imageProperties = await getImageProperties(convertedFileName);

  const imageWidth = imageProperties.width || 0;
  const imageHeight = imageProperties.height || 0;

  if (
    1 - Math.abs(imageWidth * desiredAspectRatio) / Math.abs(imageHeight) >
    threshholdForRatioEnforcement
  ) {
    logger(`Image needs cropping`, {processLevel: 2});
    await cropImage(convertedFileName, imageWidth, imageWidth * desiredAspectRatio);
    logger(`Complete`, {processLevel: 3, sentiment: 'positive'});
  }
};
