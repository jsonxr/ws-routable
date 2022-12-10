export const assert = (condition: any, message = 'Assert condition failed') => {
  if (!condition) {
    throw new Error(message);
  }
};
