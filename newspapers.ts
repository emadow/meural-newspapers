import axios from 'axios';
import fs from 'fs';
import im from 'imagemagick';
import path from 'path';
import pLimit from 'p-limit';

import {logger} from './logger';
import config from './config.json';
import newspapers from './newspapers.json';

export const NEWSPAPER_BASE_URL = 'https://cdn.freedomforum.org/dfp/pdf{DAY_OF_MONTH}/';
export const NEWSPAPAPER_CACHE_PATH = path.resolve(__dirname, './newspaper-cache');

export const downloadFile = async (url: string, path: string) => {
  logger(`Downloading ${url}`);
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

  const papersToDownload = [];
  const limit = pLimit(config.concurrent_downloads);

  for (const newspaper of newspapers) {
    papersToDownload.push(
      limit(() =>
        downloadFile(
          NEWSPAPER_BASE_URL.replace('{DAY_OF_MONTH}', `${dayOfMonth}`) + newspaper.url,
          `${NEWSPAPAPER_CACHE_PATH}/${newspaper.shortname}_${month}_${dayOfMonth}.pdf`
        )
      )
    );

    await Promise.all(papersToDownload);
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
    im.convert(
      ['-density', '225', '-background', 'White', '-layers', 'flatten', inputFile, outputFile],
      async err => {
        if (err) reject(err);
        resolve(true);
      }
    );
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

export const extendImage = async (file: string, width: number, height: number) => {
  return new Promise((resolve, reject) => {
    im.convert(['-extent', `${width}x${height}`, file, file], async err => {
      if (err) reject(err);
      resolve(true);
    });
  });
};

export const processPdf = async (inputFile: string, convertedFileName: string) => {
  logger(`Converting ${inputFile}`);
  await convertImage(inputFile, convertedFileName);

  const desiredAspectRatio = 16 / 9;
  const threshholdForRatioEnforcement = 0.02; // meural will crop the image which is probably fine, but not beyond 2%

  const imageProperties = await getImageProperties(convertedFileName);

  const imageWidth = imageProperties.width || 0;
  const imageHeight = imageProperties.height || 0;

  const percentageOverOrUnderRatio = 1 - (imageWidth * desiredAspectRatio) / imageHeight;

  if (Math.abs(percentageOverOrUnderRatio) > threshholdForRatioEnforcement) {
    if (percentageOverOrUnderRatio < 0) {
      logger(`Extending ${convertedFileName}`);
      await extendImage(convertedFileName, imageWidth, imageWidth * desiredAspectRatio);
    } else {
      logger(`Cropping ${convertedFileName}`);
      await cropImage(convertedFileName, imageWidth, imageWidth * desiredAspectRatio);
    }
  }
  logger(`Processesd ${convertedFileName}`, {sentiment: 'positive'});
};
