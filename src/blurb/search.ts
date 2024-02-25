export const regexpOrNot = (s: string): { test: (s: string) => boolean } => {
  try {
    const regex = new RegExp(s, 'i');
    return {
      test: (s) => regex.test(s),
    };
  } catch (e) {
    console.warn(e);
    return {
      test: (s) => s.includes(s),
    };
  }
};
