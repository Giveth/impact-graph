export const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const convertExponentialNumber = (n: number): number => {
  const sign = +n < 0 ? '-' : '';
  const toStr = n.toString();
  if (!/e/i.test(toStr)) {
    return n;
  }
  const [lead, decimal, pow] = n
    .toString()
    .replace(/^-/, '')
    .replace(/^([0-9]+)(e.*)/, '$1.$2')
    .split(/e|\./);
  const wrappedNumber =
    +pow < 0
      ? sign +
        '0.' +
        '0'.repeat(Math.max(Math.abs(Number(pow)) - 1 || 0, 0)) +
        lead +
        decimal
      : sign +
        lead +
        (+pow >= decimal.length
          ? decimal + '0'.repeat(Math.max(+pow - decimal.length || 0, 0))
          : decimal.slice(0, +pow) + '.' + decimal.slice(+pow));
  return Number(wrappedNumber);
};

export const convertTimeStampToSeconds = (
  timestampInMilliSeconds: number,
): number => {
  return Math.floor(timestampInMilliSeconds / 1000);
};

export const createBasicAuthentication = ({ userName, password }) => {
  const str = userName + ':' + password;
  return 'Basic ' + Buffer.from(str).toString('base64');
};

export const decodeBasicAuthentication = basicAuthentication => {
  return new Buffer(basicAuthentication.split(' ')[1], 'base64').toString();
};
