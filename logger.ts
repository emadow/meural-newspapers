interface LogItemOptions {
  sentiment?: 'positive' | 'negative' | 'neutral';
  processLevel?: 1 | 2 | 3;
}

export const logger = (msg: string, options?: LogItemOptions) => {
  const {sentiment = 'neutral', processLevel = 1} = options || {};

  const processLevelIndicator = processLevel === 1 ? '' : processLevel === 2 ? ' └─' : '  └─';
  const sentimentIcon = sentiment === 'positive' ? '✅' : sentiment === 'negative' ? '❌' : '';

  console.log(`${processLevelIndicator}${sentimentIcon ? `${sentimentIcon} ` : ''}${msg}`);
};
