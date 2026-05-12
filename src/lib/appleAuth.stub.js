module.exports = {
  isAvailableAsync: async () => false,
  signInAsync: async () => { throw new Error('Not available on web'); },
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { SIGN_IN: 0, SIGN_UP: 1, CONTINUE: 2 },
  AppleAuthenticationButtonStyle: { WHITE: 0, WHITE_OUTLINE: 1, BLACK: 2 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
};
