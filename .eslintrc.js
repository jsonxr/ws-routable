module.exports = {
  extends: ['plugin:@typescript-eslint/recommended', 'prettier', 'plugin:prettier/recommended'],
  rules: {
    //'@typescript-eslint/no-non-null-assertion': 'off',
  },
  ignorePatterns: ['jest.setup.js', '**/dist/*.*'],
};
